import {
  type SimulationMonth,
  type CalendarYear,
  type CalendarMonth,
  type NetSalary,
  type EuroAmount,
  type EventId,
  ScenarioId,
  TransactionType,
  TransactionDirection,
  SpecialEventType,
  SpecialEventCategory,
  type SimulationResult,
  type MonthlyLedgerEntry,
  type AccountingTransaction,
  type SpecialEventItem,
  toSimulationMonth,
  toCalendarYear,
  toCalendarMonth,
  toEuroAmount,
  toNetSalary,
  toEventId,
  toStatutoryCitation
} from '../types.ts';
import { createTransaction } from '../ledger/transaction.ts';
import { buildMonthlyLedgerEntry } from '../ledger/ledger.ts';
import { computeMonthlySwapWithholdingVariance, computeAnnualTaxReconciliation } from '../tax/jointAssessment.ts';
import { computeElterngeldBenefits } from '../benefits/elterngeldPlus.ts';
import { computeSiblingBonus } from '../benefits/siblingBonus.ts';
import { computeKindergeld } from '../benefits/kindergeld.ts';

export interface TimelineSimulationParams {
  readonly scenarioKey: ScenarioId;
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
 * Pure Deterministic 60-Month Timeline Simulator
 */
export function generateTimelineSimulation(
  params: TimelineSimulationParams
): SimulationResult {
  const scenarioKey = params.scenarioKey;
  const h3Net = params.husbandClass3Net;
  const h5Net = params.husbandClass5Net;
  const w5FT = params.wifeClass5FullTimeNet;
  const w3FT = params.wifeClass3FullTimeNet;
  const w5PT = params.wifeClass5PartTimeNet;
  const w3PT = params.wifeClass3PartTimeNet;
  const kgRate = params.kindergeldPerChild;

  // Timeline Milestones
  const preBuffer = params.prePregnancyPlanningMonths;
  const b1 = params.child1BirthMonth as number;
  const spacing = params.birthSpacingMonths;
  const b2 = b1 + spacing;

  const preg1Start = preBuffer + 1;
  const preM1 = b1 - 1;
  const mutterschutz1Months = [preM1, b1, b1 + 1];

  const preg2Start = b1 + (spacing - 9);
  const preM2 = b2 - 1;
  const mutterschutz2Months = [preM2, b2, b2 + 1];

  const lead = params.swapLeadMonths;
  const swap1Start = Math.max(1, preM1 - lead);
  const swap1End = preM1 - 1;

  const swap2Start = Math.max(b1 + 2, preM2 - lead);
  const swap2End = preM2 - 1;

  // Parental Allowance Windows
  const eg1Start = b1 + 2;
  const eg1End = eg1Start + 11;
  const eg1BonusStart = eg1End + 1;
  const eg1BonusEnd = eg1BonusStart + 3;

  const eg2Start = b2 + 2;
  const eg2End = eg2Start + 11;
  const eg2BonusStart = eg2End + 1;
  const eg2BonusEnd = eg2BonusStart + 3;

  const siblingBonusEndMonth = b1 + 36;

  // Child 1 Elterngeld Entitlements
  const egChild1B = computeElterngeldBenefits(w5FT, w5PT);
  const egChild1C = computeElterngeldBenefits(w3FT, w5PT);

  // Child 2 Elterngeld Entitlements (Blended 12-Month Assessment Baseline)
  const blendedNetB = toNetSalary(Math.round((10 * (w5PT as number) + 2 * (w5FT as number)) / 12));
  const egChild2B = computeElterngeldBenefits(blendedNetB, w5PT);

  const blendedNetC = toNetSalary(Math.round((10 * (w3PT as number) + 2 * (w3FT as number)) / 12));
  const egChild2C = computeElterngeldBenefits(blendedNetC, w5PT);

  // PASS 1: Generate Raw Monthly Inflows and Track Swap Withholding Variances
  interface RawMonth {
    readonly month: SimulationMonth;
    readonly year: CalendarYear;
    readonly monthInYear: CalendarMonth;
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

  for (let m = 1; m <= 60; m++) {
    const sMonth = toSimulationMonth(m);
    const year = toCalendarYear(Math.ceil(m / 12));
    const monthInYear = toCalendarMonth(((m - 1) % 12) + 1);

    let husbandSalary = toEuroAmount(0);
    let wifeSalary = toEuroAmount(0);
    let mutterschutz = toEuroAmount(0);
    let wifeElterngeld = toEuroAmount(0);
    let husbandElterngeld = toEuroAmount(0);
    let kindergeld = toEuroAmount(0);
    let taxClassLabel = 'H: III | W: V';
    let phaseLabel = 'Standard FT';
    let isSwapActive = false;
    let isMutterschutz = false;
    let isPartnerschaftsbonus = false;
    let hasSiblingBonus = false;
    const transactions: AccountingTransaction[] = [];

    if (scenarioKey === ScenarioId.A) {
      husbandSalary = toEuroAmount(h3Net as number);
      wifeSalary = toEuroAmount(w5FT as number);
      phaseLabel = 'Standard Career (No Leave)';
      taxClassLabel = 'H: III | W: V';
    } else if (scenarioKey === ScenarioId.B) {
      husbandSalary = toEuroAmount(h3Net as number);
      taxClassLabel = 'H: III | W: V';

      // Kindergeld
      if (m >= b1 && m < b2) {
        kindergeld = toEuroAmount(kgRate as number);
      } else if (m >= b2) {
        kindergeld = toEuroAmount((kgRate as number) * 2);
      }

      // Mutterschutz 1
      if (mutterschutz1Months.includes(m)) {
        isMutterschutz = true;
        wifeSalary = toEuroAmount(0);
        mutterschutz = toEuroAmount(w5FT as number);
        phaseLabel = m === preM1 ? 'Pre-Birth Mutterschutz 1 (MuSchG)' : 'Post-Birth Mutterschutz 1';
      }
      // Child 1 Elterngeld
      else if (m >= eg1Start && m <= eg1BonusEnd) {
        wifeSalary = toEuroAmount(w5PT as number);
        wifeElterngeld = egChild1B.elterngeldPlus;
        phaseLabel = 'Child 1 EGPlus (Mother)';

        if (m >= eg1Start && m <= eg1Start + 3) {
          husbandElterngeld = toEuroAmount(150);
        }
        if (m >= eg1BonusStart && m <= eg1BonusEnd) {
          isPartnerschaftsbonus = true;
          husbandElterngeld = toEuroAmount(150);
          phaseLabel = 'Partnerschaftsbonus 1 (Both 24-32h)';
        }
      }
      // Mutterschutz 2
      else if (mutterschutz2Months.includes(m)) {
        isMutterschutz = true;
        wifeSalary = toEuroAmount(0);
        mutterschutz = toEuroAmount(w5PT as number);
        phaseLabel = m === preM2 ? 'Pre-Birth Mutterschutz 2 (PT Basis)' : 'Post-Birth Mutterschutz 2';
      }
      // Child 2 Elterngeld
      else if (m >= eg2Start && m <= eg2BonusEnd) {
        wifeSalary = toEuroAmount(w5PT as number);
        const sibling = computeSiblingBonus(egChild2B.elterngeldPlus, toSimulationMonth(b1), sMonth);
        hasSiblingBonus = sibling.isEligible;
        wifeElterngeld = sibling.totalElterngeldPlusWithBonus;
        phaseLabel = sibling.isEligible ? 'Child 2 EGPlus + Sibling Bonus (+10%)' : 'Child 2 EGPlus (Min €150)';

        if (m >= eg2Start && m <= eg2Start + 3) {
          husbandElterngeld = toEuroAmount(150);
        }
        if (m >= eg2BonusStart && m <= eg2BonusEnd) {
          isPartnerschaftsbonus = true;
          husbandElterngeld = toEuroAmount(150);
          phaseLabel = 'Partnerschaftsbonus 2 (Both 24-32h)';
        }
      }
      // Part-time gap / post-leave
      else if (m > b1) {
        wifeSalary = toEuroAmount(w5PT as number);
        phaseLabel = 'Family Part-Time (Post-Leave)';
      } else {
        wifeSalary = toEuroAmount(w5FT as number);
        phaseLabel = 'Pre-Birth Full-Time';
      }
    } else if (scenarioKey === ScenarioId.C) {
      // Kindergeld
      if (m >= b1 && m < b2) {
        kindergeld = toEuroAmount(kgRate as number);
      } else if (m >= b2) {
        kindergeld = toEuroAmount((kgRate as number) * 2);
      }

      // Pre-Swap 1
      if (m < swap1Start) {
        husbandSalary = toEuroAmount(h3Net as number);
        wifeSalary = toEuroAmount(w5FT as number);
        taxClassLabel = 'H: III | W: V';
        phaseLabel = m < preg1Start ? 'Planning Phase (Pre-Pregnancy)' : 'Pregnancy 1 (Pre-Swap)';
      }
      // Swap 1 Active (Pre-Maternity 1)
      else if (m >= swap1Start && m <= swap1End) {
        isSwapActive = true;
        husbandSalary = toEuroAmount(h5Net as number);
        wifeSalary = toEuroAmount(w3FT as number);
        taxClassLabel = 'H: V | W: III (Swap 1)';
        phaseLabel = 'Swap 1 Active (7M Pre-Mutterschutz)';
      }
      // Pre-Birth Mutterschutz 1
      else if (m === preM1) {
        isMutterschutz = true;
        isSwapActive = true;
        husbandSalary = toEuroAmount(h5Net as number);
        wifeSalary = toEuroAmount(0);
        mutterschutz = toEuroAmount(w3FT as number);
        taxClassLabel = 'H: V | W: III (Pre-M)';
        phaseLabel = 'Pre-Birth Mutterschutz 1 (Class III FT)';
      }
      // Post-Birth Mutterschutz 1 (Reverted to III/V)
      else if (m === b1 || m === b1 + 1) {
        isMutterschutz = true;
        husbandSalary = toEuroAmount(h3Net as number);
        wifeSalary = toEuroAmount(0);
        mutterschutz = toEuroAmount(w3FT as number);
        taxClassLabel = 'H: III | W: V (Reverted)';
        phaseLabel = 'Post-Birth Mutterschutz 1 (Maxed Benefit)';
      }
      // Child 1 ElterngeldPlus
      else if (m >= eg1Start && m <= eg1BonusEnd) {
        husbandSalary = toEuroAmount(h3Net as number);
        wifeSalary = toEuroAmount(w5PT as number);
        wifeElterngeld = egChild1C.elterngeldPlus;
        taxClassLabel = 'H: III | W: V';
        phaseLabel = 'Child 1 EGPlus (Synthetic Class III Maxed €900)';

        if (m >= eg1Start && m <= eg1Start + 3) {
          husbandElterngeld = toEuroAmount(150);
        }
        if (m >= eg1BonusStart && m <= eg1BonusEnd) {
          isPartnerschaftsbonus = true;
          husbandElterngeld = toEuroAmount(150);
          phaseLabel = 'Partnerschaftsbonus 1 (Both 24-32h)';
        }
      }
      // Swap 2 Active (Pre-Maternity 2)
      else if (m >= swap2Start && m <= swap2End) {
        isSwapActive = true;
        husbandSalary = toEuroAmount(h5Net as number);
        wifeSalary = toEuroAmount(w3PT as number);
        taxClassLabel = 'H: V | W: III (Swap 2)';
        phaseLabel = 'Swap 2 Active (7M Pre-Mutterschutz 2)';
      }
      // Pre-Birth Mutterschutz 2
      else if (m === preM2) {
        isMutterschutz = true;
        isSwapActive = true;
        husbandSalary = toEuroAmount(h5Net as number);
        wifeSalary = toEuroAmount(0);
        mutterschutz = toEuroAmount(w3PT as number);
        taxClassLabel = 'H: V | W: III (Pre-M2)';
        phaseLabel = 'Pre-Birth Mutterschutz 2 (Class III PT)';
      }
      // Post-Birth Mutterschutz 2
      else if (m === b2 || m === b2 + 1) {
        isMutterschutz = true;
        husbandSalary = toEuroAmount(h3Net as number);
        wifeSalary = toEuroAmount(0);
        mutterschutz = toEuroAmount(w3PT as number);
        taxClassLabel = 'H: III | W: V (Reverted)';
        phaseLabel = 'Post-Birth Mutterschutz 2 (Maxed Benefit)';
      }
      // Child 2 ElterngeldPlus
      else if (m >= eg2Start && m <= eg2BonusEnd) {
        husbandSalary = toEuroAmount(h3Net as number);
        wifeSalary = toEuroAmount(w5PT as number);
        taxClassLabel = 'H: III | W: V';

        const sibling = computeSiblingBonus(egChild2C.elterngeldPlus, toSimulationMonth(b1), sMonth);
        hasSiblingBonus = sibling.isEligible;
        wifeElterngeld = sibling.totalElterngeldPlusWithBonus;
        phaseLabel = sibling.isEligible
          ? 'Child 2 EGPlus + Sibling Bonus (+10%)'
          : 'Child 2 EGPlus (Post-Sibling Bonus)';

        if (m >= eg2Start && m <= eg2Start + 3) {
          husbandElterngeld = toEuroAmount(150);
        }
        if (m >= eg2BonusStart && m <= eg2BonusEnd) {
          isPartnerschaftsbonus = true;
          husbandElterngeld = toEuroAmount(150);
          phaseLabel = 'Partnerschaftsbonus 2 (Both 24-32h)';
        }
      }
      // Part-Time Gap or Post-Leave
      else if (m > b1) {
        husbandSalary = toEuroAmount(h3Net as number);
        wifeSalary = toEuroAmount(w5PT as number);
        phaseLabel = 'Family Part-Time (Post-Leave)';
      } else {
        husbandSalary = toEuroAmount(h3Net as number);
        wifeSalary = toEuroAmount(w5FT as number);
        phaseLabel = 'Pre-Birth Full-Time';
      }
    }

    // Exact Wage Withholding Deficit during active swap
    let monthlyWithholdingDeficit = toEuroAmount(0);
    if (scenarioKey === ScenarioId.C && isSwapActive) {
      const isPT = m > b1 || phaseLabel.includes('Part-Time');
      monthlyWithholdingDeficit = computeMonthlySwapWithholdingVariance(
        h3Net,
        h5Net,
        isPT ? w3PT : w3FT,
        isPT ? w5PT : w5FT
      );
    }

    rawMonths.push({
      month: sMonth,
      year,
      monthInYear,
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

  // PASS 2: Aggregate Annual Tax Return Reconciliations (§ 26b EStG)
  const yearlyDeficits: Record<number, EuroAmount[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  rawMonths.forEach(rm => {
    const yNum = rm.year as number;
    if (yearlyDeficits[yNum]) {
      yearlyDeficits[yNum].push(rm.monthlyWithholdingDeficit);
    }
  });

  const taxRefundByMonth: Record<number, EuroAmount> = {};
  const tMonth = params.taxReturnMonth as number;
  const baseStandardRefund = toEuroAmount(850);

  // Year 0 (Pre-simulation standard return)
  taxRefundByMonth[tMonth] = baseStandardRefund;

  for (let yr = 1; yr <= 4; yr++) {
    const refundMonth = yr * 12 + tMonth;
    if (refundMonth <= 60) {
      const recon = computeAnnualTaxReconciliation(
        toCalendarYear(yr),
        toSimulationMonth(refundMonth),
        yearlyDeficits[yr] || [],
        baseStandardRefund
      );
      taxRefundByMonth[refundMonth] = recon.totalRefundAmount;
    }
  }

  // PASS 3: Assemble Final Ledger and Transactions
  const months: MonthlyLedgerEntry[] = [];
  let runSalaries = 0;
  let runBenefits = 0;
  let runTaxRefunds = 0;
  let runTotal = 0;

  for (let i = 0; i < rawMonths.length; i++) {
    const rm = rawMonths[i];
    const m = rm.month as number;
    const mInYear = rm.monthInYear as number;
    const year = rm.year;

    // 13th Month Salary Events
    let bonus40Amount = toEuroAmount(0);
    let bonus60Amount = toEuroAmount(0);
    const currentHusbandNet = rm.isSwapActive ? (h5Net as number) : (h3Net as number);

    if (params.enable13thSalary) {
      if (mInYear === (params.bonus40Month as number)) {
        bonus40Amount = toEuroAmount(Math.round(0.40 * currentHusbandNet));
      }
      if (mInYear === (params.bonus60Month as number)) {
        bonus60Amount = toEuroAmount(Math.round(0.60 * currentHusbandNet));
      }
    }

    const taxRefund = taxRefundByMonth[m] || toEuroAmount(0);

    // Build Accounting Transactions for Audit Trail
    const txs: AccountingTransaction[] = [];
    if ((rm.husbandSalary as number) > 0) {
      txs.push(createTransaction({
        id: `TX-M${m}-HUSBAND-SALARY`,
        month: rm.month,
        year,
        type: TransactionType.SalaryBase,
        direction: TransactionDirection.Inflow,
        amount: rm.husbandSalary,
        statutoryCitation: '§ 19 EStG (Einkünfte aus nichtselbständiger Arbeit)',
        taxClassLabel: rm.taxClassLabel,
        description: `Husband Monthly Working Salary (${rm.taxClassLabel})`,
        auditTrail: `Net Salary earned in ${rm.taxClassLabel}`
      }));
    }

    if ((rm.wifeSalary as number) > 0) {
      txs.push(createTransaction({
        id: `TX-M${m}-WIFE-SALARY`,
        month: rm.month,
        year,
        type: TransactionType.SalaryBase,
        direction: TransactionDirection.Inflow,
        amount: rm.wifeSalary,
        statutoryCitation: '§ 19 EStG (Einkünfte aus nichtselbständiger Arbeit)',
        taxClassLabel: rm.taxClassLabel,
        description: `Wife Monthly Working Salary (${rm.taxClassLabel})`,
        auditTrail: `Net Salary earned in ${rm.taxClassLabel}`
      }));
    }

    if ((bonus40Amount as number) > 0) {
      txs.push(createTransaction({
        id: `TX-M${m}-BONUS-40`,
        month: rm.month,
        year,
        type: TransactionType.SalaryBonus13thVacation,
        direction: TransactionDirection.Inflow,
        amount: bonus40Amount,
        statutoryCitation: '§ 19 EStG & BEEG § 2c Abs. 1 (Exempt Sonderzahlung)',
        taxClassLabel: rm.taxClassLabel,
        description: '13th Month Salary: 40% Vacation Bonus (*Urlaubsgeld*)',
        auditTrail: `40% of Husband Base Net (${currentHusbandNet} €)`
      }));
    }

    if ((bonus60Amount as number) > 0) {
      txs.push(createTransaction({
        id: `TX-M${m}-BONUS-60`,
        month: rm.month,
        year,
        type: TransactionType.SalaryBonus13thChristmas,
        direction: TransactionDirection.Inflow,
        amount: bonus60Amount,
        statutoryCitation: '§ 19 EStG & BEEG § 2c Abs. 1 (Exempt Sonderzahlung)',
        taxClassLabel: rm.taxClassLabel,
        description: '13th Month Salary: 60% Christmas Bonus (*Weihnachtsgeld*)',
        auditTrail: `60% of Husband Base Net (${currentHusbandNet} €)`
      }));
    }

    if ((rm.mutterschutz as number) > 0) {
      txs.push(createTransaction({
        id: `TX-M${m}-MUTTERSCHUTZ`,
        month: rm.month,
        year,
        type: TransactionType.BenefitMutterschutz,
        direction: TransactionDirection.Inflow,
        amount: rm.mutterschutz,
        statutoryCitation: 'MuSchG § 19 & § 20 (100% Net Wage Replacement)',
        taxClassLabel: rm.taxClassLabel,
        description: 'Maternity Protection Benefit (*Mutterschutz*)',
        auditTrail: 'GKV Mutterschaftsgeld + Employer Supplement'
      }));
    }

    if ((rm.wifeElterngeld as number) > 0) {
      txs.push(createTransaction({
        id: `TX-M${m}-WIFE-ELTERNGELD`,
        month: rm.month,
        year,
        type: TransactionType.BenefitElterngeldPlusMother,
        direction: TransactionDirection.Inflow,
        amount: rm.wifeElterngeld,
        statutoryCitation: 'BEEG § 4a (ElterngeldPlus)',
        taxClassLabel: rm.taxClassLabel,
        description: 'ElterngeldPlus (Mother)',
        auditTrail: `Statutory Parental Allowance with synthetic net evaluation`
      }));
    }

    if ((rm.husbandElterngeld as number) > 0) {
      txs.push(createTransaction({
        id: `TX-M${m}-HUSBAND-ELTERNGELD`,
        month: rm.month,
        year,
        type: rm.isPartnerschaftsbonus
          ? TransactionType.BenefitPartnerschaftsbonus
          : TransactionType.BenefitElterngeldPlusFather,
        direction: TransactionDirection.Inflow,
        amount: rm.husbandElterngeld,
        statutoryCitation: 'BEEG § 4b (Partnermonate / Partnerschaftsbonus)',
        taxClassLabel: rm.taxClassLabel,
        description: 'Partner Months / Partnerschaftsbonus (Father)',
        auditTrail: 'Monthly partner allowance while working concurrent part-time'
      }));
    }

    if ((rm.kindergeld as number) > 0) {
      txs.push(createTransaction({
        id: `TX-M${m}-KINDERGELD`,
        month: rm.month,
        year,
        type: TransactionType.BenefitKindergeld,
        direction: TransactionDirection.Inflow,
        amount: rm.kindergeld,
        statutoryCitation: 'EStG § 66 (Kindergeld)',
        taxClassLabel: rm.taxClassLabel,
        description: 'Statutory Child Benefit (*Kindergeld*)',
        auditTrail: `Monthly allowance per living child`
      }));
    }

    if ((taxRefund as number) > 0) {
      txs.push(createTransaction({
        id: `TX-M${m}-TAX-REFUND`,
        month: rm.month,
        year,
        type: TransactionType.TaxReconciliationRefund,
        direction: TransactionDirection.Inflow,
        amount: taxRefund,
        statutoryCitation: 'EStG § 26b (*Ehegatten-Splitting*) & § 46 Abs. 2 Nr. 3a',
        taxClassLabel: 'Joint Assessment (*Splitting*)',
        description: 'Annual Tax Assessment Refund (*Finanzamt*)',
        auditTrail: 'Full refund of Class V interim withholding deficit + statutory standard deductions return'
      }));
    }

    // Special Life Event Tagging
    let eventTag: string | null = null;
    let eventType: string | null = null;

    if (m === 1) {
      eventTag = 'Planning Phase Start (*Vorbereitung*)';
      eventType = 'planning';
    } else if (m === preg1Start && scenarioKey === 'C') {
      eventTag = 'Pregnancy 1 & Tax Swap (*Steuerklassenwechsel* III/V)';
      eventType = 'swap';
    } else if (m === preg1Start && scenarioKey !== 'A') {
      eventTag = 'Pregnancy 1 Start (*Beginn*)';
      eventType = 'preg';
    } else if (m === b1 && scenarioKey !== 'A') {
      eventTag = 'Child 1 Birth (*Geburt Kind 1*)';
      eventType = 'birth';
    } else if (m === preg2Start && scenarioKey !== 'A') {
      eventTag = 'Pregnancy 2 Start (18M Gap)';
      eventType = 'preg';
    } else if (m === swap2Start && scenarioKey === 'C') {
      eventTag = 'Tax Swap 2 (*Steuerklassenwechsel 2* III/V)';
      eventType = 'swap';
    } else if (m === b2 && scenarioKey !== 'A') {
      eventTag = 'Child 2 Birth (*Geburt Kind 2*)';
      eventType = 'birth';
    } else if (m === siblingBonusEndMonth && scenarioKey !== 'A') {
      eventTag = 'Child 1 Age 3 (*Geschwisterbonus* Ends)';
      eventType = 'bonus_end';
    }

    // Build Special Events for UI display (table sub-rows)
    const specialEvents: SpecialEventItem[] = [];
    if ((bonus40Amount as number) > 0) {
      specialEvents.push({
        eventId: toEventId(`EVENT-M${m}-BONUS40`),
        month: rm.month,
        year,
        type: SpecialEventType.Bonus40,
        title: '13th Month Salary: 40% Vacation Bonus (*Urlaubsgeld*)',
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
        type: SpecialEventType.Bonus60,
        title: '13th Month Salary: 60% Christmas Bonus (*Weihnachtsgeld*)',
        category: SpecialEventCategory.ThirteenthSalary,
        statutory: toStatutoryCitation('§ 9a / § 19 EStG (BEEG § 2c exempt)'),
        taxClassLabel: rm.taxClassLabel,
        amount: bonus60Amount,
        description: '60% year-end special payment (exempt from Elterngeld assessment under BEEG § 2c Abs. 1)'
      });
    }

    if ((taxRefund as number) > 0) {
      const isDeficitRefund = (taxRefund as number) > 850;
      specialEvents.push({
        eventId: toEventId(`EVENT-M${m}-TAX-REFUND`),
        month: rm.month,
        year,
        type: SpecialEventType.TaxReturn,
        title: `Annual Tax Assessment Refund (Year ${Math.max(1, (year as number) - 1)} Return)`,
        category: SpecialEventCategory.TaxOffice,
        statutory: toStatutoryCitation('§ 26b EStG (*Ehegatten-Splitting*)'),
        taxClassLabel: 'Joint Assessment (*Splitting*)',
        amount: taxRefund,
        description: isDeficitRefund
          ? `Full refund of Tax Class V wage withholding deficit (+${((taxRefund as number) - 850).toLocaleString('de-DE')} €) plus statutory deductions return (+850 €)`
          : 'Standard annual income tax reconciliation and statutory deductions return (+850 €)'
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

  return {
    scenarioKey,
    months,
    summary: {
      totalSalaries: toEuroAmount(runSalaries),
      totalBenefits: toEuroAmount(runBenefits),
      totalTaxRefunds: toEuroAmount(runTaxRefunds),
      grandTotal: toEuroAmount(runTotal),
      totalMutterschutz: toEuroAmount(months.reduce((acc, m) => acc + (m.mutterschutz as number), 0)),
      totalWifeElterngeld: toEuroAmount(months.reduce((acc, m) => acc + (m.wifeElterngeld as number), 0)),
      totalHusbandElterngeld: toEuroAmount(months.reduce((acc, m) => acc + (m.husbandElterngeld as number), 0)),
      totalKindergeld: toEuroAmount(months.reduce((acc, m) => acc + (m.kindergeld as number), 0)),
      total13thSalaries: toEuroAmount(months.reduce((acc, m) => acc + (m.specialBonusTotal as number), 0))
    }
  };
}
