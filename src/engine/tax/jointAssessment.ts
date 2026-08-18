/**
 * German Elterngeld & Parental Leave 5-Year Financial Simulator - Spousal Joint Assessment Engine
 *
 * Implements spousal splitting tax liability (§ 26b, § 32a Abs. 5 EStG), monthly tax class swap
 * withholding variance reconciliation, statutory child allowance favorability checks
 * (Kinderfreibetrag Günstigerprüfung § 31, § 32 Abs. 6 EStG), and annual tax return refunds (§ 46 EStG).
 */

import {
  type EuroAmount,
  type NetSalary,
  type CalendarYear,
  type FullCalendarYear,
  type ChildIndex,
  type SimulationMonth,
  type GuenstigerpruefungResult,
  toEuroAmount,
  toStatutoryCitation,
} from "#engine/types";
import {
  computeAnnualIncomeTax,
  computeSolidaritySurcharge,
} from "#engine/tax/wageTax";

/**
 * Calculates spousal joint tax liability under Ehegatten-Splitting (§ 26b, § 32a Abs. 5 EStG).
 * Joint Tax = 2 * Tarif((Husband ZvE + Wife ZvE) / 2).
 *
 * @param husbandAnnualZvE - Husband's annual taxable income (ZvE) in EUR.
 * @param wifeAnnualZvE - Wife's annual taxable income (ZvE) in EUR.
 * @returns Joint tax, solidarity surcharge, and total joint tax liability in EUR.
 */
export function computeJointTaxLiability(
  husbandAnnualZvE: number,
  wifeAnnualZvE: number,
): {
  readonly jointTax: EuroAmount;
  readonly jointSolidaritySurcharge: EuroAmount;
  readonly totalTaxLiability: EuroAmount;
} {
  const totalZvE = Math.max(0, husbandAnnualZvE + wifeAnnualZvE);
  const halfZvE = totalZvE / 2;

  // Splitting Tariff: 2 * Tarif(totalZvE / 2)
  const singleTaxOnHalf = computeAnnualIncomeTax(halfZvE) as number;
  const jointTax = toEuroAmount(singleTaxOnHalf * 2);

  const jointSolz = computeSolidaritySurcharge(jointTax, true);
  const total = toEuroAmount((jointTax as number) + (jointSolz as number));

  return {
    jointTax,
    jointSolidaritySurcharge: jointSolz,
    totalTaxLiability: total,
  };
}

/**
 * Calculates the monthly temporary tax withholding variance during the proactive tax class swap phase (§ 38b EStG).
 * When husband swaps from Class III to V and wife swaps from Class V to III:
 * Monthly Deficit = (Husband Class III Net - Husband Class V Net) - (Wife Class III Net - Wife Class V Net).
 * This deficit is fully restored upon annual tax reconciliation.
 *
 * @param husbandClass3Net - Husband's standard take-home net in Tax Class III.
 * @param husbandClass5Net - Husband's take-home net in swapped Tax Class V.
 * @param wifeClass3Net - Wife's take-home net in swapped Tax Class III.
 * @param wifeClass5Net - Wife's standard take-home net in Tax Class V.
 * @returns Monthly cash flow withholding deficit in EUR.
 */
export function computeMonthlySwapWithholdingVariance(
  husbandClass3Net: NetSalary,
  husbandClass5Net: NetSalary,
  wifeClass3Net: NetSalary,
  wifeClass5Net: NetSalary,
): EuroAmount {
  const husbandLoss =
    (husbandClass3Net as number) - (husbandClass5Net as number);
  const wifeGain = (wifeClass3Net as number) - (wifeClass5Net as number);
  const monthlyVariance = husbandLoss - wifeGain;
  return toEuroAmount(Math.max(0, monthlyVariance));
}

/**
 * Child Presence Record for Annual Calendar Year Tax Assessment.
 * Tracks birth year and month to determine full-year or prorated child tax allowance eligibility.
 */
export interface ChildYearPresence {
  /** Ordinal index of the child. */
  readonly childIndex: ChildIndex | number;
  /** 4-digit Gregorian calendar birth year (e.g. 2026). */
  readonly birthCalendarYear: FullCalendarYear | number;
  /** 1-based calendar birth month (1..12). */
  readonly birthCalendarMonth: number;
}

/**
 * Statutory Child Allowance Favorability Assessment (§ 31, § 32 Abs. 6 EStG Günstigerprüfung).
 * Compares tax relief from Kinderfreibetrag + BEA (9.540 €/child/yr, prorated in birth year)
 * against total Kindergeld received (§ 66 EStG).
 * Any excess tax savings is added to the annual tax refund.
 *
 * @param jointAnnualZvE - Combined spousal annual taxable income (ZvE) in EUR.
 * @param children - Array of child presence records in the household.
 * @param reconciledYear - Calendar year being reconciled.
 * @param monthlyKindergeldPerChild - Monthly Kindergeld amount per child (defaults to 259 €).
 * @returns Complete `GuenstigerpruefungResult` structure.
 */
export function computeKinderfreibetragGuenstigerpruefung(
  jointAnnualZvE: number,
  children: readonly ChildYearPresence[],
  reconciledYear: number,
  monthlyKindergeldPerChild: number = 259,
): GuenstigerpruefungResult {
  const FULL_KINDERFREIBETRAG_PER_CHILD = 9540; // § 32 Abs. 6 EStG (6.612 € + 2.928 € BEA)

  let totalKinderfreibetrag = 0;
  let totalKindergeldReceived = 0;

  children.forEach((child) => {
    if (child.birthCalendarYear < reconciledYear) {
      // Child alive for the entire reconciled calendar year
      totalKinderfreibetrag += FULL_KINDERFREIBETRAG_PER_CHILD;
      totalKindergeldReceived += monthlyKindergeldPerChild * 12;
    } else if (child.birthCalendarYear === reconciledYear) {
      // Child born during the reconciled calendar year -> Prorated by months (§ 32 Abs. 6 Satz 5 EStG)
      const monthsAlive = Math.max(1, 12 - child.birthCalendarMonth + 1);
      const proratedAllowance = Math.round(
        (monthsAlive / 12) * FULL_KINDERFREIBETRAG_PER_CHILD,
      );
      totalKinderfreibetrag += proratedAllowance;
      totalKindergeldReceived += monthlyKindergeldPerChild * monthsAlive;
    }
  });

  if (totalKinderfreibetrag === 0 || jointAnnualZvE <= 0) {
    return {
      jointAnnualZvE: toEuroAmount(jointAnnualZvE),
      totalKinderfreibetrag: toEuroAmount(0),
      jointTaxWithoutAllowance: toEuroAmount(0),
      jointTaxWithAllowance: toEuroAmount(0),
      taxSavingsFromAllowance: toEuroAmount(0),
      totalKindergeldReceived: toEuroAmount(totalKindergeldReceived),
      extraTaxRefund: toEuroAmount(0),
      isKinderfreibetragFavorable: false,
      statutoryCitation: toStatutoryCitation(
        "§ 31 EStG (Familienleistungsausgleich)",
      ),
    };
  }

  // 1. Joint tax liability WITHOUT Kinderfreibetrag
  const taxWithout = computeJointTaxLiability(jointAnnualZvE, 0)
    .totalTaxLiability as number;

  // 2. Joint tax liability WITH Kinderfreibetrag (§ 32 Abs. 6 EStG)
  const reducedZvE = Math.max(0, jointAnnualZvE - totalKinderfreibetrag);
  const taxWith = computeJointTaxLiability(reducedZvE, 0)
    .totalTaxLiability as number;

  // 3. Tax Savings
  const taxSavings = Math.max(0, taxWithout - taxWith);

  // 4. Statutory Favorability Comparison (§ 31 Satz 4 EStG Günstigerprüfung)
  const isFavorable = taxSavings > totalKindergeldReceived;
  const extraTaxRefund = isFavorable
    ? Math.max(0, taxSavings - totalKindergeldReceived)
    : 0;

  return {
    jointAnnualZvE: toEuroAmount(jointAnnualZvE),
    totalKinderfreibetrag: toEuroAmount(totalKinderfreibetrag),
    jointTaxWithoutAllowance: toEuroAmount(taxWithout),
    jointTaxWithAllowance: toEuroAmount(taxWith),
    taxSavingsFromAllowance: toEuroAmount(taxSavings),
    totalKindergeldReceived: toEuroAmount(totalKindergeldReceived),
    extraTaxRefund: toEuroAmount(extraTaxRefund),
    isKinderfreibetragFavorable: isFavorable,
    statutoryCitation: toStatutoryCitation(
      "§ 31, § 32 Abs. 6 EStG (Familienleistungsausgleich Günstigerprüfung)",
    ),
  };
}

/**
 * Annual Calendar Tax Return Reconciliation Result (§ 26b, § 31, § 46 Abs. 2 Nr. 3a EStG).
 * Encapsulates accumulated monthly withholding deficit recoveries, base deductions refunds, and child tax relief.
 */
export interface AnnualTaxReconciliationResult {
  /** Simulation year in which the tax return was filed. */
  readonly taxYear: CalendarYear;
  /** Simulation month in which the refund is paid out. */
  readonly refundMonth: SimulationMonth;
  /** Total withholding deficit accumulated during the tax swap period in EUR. */
  readonly accumulatedSwapDeficit: EuroAmount;
  /** Standard baseline itemized deductions refund in EUR (e.g. 850 €). */
  readonly baseDeductionsRefund: EuroAmount;
  /** Statutory Günstigerprüfung assessment result. */
  readonly guenstigerpruefung: GuenstigerpruefungResult;
  /** Total combined tax refund disbursement in EUR. */
  readonly totalRefundAmount: EuroAmount;
  /** Statutory legal citations governing the reconciliation. */
  readonly statutoryCitation: string;
}

/**
 * Computes annual calendar tax return reconciliation under § 26b, § 31, and § 46 Abs. 2 Nr. 3a EStG.
 * Aggregates monthly swap deficits, base deduction refunds, and favorable child tax relief.
 *
 * @param taxYear - Simulation year being reconciled.
 * @param refundMonth - Simulation month when refund check is credited.
 * @param monthlyDeficitsInYear - Array of monthly withholding deficit amounts for the tax year.
 * @param baseStandardRefund - Baseline standard deductions refund (defaults to 850 €).
 * @param guenstigerpruefung - Optional Günstigerprüfung assessment result.
 * @returns Complete `AnnualTaxReconciliationResult`.
 */
export function computeAnnualTaxReconciliation(
  taxYear: CalendarYear,
  refundMonth: SimulationMonth,
  monthlyDeficitsInYear: readonly EuroAmount[],
  baseStandardRefund: EuroAmount = toEuroAmount(850),
  guenstigerpruefung?: GuenstigerpruefungResult,
): AnnualTaxReconciliationResult {
  const totalDeficitInYear = monthlyDeficitsInYear.reduce(
    (acc, val) => acc + (val as number),
    0,
  );

  const accumulatedSwapDeficit = toEuroAmount(totalDeficitInYear);
  const extraRefund = guenstigerpruefung
    ? (guenstigerpruefung.extraTaxRefund as number)
    : 0;
  const totalRefundAmount = toEuroAmount(
    (accumulatedSwapDeficit as number) +
      (baseStandardRefund as number) +
      extraRefund,
  );

  return {
    taxYear,
    refundMonth,
    accumulatedSwapDeficit,
    baseDeductionsRefund: baseStandardRefund,
    guenstigerpruefung: guenstigerpruefung || {
      jointAnnualZvE: toEuroAmount(0),
      totalKinderfreibetrag: toEuroAmount(0),
      jointTaxWithoutAllowance: toEuroAmount(0),
      jointTaxWithAllowance: toEuroAmount(0),
      taxSavingsFromAllowance: toEuroAmount(0),
      totalKindergeldReceived: toEuroAmount(0),
      extraTaxRefund: toEuroAmount(0),
      isKinderfreibetragFavorable: false,
      statutoryCitation: toStatutoryCitation(
        "§ 31 EStG (Familienleistungsausgleich)",
      ),
    },
    totalRefundAmount,
    statutoryCitation:
      "EStG § 26b (*Ehegatten-Splitting*), § 31 (*Günstigerprüfung*), § 46 Abs. 2 Nr. 3a",
  };
}
