import {
  type EuroAmount,
  type PercentageRate,
  toEuroAmount,
} from "#engine/types";

/** Statutory § 9a Satz 1 Nr. 1a EStG employee lump-sum deduction baseline (EUR/year). */
export const DEFAULT_EMPLOYEE_LUMP_SUM_EUR = toEuroAmount(1230);

/** Statutory § 35a Abs. 2 EStG maximum annual credit (20% of up to €20,000 labor = €4,000). */
export const DEFAULT_HOUSEHOLD_SERVICES_CREDIT_CAP_EUR = toEuroAmount(4000);

/** Statutory § 35a Abs. 3 EStG maximum annual credit (20% of up to €6,000 labor = €1,200). */
export const DEFAULT_CRAFTSMEN_CREDIT_CAP_EUR = toEuroAmount(1200);

/** Statutory § 35a EStG direct tax credit rate (20% of eligible invoiced labor). */
export const SECTION_35A_CREDIT_RATE = 0.2;

export interface DeductibleExpensesFormulaInputs {
  /** Annual work-related expenses (§ 9 EStG) across the household. */
  readonly werbungskostenAnnual: EuroAmount;
  /** Number of employed partners claiming the § 9a EStG lump sum (default 2 for joint couples). */
  readonly employedPartnersCount?: number;
  /** Per-partner § 9a EStG lump-sum deduction threshold (defaults to €1,230). */
  readonly employeeLumpSumPerPartner?: EuroAmount;
  /** Additional deductible special expenses (§ 10 EStG: donations, extra eligible deductions). */
  readonly sonderausgabenAnnual: EuroAmount;
  /** Eligible annual invoiced labor for household-related services (§ 35a Abs. 2 EStG). */
  readonly householdServicesLaborAnnual: EuroAmount;
  /** Eligible annual invoiced labor for home craftsmen/tradespeople (§ 35a Abs. 3 EStG). */
  readonly craftsmenLaborAnnual: EuroAmount;
  /** Estimated marginal income tax rate applied to taxable-income deductions (0..0.475). */
  readonly marginalTaxRate: PercentageRate;
}

export interface DeductibleExpensesFormulaResult {
  /** Combined § 9a lump-sum threshold already included in standard payroll/tax models. */
  readonly combinedLumpSumThreshold: EuroAmount;
  /** Only work expenses strictly exceeding the § 9a threshold reduce taxable income further. */
  readonly excessWerbungskosten: EuroAmount;
  /** Total additional taxable-income deduction (excess Werbungskosten + Sonderausgaben). */
  readonly totalTaxBaseDeduction: EuroAmount;
  /** Estimated annual income-tax savings from taxable-income deductions. */
  readonly estimatedDeductionTaxSavings: EuroAmount;
  /** Direct 20% § 35a Abs. 2 EStG tax credit (capped at €4,000/yr). */
  readonly credit35aHousehold: EuroAmount;
  /** Direct 20% § 35a Abs. 3 EStG tax credit (capped at €1,200/yr). */
  readonly credit35aCraftsmen: EuroAmount;
  /** Total direct § 35a tax credits reducing annual tax payable euro-for-euro. */
  readonly totalDirectTaxCredits: EuroAmount;
  /** Combined estimated annual tax-refund benefit from entered deductible expenses & credits. */
  readonly totalEstimatedAnnualTaxRefund: EuroAmount;
}

function roundToCents(value: number): EuroAmount {
  return toEuroAmount(Math.round(Math.max(0, value) * 100) / 100);
}

/**
 * Pure statutory formula estimating the annual income-tax refund effect of user-entered
 * tax-deductible expenses (§§ 9, 9a, 10 EStG) and direct household/craftsmen tax credits (§ 35a EStG).
 */
export function evaluateDeductibleExpensesFormula(
  inputs: DeductibleExpensesFormulaInputs,
): DeductibleExpensesFormulaResult {
  const partners = Math.max(0, Math.min(2, Math.trunc(inputs.employedPartnersCount ?? 2)));
  const lumpSumPerPartner = inputs.employeeLumpSumPerPartner ?? DEFAULT_EMPLOYEE_LUMP_SUM_EUR;
  const combinedLumpSumThreshold = roundToCents(partners * lumpSumPerPartner);

  const excessWerbungskosten = roundToCents(
    Math.max(0, inputs.werbungskostenAnnual - combinedLumpSumThreshold),
  );
  const totalTaxBaseDeduction = roundToCents(
    excessWerbungskosten + Math.max(0, inputs.sonderausgabenAnnual),
  );
  const clampedMarginalRate = Math.max(0, Math.min(0.475, inputs.marginalTaxRate));
  const estimatedDeductionTaxSavings = roundToCents(
    totalTaxBaseDeduction * clampedMarginalRate,
  );

  const credit35aHousehold = roundToCents(
    Math.min(
      DEFAULT_HOUSEHOLD_SERVICES_CREDIT_CAP_EUR,
      Math.max(0, inputs.householdServicesLaborAnnual) * SECTION_35A_CREDIT_RATE,
    ),
  );
  const credit35aCraftsmen = roundToCents(
    Math.min(
      DEFAULT_CRAFTSMEN_CREDIT_CAP_EUR,
      Math.max(0, inputs.craftsmenLaborAnnual) * SECTION_35A_CREDIT_RATE,
    ),
  );
  const totalDirectTaxCredits = roundToCents(credit35aHousehold + credit35aCraftsmen);
  const totalEstimatedAnnualTaxRefund = roundToCents(
    estimatedDeductionTaxSavings + totalDirectTaxCredits,
  );

  return Object.freeze({
    combinedLumpSumThreshold,
    excessWerbungskosten,
    totalTaxBaseDeduction,
    estimatedDeductionTaxSavings,
    credit35aHousehold,
    credit35aCraftsmen,
    totalDirectTaxCredits,
    totalEstimatedAnnualTaxRefund,
  });
}
