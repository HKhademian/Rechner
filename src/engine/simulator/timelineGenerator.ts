import {
  type SimulationMonth,
  type CalendarYear,
  type CalendarMonth,
  type NetSalary,
  type EuroAmount,
  type EventId,
  TaxClass,
  ScenarioId,
  TransactionType,
  TransactionDirection,
  SpecialEventType,
  SpecialEventCategory,
  type SimulationResult,
  type MonthlyLedgerEntry,
  type AccountingTransaction,
  type SpecialEventItem,
  type PreexistingConditions,
  type PregnancyAction,
  type TaxClassSwitchAction,
  type SalaryRaiseAction,
  type ScenarioActionBatches,
  toSimulationMonth,
  toCalendarYear,
  toCalendarMonth,
  toEuroAmount,
  toNetSalary,
  toEventId,
  toStatutoryCitation
} from '#engine/types';
import { createTransaction } from '#engine/ledger/transaction';
import { buildMonthlyLedgerEntry } from '#engine/ledger/ledger';
import { computeMonthlySwapWithholdingVariance, computeAnnualTaxReconciliation } from '#engine/tax/jointAssessment';
import { computeElterngeldBenefits } from '#engine/benefits/elterngeldPlus';
import { computeSiblingBonus } from '#engine/benefits/siblingBonus';

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
 * Executes a simulation scenario from discrete action batches:
 * 0. Preexisting conditions (baseline tax classes, salaries, children, dates)
 * 1. Pregnancy positive decisions (positive test date, delivery date, parental leave)
 * 2. Tax class switches (proactive switches, optimization intent, reversions)
 * 3. Salary raises and career progression events
 */
export function runScenarioBatches(batches: ScenarioActionBatches): SimulationResult {
  const { scenarioKey, preexisting, pregnancies, taxClassSwitches, salaryRaises } = batches;

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

  // Identify Child 1 delivery for relative delivery notation
  const child1Delivery = pregnancies.length > 0
    ? (pregnancies[0].calculatedDeliverySimulationMonth as number)
    : 12;

  for (let m = 1; m <= duration; m++) {
    const sMonth = toSimulationMonth(m);
    const totalElapsedMonths = (startMonth - 1) + (m - 1);
    const calendarMonthNum = toCalendarMonth((totalElapsedMonths % 12) + 1);
    const calendarYearNum = startYear + Math.floor(totalElapsedMonths / 12);
    const calendarLabel = `${String(calendarMonthNum).padStart(2, '0')}.${calendarYearNum}`;
    const year = toCalendarYear(Math.min(10, Math.ceil(m / 12)));
    const monthInYear = toCalendarMonth(((m - 1) % 12) + 1);

    // Relative delivery milestone notation
    let relativeBirthLabel: string;
    if (m < child1Delivery) {
      relativeBirthLabel = `M-${child1Delivery - m}`;
    } else if (m === child1Delivery) {
      relativeBirthLabel = 'M0 (Birth)';
    } else {
      relativeBirthLabel = `M+${m - child1Delivery}`;
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
        // ElterngeldPlus Phase
        else if (m >= egStart && m <= egBonusEnd) {
          inSpecialPhase = true;
          wifeSalary = toEuroAmount(curW5PT);

          // Calculate Elterngeld Entitlement
          if (pIdx === 0) {
            // Child 1
            const egEntitlement = computeElterngeldBenefits(
              toNetSalary(scenarioKey === ScenarioId.C ? curW3FT : curW5FT),
              toNetSalary(curW5PT)
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
            const egEntitlement = computeElterngeldBenefits(blendedNet, toNetSalary(curW5PT));

            // Sibling bonus eligibility vs Child 1
            const prevBirth = pregnancies[0].calculatedDeliverySimulationMonth;
            const sibling = computeSiblingBonus(egEntitlement.elterngeldPlus, prevBirth, sMonth);
            hasSiblingBonus = sibling.isEligible;
            wifeElterngeld = sibling.totalElterngeldPlusWithBonus;
            phaseLabel = sibling.isEligible
              ? `Child ${preg.childIndex} EGPlus + Sibling Bonus (+10%)`
              : `Child ${preg.childIndex} EGPlus`;
          }

          // Partner Months (Father)
          if (m >= egStart && m <= egStart + 3) {
            husbandElterngeld = toEuroAmount(150);
          }
          if (m >= egBonusStart && m <= egBonusEnd) {
            isPartnerschaftsbonus = true;
            husbandElterngeld = toEuroAmount(150);
            phaseLabel = `Partnerschaftsbonus ${preg.childIndex} (Both 24-32h)`;
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
      pregnancyId: 'PREG-CHILD-1',
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
      pregnancyId: 'PREG-CHILD-2',
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
      switchId: 'SWAP-CHILD-1',
      effectiveSimulationMonth: toSimulationMonth(swap1Start),
      effectiveCalendarMonth: toCalendarMonth(((startMonth - 1 + swap1Start - 1) % 12) + 1),
      effectiveCalendarYear: startYear + Math.floor((startMonth - 1 + swap1Start - 1) / 12),
      targetHusbandTaxClass: TaxClass.V,
      targetWifeTaxClass: TaxClass.III,
      statutoryReason: 'Optimize 12-month synthetic Elterngeld assessment baseline (§ 2b BEEG)',
      revertSimulationMonth: toSimulationMonth(b1)
    },
    {
      switchId: 'SWAP-CHILD-2',
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
