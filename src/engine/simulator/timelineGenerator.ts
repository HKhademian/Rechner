import {
  type SimulationMonth,
  type CalendarYear,
  type CalendarMonth,
  type NetSalary,
  type EuroAmount,
  type EventId,
  type ActionId,
  type PregnancyId,
  type SwitchId,
  type RaiseId,
  TaxClass,
  ScenarioId,
  TransactionType,
  TransactionDirection,
  SpecialEventType,
  SpecialEventCategory,
  ActionCategory,
  ActionType,
  TargetPerson,
  type SimulationResult,
  type MonthlyLedgerEntry,
  type AccountingTransaction,
  type SpecialEventItem,
  type ActionRowItem,
  type PreexistingConditions,
  type PregnancyAction,
  type TaxClassSwitchAction,
  type SalaryRaiseAction,
  type FinancialEventAction,
  type ScenarioActionBatches,
  FinancialEventCategory,
  toSimulationMonth,
  toCalendarYear,
  toCalendarMonth,
  toEuroAmount,
  toGrossSalary,
  toNetSalary,
  toEventId,
  toActionId,
  toPregnancyId,
  toSwitchId,
  toRaiseId,
  toFinancialEventId,
  toStatutoryCitation
} from '#engine/types';
import { createTransaction } from '#engine/ledger/transaction';
import { buildMonthlyLedgerEntry } from '#engine/ledger/ledger';
import { computeMonthlySwapWithholdingVariance, computeAnnualTaxReconciliation } from '#engine/tax/jointAssessment';
import { computeElterngeldBenefits, isElterngeldHoursEligible, isPartnerschaftsbonusEligible } from '#engine/benefits/elterngeldPlus';
import { computeSiblingBonus } from '#engine/benefits/siblingBonus';
import { computeGrossToNetBreakdown } from '#engine/tax/wageTax';

export interface TimelineSimulationParams {
  readonly scenarioKey: ScenarioId;
  readonly startCalendarYear?: number;
  readonly startCalendarMonth?: CalendarMonth;
  readonly simulationDurationMonths?: number;
  readonly husbandClass3Net: NetSalary;
  readonly husbandClass5Net: NetSalary;
  readonly wifeClass5FullTimeNet: NetSalary;
  readonly wifeClass3FullTimeNet: NetSalary;
  readonly wifeClass5PartTimeNet: NetSalary;
  readonly wifeClass3PartTimeNet: NetSalary;
  readonly kindergeldPerChild: EuroAmount;
  readonly prePregnancyPlanningMonths: number;
  readonly child1BirthMonth: SimulationMonth;
  readonly birthSpacingMonths: number;
  readonly swapLeadMonths: number;
  readonly enable13thSalary: boolean;
  readonly bonus40Month: CalendarMonth;
  readonly bonus60Month: CalendarMonth;
  readonly taxReturnMonth: CalendarMonth;
}

/**
 * Calculates the statutory simulation start calendar date based on the first pregnancy positive test:
 * 1. Subtract at least 3 months prior to pregnancy positive test date.
 * 2. Snap to the first month (January) of that resulting calendar year.
 *
 * Example 1: Positive in 09.2026 -> 09.2026 - 3M = 06.2026 -> First month of 2026 is 01.2026 (prePregBuffer = 8 months, pregSimMonth = 9).
 * Example 2: Positive in 02.2028 -> 02.2028 - 3M = 11.2027 -> First month of 2027 is 01.2027 (prePregBuffer = 13 months, pregSimMonth = 14).
 */
export function calculateSimulationStartDate(
  pregPositiveYear: number,
  pregPositiveMonth: number
): {
  startCalendarYear: number;
  startCalendarMonth: number;
  prePregnancyPlanningMonths: number;
  pregnancySimulationMonth: number;
} {
  // 1. Subtract 3 months
  const totalMonths = pregPositiveYear * 12 + (pregPositiveMonth - 1) - 3;
  const resultYear = Math.floor(totalMonths / 12);

  // 2. First month of the resulting year (January)
  const startCalendarYear = resultYear;
  const startCalendarMonth = 1;

  // 3. Pre-pregnancy buffer months in the simulation (simulation months before pregnancy positive)
  const pregnancySimulationMonth =
    (pregPositiveYear - startCalendarYear) * 12 + (pregPositiveMonth - startCalendarMonth) + 1;
  const prePregnancyPlanningMonths = pregnancySimulationMonth - 1;

  return {
    startCalendarYear,
    startCalendarMonth,
    prePregnancyPlanningMonths,
    pregnancySimulationMonth
  };
}

/**
 * Executes a simulation scenario from discrete action batches:
 * 0. Preexisting conditions (baseline tax classes, salaries, children, dates)
 * 1. Pregnancy positive decisions (positive test date, delivery date, parental leave)
 * 2. Tax class switches (proactive switches, optimization intent, reversions)
 * 3. Salary raises and career progression events
 */
export function runScenarioBatches(batches: ScenarioActionBatches): SimulationResult {
  const { scenarioKey, preexisting, pregnancies, taxClassSwitches, salaryRaises, financialEvents = [] } = batches;

  const startYear = preexisting.startCalendarYear;
  const startMonth = preexisting.startCalendarMonth as number;
  const duration = preexisting.simulationDurationMonths;
  const kgRate = preexisting.kindergeldPerChild as number;

  // PASS 1: Month-by-month state reduction across action batches
  interface RawMonth {
    readonly month: SimulationMonth;
    readonly year: CalendarYear;
    readonly monthInYear: CalendarMonth;
    readonly calendarYearNum: number;
    readonly calendarMonthNum: CalendarMonth;
    readonly calendarLabel: string;
    readonly relativeBirthLabel: string;
    readonly husbandSalary: EuroAmount;
    readonly wifeSalary: EuroAmount;
    readonly mutterschutz: EuroAmount;
    readonly wifeElterngeld: EuroAmount;
    readonly husbandElterngeld: EuroAmount;
    readonly kindergeld: EuroAmount;
    readonly taxClassLabel: string;
    readonly phaseLabel: string;
    readonly isSwapActive: boolean;
    readonly isMutterschutz: boolean;
    readonly isPartnerschaftsbonus: boolean;
    readonly hasSiblingBonus: boolean;
    readonly monthlyWithholdingDeficit: EuroAmount;
    readonly transactions: AccountingTransaction[];
  }

  const rawMonths: RawMonth[] = [];

  // Identify Child 1 and Child 2 deliveries for relative notation
  const child1Delivery = pregnancies.length > 0
    ? (pregnancies[0].calculatedDeliverySimulationMonth as number)
    : 12;
  const child2Delivery = pregnancies.length > 1
    ? (pregnancies[1].calculatedDeliverySimulationMonth as number)
    : 999;

  for (let m = 1; m <= duration; m++) {
    const sMonth = toSimulationMonth(m);
    const totalElapsedMonths = (startMonth - 1) + (m - 1);
    const calendarMonthNum = toCalendarMonth((totalElapsedMonths % 12) + 1);
    const calendarYearNum = startYear + Math.floor(totalElapsedMonths / 12);
    const calendarLabel = `${String(calendarMonthNum).padStart(2, '0')}.${calendarYearNum}`;
    const year = toCalendarYear(Math.min(10, Math.ceil(m / 12)));
    const monthInYear = toCalendarMonth(((m - 1) % 12) + 1);

    // Mx counter relative to first pregnancy positive test (M0 = Positive Test)
    const preg1PositiveMonth = (pregnancies[0]?.positiveTestSimulationMonth as number) ?? Math.max(1, child1Delivery - 8);
    let relativeBirthLabel: string;
    if (m < preg1PositiveMonth) {
      relativeBirthLabel = `M-${preg1PositiveMonth - m}`;
    } else if (m === preg1PositiveMonth) {
      relativeBirthLabel = 'M0 (Pregnancy Positive)';
    } else {
      const offset = m - preg1PositiveMonth;
      if (m === child1Delivery) {
        relativeBirthLabel = `M+${offset} (Birth 1)`;
      } else if (m === child2Delivery) {
        relativeBirthLabel = `M+${offset} (Birth 2)`;
      } else {
        relativeBirthLabel = `M+${offset}`;
      }
    }

    // --- Batch 3: Evaluate Active Salaries from Baseline + Raises ---
    let curH3Net = preexisting.husbandInitialNet as number;
    let curH5Net = preexisting.husbandInitialClass5Net as number;
    let curW5FT = preexisting.wifeInitialFullTimeNet as number;
    let curW3FT = preexisting.wifeInitialClass3FullTimeNet as number;
    let curW5PT = preexisting.wifeInitialPartTimeClass5Net as number;
    let curW3PT = preexisting.wifeInitialPartTimeClass3Net as number;

    salaryRaises.forEach((sr) => {
      if ((sr.effectiveSimulationMonth as number) <= m) {
        if (sr.percentageIncrease) {
          const factor = 1 + sr.percentageIncrease;
          curH3Net = Math.round(curH3Net * factor);
          curH5Net = Math.round(curH5Net * factor);
          curW5FT = Math.round(curW5FT * factor);
          curW3FT = Math.round(curW3FT * factor);
          curW5PT = Math.round(curW5PT * factor);
          curW3PT = Math.round(curW3PT * factor);
        } else {
          if (sr.newHusbandClass3Net) curH3Net = sr.newHusbandClass3Net as number;
          if (sr.newHusbandClass5Net) curH5Net = sr.newHusbandClass5Net as number;
          if (sr.newWifeClass5FTNet) curW5FT = sr.newWifeClass5FTNet as number;
          if (sr.newWifeClass3FTNet) curW3FT = sr.newWifeClass3FTNet as number;
          if (sr.newWifeClass5PTNet) curW5PT = sr.newWifeClass5PTNet as number;
          if (sr.newWifeClass3PTNet) curW3PT = sr.newWifeClass3PTNet as number;
        }
      }
    });

    // --- Batch 2: Evaluate Active Tax Class Switches ---
    let isSwapActive = false;
    let taxClassLabel = 'H: III | W: V';

    if (scenarioKey === ScenarioId.C) {
      taxClassSwitches.forEach((sw) => {
        const eff = sw.effectiveSimulationMonth as number;
        const rev = sw.revertSimulationMonth ? (sw.revertSimulationMonth as number) : Infinity;
        if (m >= eff && m < rev) {
          isSwapActive = true;
          taxClassLabel = `H: ${sw.targetHusbandTaxClass} | W: ${sw.targetWifeTaxClass}`;
        }
      });
    }

    let husbandSalary = toEuroAmount(isSwapActive ? curH5Net : curH3Net);
    let wifeSalary = toEuroAmount(0);
    let mutterschutz = toEuroAmount(0);
    let wifeElterngeld = toEuroAmount(0);
    let husbandElterngeld = toEuroAmount(0);
    let kindergeld = toEuroAmount(0);
    let phaseLabel = 'Standard Career';
    let isMutterschutz = false;
    let isPartnerschaftsbonus = false;
    let hasSiblingBonus = false;
    const transactions: AccountingTransaction[] = [];

    // --- Batch 1: Evaluate Active Pregnancies & Parental Leaves ---
    if (scenarioKey === ScenarioId.A) {
      husbandSalary = toEuroAmount(curH3Net);
      wifeSalary = toEuroAmount(curW5FT);
      phaseLabel = 'Standard Career (No Children)';
      taxClassLabel = 'H: III | W: V';
    } else {
      // Calculate living children count for Kindergeld
      let livingChildren = preexisting.existingChildrenCount;
      pregnancies.forEach((preg) => {
        const del = preg.calculatedDeliverySimulationMonth as number;
        if (m >= del) {
          livingChildren += 1;
        }
      });
      kindergeld = toEuroAmount(livingChildren * kgRate);

      // Check lifecycle per pregnancy
      let inSpecialPhase = false;

      pregnancies.forEach((preg, pIdx) => {
        const b = preg.calculatedDeliverySimulationMonth as number;
        const preM = b - 1;
        const mutterschutzMonths = [preM, b, b + 1];
        const egStart = b + 2;
        const egEnd = egStart + 11;
        const egBonusStart = egEnd + 1;
        const egBonusEnd = egBonusStart + 3;

        // Mutterschutz Phase
        if (mutterschutzMonths.includes(m)) {
          inSpecialPhase = true;
          isMutterschutz = true;
          wifeSalary = toEuroAmount(0);

          if (scenarioKey === ScenarioId.C) {
            const mRate = (pIdx === 0) ? curW3FT : curW3PT;
            mutterschutz = toEuroAmount(mRate);
            phaseLabel = m === preM
              ? `Pre-Birth Mutterschutz (Child ${preg.childIndex})`
              : `Post-Birth Mutterschutz (Child ${preg.childIndex})`;
          } else {
            const mRate = (pIdx === 0) ? curW5FT : curW5PT;
            mutterschutz = toEuroAmount(mRate);
            phaseLabel = m === preM
              ? `Pre-Birth Mutterschutz (Child ${preg.childIndex})`
              : `Post-Birth Mutterschutz (Child ${preg.childIndex})`;
          }
        }
        // ElterngeldPlus Phase (Standard EG+ months and Partnerschaftsbonus months)
        else if (m >= egStart && m <= egBonusEnd) {
          inSpecialPhase = true;
          wifeSalary = toEuroAmount(curW5PT);

          const motherHours = (preg.motherPostBirthPartTimeHours as unknown as number) ?? 24;
          const fatherHours = (preexisting.husbandWeeklyHours as unknown as number) ?? 32;
          const isMotherEgEligible = isElterngeldHoursEligible(motherHours);
          const isBonusWindow = m >= egBonusStart && m <= egBonusEnd;
          const qualifiesPartnerschaftsbonus = isBonusWindow && isPartnerschaftsbonusEligible(motherHours, fatherHours);

          if (isBonusWindow) {
            if (qualifiesPartnerschaftsbonus) {
              isPartnerschaftsbonus = true;
              husbandElterngeld = toEuroAmount(150);
              phaseLabel = `Partnerschaftsbonus ${preg.childIndex} (Both 24-32h)`;

              // Mother's benefit calculation
              if (pIdx === 0) {
                const egEntitlement = computeElterngeldBenefits(
                  toNetSalary(scenarioKey === ScenarioId.C ? curW3FT : curW5FT),
                  toNetSalary(curW5PT),
                  motherHours
                );
                wifeElterngeld = egEntitlement.elterngeldPlus;
              } else {
                const blendedNet = toNetSalary(
                  Math.round(
                    (10 * (scenarioKey === ScenarioId.C ? curW3PT : curW5PT) +
                      2 * (scenarioKey === ScenarioId.C ? curW3FT : curW5FT)) /
                      12
                  )
                );
                const egEntitlement = computeElterngeldBenefits(blendedNet, toNetSalary(curW5PT), motherHours);
                const prevBirth = pregnancies[0].calculatedDeliverySimulationMonth;
                const sibling = computeSiblingBonus(egEntitlement.elterngeldPlus, prevBirth, sMonth);
                hasSiblingBonus = sibling.isEligible;
                wifeElterngeld = sibling.totalElterngeldPlusWithBonus;
              }
            } else {
              // Ineligible for Partnerschaftsbonus (§ 4b BEEG) - hours outside 24-32h corridor
              isPartnerschaftsbonus = false;
              husbandElterngeld = toEuroAmount(0);
              wifeElterngeld = toEuroAmount(0);
              phaseLabel = motherHours > 32
                ? `Child ${preg.childIndex} Post-Leave (Hours >32h: No EG § 1 BEEG)`
                : (motherHours < 24
                    ? `Child ${preg.childIndex} Post-Leave (Hours <24h: No PB § 4b BEEG)`
                    : `Child ${preg.childIndex} Post-Leave (Father Outside 24-32h)`);
            }
          } else {
            // Standard ElterngeldPlus window (egStart to egEnd)
            if (isMotherEgEligible) {
              if (pIdx === 0) {
                // Child 1
                const egEntitlement = computeElterngeldBenefits(
                  toNetSalary(scenarioKey === ScenarioId.C ? curW3FT : curW5FT),
                  toNetSalary(curW5PT),
                  motherHours
                );
                wifeElterngeld = egEntitlement.elterngeldPlus;
                phaseLabel = `Child ${preg.childIndex} EGPlus (Mother)`;
              } else {
                // Child 2+ with blended pre-birth assessment baseline (10M PT + 2M FT)
                const blendedNet = toNetSalary(
                  Math.round(
                    (10 * (scenarioKey === ScenarioId.C ? curW3PT : curW5PT) +
                      2 * (scenarioKey === ScenarioId.C ? curW3FT : curW5FT)) /
                      12
                  )
                );
                const egEntitlement = computeElterngeldBenefits(blendedNet, toNetSalary(curW5PT), motherHours);

                // Sibling bonus eligibility vs Child 1
                const prevBirth = pregnancies[0].calculatedDeliverySimulationMonth;
                const sibling = computeSiblingBonus(egEntitlement.elterngeldPlus, prevBirth, sMonth);
                hasSiblingBonus = sibling.isEligible;
                wifeElterngeld = sibling.totalElterngeldPlusWithBonus;
                phaseLabel = sibling.isEligible
                  ? `Child ${preg.childIndex} EGPlus + Sibling Bonus (+10%)`
                  : `Child ${preg.childIndex} EGPlus`;
              }
            } else {
              // Working > 32h/week: Ineligible for Elterngeld (§ 1 Abs. 1 Nr. 4 BEEG)
              wifeElterngeld = toEuroAmount(0);
              phaseLabel = `Child ${preg.childIndex} Post-Leave (Hours >32h: No EG § 1 BEEG)`;
            }

            // Partner Months (Father)
            if (m >= egStart && m <= egStart + 3) {
              husbandElterngeld = toEuroAmount(150);
            }
          }
        }
      });

      // If not in active maternity or parental allowance
      if (!inSpecialPhase) {
        if (m > child1Delivery) {
          wifeSalary = toEuroAmount(isSwapActive ? curW3PT : curW5PT);
          phaseLabel = isSwapActive
            ? 'Swap Active (Part-Time)'
            : 'Family Part-Time (Post-Leave)';
        } else {
          wifeSalary = toEuroAmount(isSwapActive ? curW3FT : curW5FT);
          phaseLabel = isSwapActive
            ? 'Swap Active (Pre-Mutterschutz)'
            : (m < (pregnancies[0]?.positiveTestSimulationMonth as number ?? 4)
                ? 'Pre-Pregnancy Planning'
                : 'Pre-Birth Full-Time');
        }
      }
    }

    // Exact Wage Withholding Deficit during active swap
    let monthlyWithholdingDeficit = toEuroAmount(0);
    if (scenarioKey === ScenarioId.C && isSwapActive) {
      const isPT = m > child1Delivery || phaseLabel.includes('Part-Time');
      monthlyWithholdingDeficit = computeMonthlySwapWithholdingVariance(
        toNetSalary(curH3Net),
        toNetSalary(curH5Net),
        toNetSalary(isPT ? curW3PT : curW3FT),
        toNetSalary(isPT ? curW5PT : curW5FT)
      );
    }

    rawMonths.push({
      month: sMonth,
      year,
      monthInYear,
      calendarYearNum,
      calendarMonthNum,
      calendarLabel,
      relativeBirthLabel,
      husbandSalary,
      wifeSalary,
      mutterschutz,
      wifeElterngeld,
      husbandElterngeld,
      kindergeld,
      taxClassLabel,
      phaseLabel,
      isSwapActive,
      isMutterschutz,
      isPartnerschaftsbonus,
      hasSiblingBonus,
      monthlyWithholdingDeficit,
      transactions
    });
  }

  // PASS 2: Aggregate Annual Tax Return Reconciliations by Calendar Year (§ 26b EStG)
  const deficitsByCalYear: Record<number, EuroAmount[]> = {};
  rawMonths.forEach(rm => {
    const cy = rm.calendarYearNum;
    if (!deficitsByCalYear[cy]) {
      deficitsByCalYear[cy] = [];
    }
    deficitsByCalYear[cy].push(rm.monthlyWithholdingDeficit);
  });

  const taxRefundByMonth: Record<number, EuroAmount> = {};
  const tMonth = (preexisting.taxReturnMonth as number) ?? 3;
  const baseStandardRefund = toEuroAmount(850);

  rawMonths.forEach(rm => {
    if ((rm.calendarMonthNum as number) === tMonth) {
      const reconciledCalYear = rm.calendarYearNum - 1;
      const deficits = deficitsByCalYear[reconciledCalYear] || [];
      const recon = computeAnnualTaxReconciliation(
        toCalendarYear(Math.min(10, Math.max(1, rm.year as number))),
        rm.month,
        deficits,
        baseStandardRefund
      );
      taxRefundByMonth[rm.month as number] = recon.totalRefundAmount;
    }
  });

  // PASS 3: Assemble Final Ledger and Transactions
  const months: MonthlyLedgerEntry[] = [];
  let runSalaries = 0;
  let runBenefits = 0;
  let runTaxRefunds = 0;
  let runTotal = 0;

  for (let i = 0; i < rawMonths.length; i++) {
    const rm = rawMonths[i];
    const m = rm.month as number;
    const calMonth = rm.calendarMonthNum as number;
    const year = rm.year;

    // 13th Month Salary Events triggered on configured calendar months
    let bonus40Amount = toEuroAmount(0);
    let bonus60Amount = toEuroAmount(0);
    const currentHusbandNet = rm.husbandSalary as number;

    if (preexisting.enable13thSalary) {
      if (calMonth === (preexisting.bonus40Month as number)) {
        bonus40Amount = toEuroAmount(Math.round(0.40 * currentHusbandNet));
      }
      if (calMonth === (preexisting.bonus60Month as number)) {
        bonus60Amount = toEuroAmount(Math.round(0.60 * currentHusbandNet));
      }
    }

    const taxRefund = taxRefundByMonth[m] || toEuroAmount(0);

    // Build Accounting Transactions for Audit Trail
    const txs: AccountingTransaction[] = [];
    if ((rm.husbandSalary as number) > 0) {
      txs.push(createTransaction({
        transactionId: `TX-M${m}-HUSBAND-SALARY`,
        month: rm.month,
        year,
        type: TransactionType.SalaryBase,
        direction: TransactionDirection.Inflow,
        amount: rm.husbandSalary,
        statutoryCitation: '§ 19 EStG (Einkünfte aus nichtselbständiger Arbeit)',
        taxClassLabel: rm.taxClassLabel,
        description: `Husband Monthly Working Salary (${rm.taxClassLabel}) - ${rm.calendarLabel}`,
        auditTrail: `Net Salary earned in ${rm.taxClassLabel}`
      }));
    }

    if ((rm.wifeSalary as number) > 0) {
      txs.push(createTransaction({
        transactionId: `TX-M${m}-WIFE-SALARY`,
        month: rm.month,
        year,
        type: TransactionType.SalaryBase,
        direction: TransactionDirection.Inflow,
        amount: rm.wifeSalary,
        statutoryCitation: '§ 19 EStG (Einkünfte aus nichtselbständiger Arbeit)',
        taxClassLabel: rm.taxClassLabel,
        description: `Wife Monthly Working Salary (${rm.taxClassLabel}) - ${rm.calendarLabel}`,
        auditTrail: `Net Salary earned in ${rm.taxClassLabel}`
      }));
    }

    if ((bonus40Amount as number) > 0) {
      txs.push(createTransaction({
        transactionId: `TX-M${m}-BONUS-40`,
        month: rm.month,
        year,
        type: TransactionType.SalaryBonus13thVacation,
        direction: TransactionDirection.Inflow,
        amount: bonus40Amount,
        statutoryCitation: '§ 19 EStG & BEEG § 2c Abs. 1 (Exempt Sonderzahlung)',
        taxClassLabel: rm.taxClassLabel,
        description: `13th Month Salary: 40% Vacation Bonus (${rm.calendarLabel})`,
        auditTrail: `40% of Husband Base Net (${currentHusbandNet} €)`
      }));
    }

    if ((bonus60Amount as number) > 0) {
      txs.push(createTransaction({
        transactionId: `TX-M${m}-BONUS-60`,
        month: rm.month,
        year,
        type: TransactionType.SalaryBonus13thChristmas,
        direction: TransactionDirection.Inflow,
        amount: bonus60Amount,
        statutoryCitation: '§ 19 EStG & BEEG § 2c Abs. 1 (Exempt Sonderzahlung)',
        taxClassLabel: rm.taxClassLabel,
        description: `13th Month Salary: 60% Christmas Bonus (${rm.calendarLabel})`,
        auditTrail: `60% of Husband Base Net (${currentHusbandNet} €)`
      }));
    }

    if ((rm.mutterschutz as number) > 0) {
      txs.push(createTransaction({
        transactionId: `TX-M${m}-MUTTERSCHUTZ`,
        month: rm.month,
        year,
        type: TransactionType.BenefitMutterschutz,
        direction: TransactionDirection.Inflow,
        amount: rm.mutterschutz,
        statutoryCitation: 'MuSchG § 19 & § 20 (100% Net Wage Replacement)',
        taxClassLabel: rm.taxClassLabel,
        description: `Maternity Protection Benefit (*Mutterschutz*) - ${rm.calendarLabel}`,
        auditTrail: 'GKV Mutterschaftsgeld + Employer Supplement'
      }));
    }

    if ((rm.wifeElterngeld as number) > 0) {
      txs.push(createTransaction({
        transactionId: `TX-M${m}-WIFE-ELTERNGELD`,
        month: rm.month,
        year,
        type: TransactionType.BenefitElterngeldPlusMother,
        direction: TransactionDirection.Inflow,
        amount: rm.wifeElterngeld,
        statutoryCitation: 'BEEG § 4a (ElterngeldPlus)',
        taxClassLabel: rm.taxClassLabel,
        description: `ElterngeldPlus (Mother) - ${rm.calendarLabel}`,
        auditTrail: `Statutory Parental Allowance with synthetic net evaluation`
      }));
    }

    if ((rm.husbandElterngeld as number) > 0) {
      txs.push(createTransaction({
        transactionId: `TX-M${m}-HUSBAND-ELTERNGELD`,
        month: rm.month,
        year,
        type: rm.isPartnerschaftsbonus
          ? TransactionType.BenefitPartnerschaftsbonus
          : TransactionType.BenefitElterngeldPlusFather,
        direction: TransactionDirection.Inflow,
        amount: rm.husbandElterngeld,
        statutoryCitation: 'BEEG § 4b (Partnermonate / Partnerschaftsbonus)',
        taxClassLabel: rm.taxClassLabel,
        description: `Partner Months / Partnerschaftsbonus (Father) - ${rm.calendarLabel}`,
        auditTrail: 'Monthly partner allowance while working concurrent part-time'
      }));
    }

    if ((rm.kindergeld as number) > 0) {
      txs.push(createTransaction({
        transactionId: `TX-M${m}-KINDERGELD`,
        month: rm.month,
        year,
        type: TransactionType.BenefitKindergeld,
        direction: TransactionDirection.Inflow,
        amount: rm.kindergeld,
        statutoryCitation: 'EStG § 66 (Kindergeld)',
        taxClassLabel: rm.taxClassLabel,
        description: `Statutory Child Benefit (*Kindergeld*) - ${rm.calendarLabel}`,
        auditTrail: `Monthly allowance per living child`
      }));
    }

    if ((taxRefund as number) > 0) {
      txs.push(createTransaction({
        transactionId: `TX-M${m}-TAX-REFUND`,
        month: rm.month,
        year,
        type: TransactionType.TaxReconciliationRefund,
        direction: TransactionDirection.Inflow,
        amount: taxRefund,
        statutoryCitation: 'EStG § 26b (*Ehegatten-Splitting*) & § 46 Abs. 2 Nr. 3a',
        taxClassLabel: 'Joint Assessment (*Splitting*)',
        description: `Annual Tax Assessment Refund (${rm.calendarLabel})`,
        auditTrail: 'Full refund of Class V interim withholding deficit + statutory standard deductions return'
      }));
    }

    // Special Life Event Tagging
    let eventTag: string | null = null;
    let eventType: string | null = null;

    if (m === 1) {
      eventTag = `Simulation Start (${rm.calendarLabel})`;
      eventType = 'planning';
    }

    pregnancies.forEach((preg) => {
      const pTest = preg.positiveTestSimulationMonth as number;
      const del = preg.calculatedDeliverySimulationMonth as number;
      if (m === pTest) {
        eventTag = `Pregnancy ${preg.childIndex} Positive (${rm.calendarLabel})`;
        eventType = 'preg';
      } else if (m === del) {
        eventTag = `Child ${preg.childIndex} Birth (${rm.calendarLabel})`;
        eventType = 'birth';
      }
    });

    taxClassSwitches.forEach((sw, sIdx) => {
      const eff = sw.effectiveSimulationMonth as number;
      if (m === eff && scenarioKey === ScenarioId.C) {
        eventTag = `Tax Swap ${sIdx + 1} (${rm.calendarLabel})`;
        eventType = 'swap';
      }
    });

    // Build Special Events for UI display (table sub-rows)
    const specialEvents: SpecialEventItem[] = [];
    if ((bonus40Amount as number) > 0) {
      specialEvents.push({
        eventId: toEventId(`EVENT-M${m}-BONUS40`),
        month: rm.month,
        year,
        calendarYearNum: rm.calendarYearNum,
        calendarMonthNum: rm.calendarMonthNum,
        calendarLabel: rm.calendarLabel,
        relativeBirthLabel: rm.relativeBirthLabel,
        type: SpecialEventType.Bonus40,
        title: `13th Month Salary: 40% Vacation Bonus (${rm.calendarLabel})`,
        category: SpecialEventCategory.ThirteenthSalary,
        statutory: toStatutoryCitation('§ 9a / § 19 EStG (BEEG § 2c exempt)'),
        taxClassLabel: rm.taxClassLabel,
        amount: bonus40Amount,
        description: '40% mid-year bonus payment (exempt from Elterngeld assessment under BEEG § 2c Abs. 1)'
      });
    }

    if ((bonus60Amount as number) > 0) {
      specialEvents.push({
        eventId: toEventId(`EVENT-M${m}-BONUS60`),
        month: rm.month,
        year,
        calendarYearNum: rm.calendarYearNum,
        calendarMonthNum: rm.calendarMonthNum,
        calendarLabel: rm.calendarLabel,
        relativeBirthLabel: rm.relativeBirthLabel,
        type: SpecialEventType.Bonus60,
        title: `13th Month Salary: 60% Christmas Bonus (${rm.calendarLabel})`,
        category: SpecialEventCategory.ThirteenthSalary,
        statutory: toStatutoryCitation('§ 9a / § 19 EStG (BEEG § 2c exempt)'),
        taxClassLabel: rm.taxClassLabel,
        amount: bonus60Amount,
        description: '60% year-end special payment (exempt from Elterngeld assessment under BEEG § 2c Abs. 1)'
      });
    }

    if ((taxRefund as number) > 0) {
      const isDeficitRefund = (taxRefund as number) > 850;
      const reconciledCalYear = rm.calendarYearNum - 1;
      specialEvents.push({
        eventId: toEventId(`EVENT-M${m}-TAX-REFUND`),
        month: rm.month,
        year,
        calendarYearNum: rm.calendarYearNum,
        calendarMonthNum: rm.calendarMonthNum,
        calendarLabel: rm.calendarLabel,
        relativeBirthLabel: rm.relativeBirthLabel,
        type: SpecialEventType.TaxReturn,
        title: `Annual Tax Return (Tax Year ${reconciledCalYear} Return in ${rm.calendarLabel})`,
        category: SpecialEventCategory.TaxOffice,
        statutory: toStatutoryCitation('§ 26b EStG (*Ehegatten-Splitting*)'),
        taxClassLabel: 'Joint Assessment (*Splitting*)',
        amount: taxRefund,
        description: isDeficitRefund
          ? `Full refund of Tax Class V wage withholding deficit (+${((taxRefund as number) - 850).toLocaleString('de-DE')} €) plus statutory deductions return (+850 €) for Tax Year ${reconciledCalYear}`
          : `Standard annual income tax reconciliation and statutory deductions return (+850 €) for Tax Year ${reconciledCalYear}`
      });
    }

    // Preexisting: Annual Recurring Performance Bonus (Gross taxed under § 39b EStG)
    const annualBonusMonth = (preexisting.annualBonusMonth as number) || 12;
    if (preexisting.annualBonusGross && (preexisting.annualBonusGross as number) > 0 && calMonth === annualBonusMonth) {
      const grossBonus = preexisting.annualBonusGross as number;
      const hGrossMonthly = preexisting.husbandGross ? (preexisting.husbandGross as number) : 6000;
      const hTaxClass = rm.isSwapActive ? TaxClass.V : TaxClass.III;
      const breakdown = computeGrossToNetBreakdown(
        toGrossSalary(hGrossMonthly),
        hTaxClass,
        preexisting.existingChildrenCount,
        toEuroAmount(grossBonus)
      );
      const netBonus = breakdown.bonusTaxDeduction
        ? Math.max(0, Math.round(grossBonus - (breakdown.bonusTaxDeduction as number) - (grossBonus * ((breakdown.totalSocialSecurity as number) / (breakdown.monthlyGross as number)))))
        : Math.round(grossBonus * 0.58);
      const netBonusEuro = toEuroAmount(netBonus);

      specialEvents.push({
        eventId: toEventId(`EVENT-M${m}-ANNUAL-BONUS`),
        month: rm.month,
        year,
        calendarYearNum: rm.calendarYearNum,
        calendarMonthNum: rm.calendarMonthNum,
        calendarLabel: rm.calendarLabel,
        relativeBirthLabel: rm.relativeBirthLabel,
        type: SpecialEventType.CustomIncome,
        title: `Annual Performance Bonus (${grossBonus.toLocaleString('de-DE')} € Gross → +${netBonusEuro.toLocaleString('de-DE')} € Net)`,
        category: SpecialEventCategory.CareerBonus,
        statutory: toStatutoryCitation('§ 39b Abs. 3 EStG (Sonstige Bezüge)'),
        taxClassLabel: rm.taxClassLabel,
        amount: netBonusEuro,
        description: `Annual recurring performance bonus (${grossBonus.toLocaleString('de-DE')} € gross, taxed under § 39b EStG differential method)`
      });

      txs.push(createTransaction({
        transactionId: `TX-M${m}-ANNUAL-BONUS`,
        month: rm.month,
        year,
        type: TransactionType.SpecialIncome,
        direction: TransactionDirection.Inflow,
        amount: netBonusEuro,
        statutoryCitation: '§ 39b Abs. 3 EStG',
        taxClassLabel: rm.taxClassLabel,
        description: `Annual Performance Bonus (${rm.calendarLabel})`,
        auditTrail: `${grossBonus} € gross taxed via § 39b differential calculation`
      }));
    }

    // Preexisting: Monthly Investment Returns & Capital Income (§ 20 EStG)
    if (preexisting.investmentReturnMonthly && (preexisting.investmentReturnMonthly as number) > 0) {
      const invNet = preexisting.investmentReturnMonthly;
      specialEvents.push({
        eventId: toEventId(`EVENT-M${m}-INVESTMENT-RETURN`),
        month: rm.month,
        year,
        calendarYearNum: rm.calendarYearNum,
        calendarMonthNum: rm.calendarMonthNum,
        calendarLabel: rm.calendarLabel,
        relativeBirthLabel: rm.relativeBirthLabel,
        type: SpecialEventType.CustomIncome,
        title: `Investment & Capital Return (+${(invNet as number).toLocaleString('de-DE')} €)`,
        category: SpecialEventCategory.InvestmentReturn,
        statutory: toStatutoryCitation('§ 20 EStG (Kapitalerträge)'),
        taxClassLabel: 'Capital Yield',
        amount: invNet,
        description: `Monthly capital return, dividend distribution, or net investment cash flow`
      });

      txs.push(createTransaction({
        transactionId: `TX-M${m}-INVESTMENT-RETURN`,
        month: rm.month,
        year,
        type: TransactionType.SpecialIncome,
        direction: TransactionDirection.Inflow,
        amount: invNet,
        statutoryCitation: '§ 20 EStG',
        taxClassLabel: 'Capital Yield',
        description: `Investment Return (${rm.calendarLabel})`,
        auditTrail: `${invNet} € monthly capital returns`
      }));
    }

    // Batch 4: Custom Financial Events (One-Off Costs, Expenses, Grants & Extra Income)
    financialEvents.forEach((fe) => {
      const effM = fe.effectiveSimulationMonth as number;
      if (effM === m) {
        if (!fe.appliesToScenarios || fe.appliesToScenarios.includes(scenarioKey)) {
          const amt = fe.amount as number;
          const isCost = amt < 0;

          specialEvents.push({
            eventId: toEventId(fe.eventId),
            month: rm.month,
            year,
            calendarYearNum: rm.calendarYearNum,
            calendarMonthNum: rm.calendarMonthNum,
            calendarLabel: rm.calendarLabel,
            relativeBirthLabel: rm.relativeBirthLabel,
            type: isCost ? SpecialEventType.CustomCost : SpecialEventType.CustomIncome,
            title: fe.title,
            category: fe.category as unknown as SpecialEventCategory,
            statutory: toStatutoryCitation(isCost ? 'Out-of-Pocket Expense' : 'Special Financial Inflow'),
            taxClassLabel: rm.taxClassLabel,
            amount: fe.amount,
            description: fe.description || (isCost ? 'One-off family expense / out-of-pocket cost' : 'One-off family income / benefit / bonus')
          });

          txs.push(createTransaction({
            transactionId: `TX-M${m}-${fe.eventId}`,
            month: rm.month,
            year,
            type: isCost ? TransactionType.ExpenseOutflow : TransactionType.SpecialIncome,
            direction: isCost ? TransactionDirection.Outflow : TransactionDirection.Inflow,
            amount: toEuroAmount(Math.abs(amt)),
            statutoryCitation: isCost ? 'One-off Household Cost' : 'Special Inflow',
            taxClassLabel: rm.taxClassLabel,
            description: `${fe.title} (${rm.calendarLabel})`,
            auditTrail: fe.description || `Financial Event ${fe.eventId}`
          }));
        }
      }
    });

    // Build Starting Actions for Month m (Action Milestone Rows placed before Month m)
    const startingActions: ActionRowItem[] = [];

    // Batch 1: Pregnancies starting at Month m (Positive test or Delivery)
    pregnancies.forEach((preg) => {
      const pTest = preg.positiveTestSimulationMonth as number;
      const del = preg.calculatedDeliverySimulationMonth as number;
      if (m === pTest) {
        startingActions.push({
          actionId: toActionId(`${preg.pregnancyId}-POSITIVE`),
          month: rm.month,
          calendarLabel: rm.calendarLabel,
          relativeBirthLabel: rm.relativeBirthLabel,
          title: `ACTION: Positive Pregnancy Test (Child #${preg.childIndex})`,
          description: `Positive pregnancy test confirmed for Child #${preg.childIndex}. Pre-pregnancy baseline lock initiated (§ 2b BEEG).`,
          category: ActionCategory.Pregnancy,
          type: ActionType.PregnancyPositive,
          taxClassLabel: rm.taxClassLabel
        });
      }
      if (m === del) {
        startingActions.push({
          actionId: toActionId(`${preg.pregnancyId}-DELIVERY`),
          month: rm.month,
          calendarLabel: rm.calendarLabel,
          relativeBirthLabel: rm.relativeBirthLabel,
          title: `ACTION: Child #${preg.childIndex} Delivery & Birth`,
          description: `Child #${preg.childIndex} born. Statutory Mutterschutz & ElterngeldPlus benefit eligibility begins.`,
          category: ActionCategory.Pregnancy,
          type: ActionType.ChildDelivery,
          taxClassLabel: rm.taxClassLabel
        });
      }
    });

    // Batch 2: Tax Class Switches starting at Month m (Effective or Revert)
    taxClassSwitches.forEach((sw, sIdx) => {
      const eff = sw.effectiveSimulationMonth as number;
      const rev = sw.revertSimulationMonth as number;
      if (m === eff && scenarioKey === ScenarioId.C) {
        startingActions.push({
          actionId: toActionId(`${sw.switchId}-EFFECTIVE`),
          month: rm.month,
          calendarLabel: rm.calendarLabel,
          relativeBirthLabel: rm.relativeBirthLabel,
          title: `ACTION: Tax Class Switch Active (H: ${sw.targetHusbandTaxClass} | W: ${sw.targetWifeTaxClass})`,
          description: sw.statutoryReason || `Proactive tax class switch to optimize Elterngeld assessment baseline (§ 2b BEEG).`,
          category: ActionCategory.TaxSwitch,
          type: ActionType.TaxClassSwitchEffective,
          taxClassLabel: `H: ${sw.targetHusbandTaxClass} | W: ${sw.targetWifeTaxClass}`
        });
      }
      if (m === rev && scenarioKey === ScenarioId.C) {
        startingActions.push({
          actionId: toActionId(`${sw.switchId}-REVERT`),
          month: rm.month,
          calendarLabel: rm.calendarLabel,
          relativeBirthLabel: rm.relativeBirthLabel,
          title: `ACTION: Tax Class Reversion (H: ${preexisting.husbandInitialTaxClass} | W: ${preexisting.wifeInitialTaxClass})`,
          description: `Reverting tax classes post-delivery back to baseline (${preexisting.husbandInitialTaxClass}/${preexisting.wifeInitialTaxClass}) to maximize family take-home pay.`,
          category: ActionCategory.TaxSwitch,
          type: ActionType.TaxClassSwitchRevert,
          taxClassLabel: `H: ${preexisting.husbandInitialTaxClass} | W: ${preexisting.wifeInitialTaxClass}`
        });
      }
    });

    // Batch 3: Salary Raises starting at Month m
    salaryRaises.forEach((sr) => {
      const eff = sr.effectiveSimulationMonth as number;
      if (m === eff) {
        startingActions.push({
          actionId: toActionId(`${sr.raiseId}-EFFECTIVE`),
          month: rm.month,
          calendarLabel: rm.calendarLabel,
          relativeBirthLabel: rm.relativeBirthLabel,
          title: `ACTION: Salary Raise Effective (${sr.targetPerson.toUpperCase()} +${((sr.percentageIncrease || 0) * 100).toFixed(0)}%)`,
          description: sr.reason || `Annual wage progression / tariff merit step adjustment.`,
          category: ActionCategory.SalaryRaise,
          type: ActionType.SalaryRaiseEffective,
          taxClassLabel: rm.taxClassLabel
        });
      }
    });

    const {
      entry,
      nextCumulatedSalaries,
      nextCumulatedBenefits,
      nextCumulatedTaxRefunds,
      nextCumulatedTotal
    } = buildMonthlyLedgerEntry(
      {
        month: rm.month,
        year,
        monthInYear: rm.monthInYear,
        calendarYearNum: rm.calendarYearNum,
        calendarMonthNum: rm.calendarMonthNum,
        calendarLabel: rm.calendarLabel,
        relativeBirthLabel: rm.relativeBirthLabel,
        husbandSalary: rm.husbandSalary,
        wifeSalary: rm.wifeSalary,
        mutterschutz: rm.mutterschutz,
        wifeElterngeld: rm.wifeElterngeld,
        husbandElterngeld: rm.husbandElterngeld,
        kindergeld: rm.kindergeld,
        taxRefund,
        bonus40Amount,
        bonus60Amount,
        specialEvents,
        startingActions,
        taxClassLabel: rm.taxClassLabel,
        phaseLabel: rm.phaseLabel,
        eventTag,
        eventType,
        isSwapActive: rm.isSwapActive,
        isMutterschutz: rm.isMutterschutz,
        isPartnerschaftsbonus: rm.isPartnerschaftsbonus,
        hasSiblingBonus: rm.hasSiblingBonus,
        transactions: txs
      },
      runSalaries,
      runBenefits,
      runTaxRefunds,
      runTotal
    );

    runSalaries = nextCumulatedSalaries;
    runBenefits = nextCumulatedBenefits;
    runTaxRefunds = nextCumulatedTaxRefunds;
    runTotal = nextCumulatedTotal;

    months.push(entry);
  }

  // Summary Metrics
  const totalSalaries = months.reduce((sum, m) => sum + (m.earnedSalaries as number), 0);
  const totalBenefits = months.reduce((sum, m) => sum + (m.stateBenefits as number), 0);
  const totalTaxRefunds = months.reduce((sum, m) => sum + (m.taxRefund as number), 0);
  const grandTotal = months.reduce((sum, m) => sum + (m.monthlyTotal as number), 0);

  const totalMutterschutz = months.reduce((sum, m) => sum + (m.mutterschutz as number), 0);
  const totalWifeElterngeld = months.reduce((sum, m) => sum + (m.wifeElterngeld as number), 0);
  const totalHusbandElterngeld = months.reduce((sum, m) => sum + (m.husbandElterngeld as number), 0);
  const totalKindergeld = months.reduce((sum, m) => sum + (m.kindergeld as number), 0);
  const total13thSalaries = months.reduce((sum, m) => sum + (m.specialBonusTotal as number), 0);

  return {
    scenarioKey,
    months,
    summary: {
      totalSalaries: toEuroAmount(totalSalaries),
      totalBenefits: toEuroAmount(totalBenefits),
      totalTaxRefunds: toEuroAmount(totalTaxRefunds),
      grandTotal: toEuroAmount(grandTotal),
      totalMutterschutz: toEuroAmount(totalMutterschutz),
      totalWifeElterngeld: toEuroAmount(totalWifeElterngeld),
      totalHusbandElterngeld: toEuroAmount(totalHusbandElterngeld),
      totalKindergeld: toEuroAmount(totalKindergeld),
      total13thSalaries: toEuroAmount(total13thSalaries)
    }
  };
}

/**
 * Pure Deterministic Dynamic Timeline Simulator adapter for TimelineSimulationParams
 */
export function generateTimelineSimulation(
  params: TimelineSimulationParams
): SimulationResult {
  const startYear = params.startCalendarYear ?? 2026;
  const startMonth = (params.startCalendarMonth as number) ?? 1;
  const duration = params.simulationDurationMonths ?? 60;

  const b1 = params.child1BirthMonth as number;
  const spacing = params.birthSpacingMonths;
  const b2 = b1 + spacing;
  const lead = params.swapLeadMonths;

  // Batch 0: Preexisting Conditions
  const preexisting: PreexistingConditions = {
    startCalendarYear: startYear,
    startCalendarMonth: toCalendarMonth(startMonth),
    simulationDurationMonths: duration,
    husbandInitialTaxClass: TaxClass.III,
    husbandInitialNet: params.husbandClass3Net,
    husbandInitialClass5Net: params.husbandClass5Net,
    husbandWeeklyHours: toEuroAmount(32) as unknown as import('#engine/types').WorkingHours,
    wifeInitialTaxClass: TaxClass.V,
    wifeInitialFullTimeNet: params.wifeClass5FullTimeNet,
    wifeInitialClass3FullTimeNet: params.wifeClass3FullTimeNet,
    wifeInitialPartTimeClass5Net: params.wifeClass5PartTimeNet,
    wifeInitialPartTimeClass3Net: params.wifeClass3PartTimeNet,
    wifeWeeklyHours: toEuroAmount(40) as unknown as import('#engine/types').WorkingHours,
    existingChildrenCount: 0,
    kindergeldPerChild: params.kindergeldPerChild,
    enable13thSalary: params.enable13thSalary,
    bonus40Month: params.bonus40Month,
    bonus60Month: params.bonus60Month,
    taxReturnMonth: params.taxReturnMonth
  };

  // Batch 1: Pregnancy Actions
  const pregnancies: PregnancyAction[] = [
    {
      pregnancyId: toPregnancyId('PREG-CHILD-1'),
      childIndex: 1,
      positiveTestCalendarMonth: toCalendarMonth(((startMonth - 1 + params.prePregnancyPlanningMonths) % 12) + 1),
      positiveTestCalendarYear: startYear + Math.floor((startMonth - 1 + params.prePregnancyPlanningMonths) / 12),
      positiveTestSimulationMonth: toSimulationMonth(params.prePregnancyPlanningMonths + 1),
      calculatedDeliverySimulationMonth: toSimulationMonth(b1),
      motherPostBirthPartTimeHours: toEuroAmount(24) as unknown as import('#engine/types').WorkingHours,
      motherPostBirthPartTimeClass5Net: params.wifeClass5PartTimeNet,
      motherPostBirthPartTimeClass3Net: params.wifeClass3PartTimeNet,
      fatherPartnerMonthsCount: 4
    },
    {
      pregnancyId: toPregnancyId('PREG-CHILD-2'),
      childIndex: 2,
      positiveTestCalendarMonth: toCalendarMonth(((startMonth - 1 + (b2 - 9)) % 12) + 1),
      positiveTestCalendarYear: startYear + Math.floor((startMonth - 1 + (b2 - 9)) / 12),
      positiveTestSimulationMonth: toSimulationMonth(b2 - 8),
      calculatedDeliverySimulationMonth: toSimulationMonth(b2),
      motherPostBirthPartTimeHours: toEuroAmount(24) as unknown as import('#engine/types').WorkingHours,
      motherPostBirthPartTimeClass5Net: params.wifeClass5PartTimeNet,
      motherPostBirthPartTimeClass3Net: params.wifeClass3PartTimeNet,
      fatherPartnerMonthsCount: 4
    }
  ];

  // Batch 2: Tax Class Switches
  const preM1 = b1 - 1;
  const swap1Start = Math.max(1, preM1 - lead);
  const preM2 = b2 - 1;
  const swap2Start = Math.max(b1 + 2, preM2 - lead);

  const taxClassSwitches: TaxClassSwitchAction[] = [
    {
      switchId: toSwitchId('SWAP-CHILD-1'),
      effectiveSimulationMonth: toSimulationMonth(swap1Start),
      effectiveCalendarMonth: toCalendarMonth(((startMonth - 1 + swap1Start - 1) % 12) + 1),
      effectiveCalendarYear: startYear + Math.floor((startMonth - 1 + swap1Start - 1) / 12),
      targetHusbandTaxClass: TaxClass.V,
      targetWifeTaxClass: TaxClass.III,
      statutoryReason: 'Optimize 12-month synthetic Elterngeld assessment baseline (§ 2b BEEG)',
      revertSimulationMonth: toSimulationMonth(b1)
    },
    {
      switchId: toSwitchId('SWAP-CHILD-2'),
      effectiveSimulationMonth: toSimulationMonth(swap2Start),
      effectiveCalendarMonth: toCalendarMonth(((startMonth - 1 + swap2Start - 1) % 12) + 1),
      effectiveCalendarYear: startYear + Math.floor((startMonth - 1 + swap2Start - 1) / 12),
      targetHusbandTaxClass: TaxClass.V,
      targetWifeTaxClass: TaxClass.III,
      statutoryReason: 'Optimize Child 2 Part-Time Elterngeld baseline (§ 2b BEEG)',
      revertSimulationMonth: toSimulationMonth(b2)
    }
  ];

  // Batch 3: Salary Raises (Empty by default in legacy params)
  const salaryRaises: SalaryRaiseAction[] = [];

  return runScenarioBatches({
    scenarioKey: params.scenarioKey,
    preexisting,
    pregnancies,
    taxClassSwitches,
    salaryRaises
  });
}
