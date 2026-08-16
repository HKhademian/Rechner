import {
  type EuroAmount,
  type NetSalary,
  type CalendarYear,
  type SimulationMonth,
  toEuroAmount,
  toStatutoryCitation
} from '../types.ts';
import { computeAnnualIncomeTax, computeSolidaritySurcharge } from './wageTax.ts';

/**
 * Annual Joint Tax Liability under Ehegatten-Splitting (§ 26b, § 32a Abs. 5 EStG)
 */
export function computeJointTaxLiability(
  husbandAnnualZvE: number,
  wifeAnnualZvE: number
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
    totalTaxLiability: total
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
  wifeClass5Net: NetSalary
): EuroAmount {
  const husbandExtraWithheld = Math.max(0, (husbandClass3Net as number) - (husbandClass5Net as number));
  const wifeRelief = Math.max(0, (wifeClass3Net as number) - (wifeClass5Net as number));
  const monthlyDeficit = Math.max(0, husbandExtraWithheld - wifeRelief);
  return toEuroAmount(monthlyDeficit);
}

/**
 * Annual Calendar Tax Return Reconciliation (§ 26b, § 46 Abs. 2 Nr. 3a EStG)
 * Aggregates monthly withholding deficits for a given calendar year and computes the statutory refund.
 */
export interface AnnualTaxReconciliationResult {
  readonly taxYear: CalendarYear;
  readonly refundMonth: SimulationMonth;
  readonly accumulatedSwapDeficit: EuroAmount;
  readonly baseDeductionsRefund: EuroAmount;
  readonly totalRefundAmount: EuroAmount;
  readonly statutoryCitation: string;
}

export function computeAnnualTaxReconciliation(
  taxYear: CalendarYear,
  refundMonth: SimulationMonth,
  monthlyDeficitsInYear: readonly EuroAmount[],
  baseStandardRefund: EuroAmount = toEuroAmount(850)
): AnnualTaxReconciliationResult {
  const totalDeficitInYear = monthlyDeficitsInYear.reduce(
    (acc, val) => acc + (val as number),
    0
  );

  const accumulatedSwapDeficit = toEuroAmount(totalDeficitInYear);
  const totalRefundAmount = toEuroAmount((accumulatedSwapDeficit as number) + (baseStandardRefund as number));

  return {
    taxYear,
    refundMonth,
    accumulatedSwapDeficit,
    baseDeductionsRefund: baseStandardRefund,
    totalRefundAmount,
    statutoryCitation: 'EStG § 26b (*Ehegatten-Splitting*) & § 46 Abs. 2 Nr. 3a'
  };
}
