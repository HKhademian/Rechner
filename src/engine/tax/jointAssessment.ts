import {
  type EuroAmount,
  type NetSalary,
  type CalendarYear,
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
 * Annual Joint Tax Liability under Ehegatten-Splitting (§ 26b, § 32a Abs. 5 EStG)
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
 * Monthly Tax Withholding Deficit during Proactive Tax Swap Phase (§ 38b EStG)
 * When husband swaps to Class V and wife to Class III:
 * Monthly Deficit = (Husband Class III Net - Husband Class V Net) - (Wife Class III Net - Wife Class V Net)
 */
export function computeMonthlySwapWithholdingVariance(
  husbandClass3Net: NetSalary,
  husbandClass5Net: NetSalary,
  wifeClass3Net: NetSalary,
  wifeClass5Net: NetSalary,
): EuroAmount {
  const husbandExtraWithheld = Math.max(
    0,
    (husbandClass3Net as number) - (husbandClass5Net as number),
  );
  const wifeRelief = Math.max(
    0,
    (wifeClass3Net as number) - (wifeClass5Net as number),
  );
  const monthlyDeficit = Math.max(0, husbandExtraWithheld - wifeRelief);
  return toEuroAmount(monthlyDeficit);
}

/**
 * Child Presence Data for Calendar Year Tax Assessment
 */
export interface ChildYearPresence {
  readonly childIndex: number;
  readonly birthCalendarYear: number;
  readonly birthCalendarMonth: number; // 1..12
}

/**
 * Statutory Child Allowance Favorability Assessment (§ 31, § 32 Abs. 6 EStG Günstigerprüfung)
 * Compares tax relief from Kinderfreibetrag + BEA (9.540 €/child/yr, prorated in birth year)
 * against total Kindergeld received (§ 66 EStG).
 * Any excess tax savings is added to the annual tax refund.
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
 * Annual Calendar Tax Return Reconciliation (§ 26b, § 31, § 46 Abs. 2 Nr. 3a EStG)
 * Aggregates monthly withholding deficits for a given calendar year, computes the statutory refund,
 * and incorporates Günstigerprüfung child tax relief.
 */
export interface AnnualTaxReconciliationResult {
  readonly taxYear: CalendarYear;
  readonly refundMonth: SimulationMonth;
  readonly accumulatedSwapDeficit: EuroAmount;
  readonly baseDeductionsRefund: EuroAmount;
  readonly guenstigerpruefung: GuenstigerpruefungResult;
  readonly totalRefundAmount: EuroAmount;
  readonly statutoryCitation: string;
}

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
