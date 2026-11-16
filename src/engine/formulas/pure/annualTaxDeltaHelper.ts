import {
  computeJointTaxLiability,
} from "#engine/tax/jointAssessment";
import {
  type TaxRules,
  VERIFIED_TAX_YEARS,
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  computeAnnualIncomeTax,
  computeSolidaritySurcharge,
} from "#engine/tax/wageTax";
import {
  type EuroAmount,
  type FullCalendarYear,
  type PercentageRate,
  toEuroAmount,
  toFullCalendarYear,
} from "#engine/types";

export interface AnnualTaxLiabilitySnapshot {
  readonly taxableIncomeZvEEur: EuroAmount;
  readonly incomeTaxEur: EuroAmount;
  readonly solidaritySurchargeEur: EuroAmount;
  readonly churchTaxEur: EuroAmount;
  readonly totalLiabilityEur: EuroAmount;
}

export interface AnnualDeductionTaxSavingsResult {
  readonly baseline: AnnualTaxLiabilitySnapshot;
  readonly reduced: AnnualTaxLiabilitySnapshot;
  readonly appliedDeductionEur: EuroAmount;
  readonly annualTaxSavingsEur: EuroAmount;
  readonly monthlyTaxSavingsEur: EuroAmount;
}

function roundToCent(amount: number): number {
  return Math.round(amount * 100 + Number.EPSILON * amount * 100) / 100;
}

/**
 * Resolves `TaxRules` for any planning year, clamping earlier non-PAP years (e.g., 2024)
 * cleanly to the earliest verified tax-rule profile while preserving statutory lookup safety.
 */
export function resolveTaxRulesForPlanningYear(
  calendarYear: FullCalendarYear,
): TaxRules {
  const minVerifiedYear = VERIFIED_TAX_YEARS[0];
  const effectiveYear = toFullCalendarYear(Math.max(calendarYear, minVerifiedYear));
  return createTaxRules(effectiveYear);
}

/**
 * Evaluates annual German income tax (§ 32a / § 26b EStG), solidarity surcharge (SolzG),
 * and church tax for a given taxable income (`zvE`).
 */
export function computeAnnualTaxAndSurchargeLiability(params: {
  readonly taxableIncomeZvEEur: EuroAmount;
  readonly isMarriedJointAssessment: boolean;
  readonly churchTaxRate: PercentageRate;
  readonly rules: TaxRules;
}): AnnualTaxLiabilitySnapshot {
  const clampedZvE = toEuroAmount(Math.max(0, Math.floor(params.taxableIncomeZvEEur)));
  if (params.isMarriedJointAssessment) {
    const joint = computeJointTaxLiability(clampedZvE, 0, params.rules);
    const churchTaxEur = toEuroAmount(
      params.churchTaxRate > 0 ? Math.floor(joint.jointTax * params.churchTaxRate * 100) / 100 : 0,
    );
    return Object.freeze({
      taxableIncomeZvEEur: clampedZvE,
      incomeTaxEur: joint.jointTax,
      solidaritySurchargeEur: joint.jointSolidaritySurcharge,
      churchTaxEur,
      totalLiabilityEur: toEuroAmount(roundToCent(joint.totalTaxLiability + churchTaxEur)),
    });
  }

  const incomeTaxEur = computeAnnualIncomeTax(clampedZvE, params.rules);
  const solidaritySurchargeEur = computeSolidaritySurcharge(incomeTaxEur, false, params.rules);
  const churchTaxEur = toEuroAmount(
    params.churchTaxRate > 0 ? Math.floor(incomeTaxEur * params.churchTaxRate * 100) / 100 : 0,
  );
  return Object.freeze({
    taxableIncomeZvEEur: clampedZvE,
    incomeTaxEur,
    solidaritySurchargeEur,
    churchTaxEur,
    totalLiabilityEur: toEuroAmount(
      roundToCent(incomeTaxEur + solidaritySurchargeEur + churchTaxEur),
    ),
  });
}

/**
 * Evaluates exact annual and monthly income tax + SolZ + church tax refund generated
 * by deducting `deductionEur` from `baselineZvEEur`.
 */
export function computeAnnualDeductionTaxSavings(params: {
  readonly baselineZvEEur: EuroAmount;
  readonly deductionEur: EuroAmount;
  readonly isMarriedJointAssessment: boolean;
  readonly churchTaxRate: PercentageRate;
  readonly rules: TaxRules;
}): AnnualDeductionTaxSavingsResult {
  if (!Number.isFinite(params.baselineZvEEur) || params.baselineZvEEur < 0) {
    throw new TypeError("Baseline taxable income must be non-negative.");
  }
  if (!Number.isFinite(params.deductionEur) || params.deductionEur < 0) {
    throw new TypeError("Annual tax deduction must be non-negative.");
  }

  const baseline = computeAnnualTaxAndSurchargeLiability({
    taxableIncomeZvEEur: params.baselineZvEEur,
    isMarriedJointAssessment: params.isMarriedJointAssessment,
    churchTaxRate: params.churchTaxRate,
    rules: params.rules,
  });

  const postDeductionZvE = toEuroAmount(Math.max(0, params.baselineZvEEur - params.deductionEur));
  const reduced = computeAnnualTaxAndSurchargeLiability({
    taxableIncomeZvEEur: postDeductionZvE,
    isMarriedJointAssessment: params.isMarriedJointAssessment,
    churchTaxRate: params.churchTaxRate,
    rules: params.rules,
  });

  const annualTaxSavingsEur = toEuroAmount(
    Math.max(0, roundToCent(baseline.totalLiabilityEur - reduced.totalLiabilityEur)),
  );
  const monthlyTaxSavingsEur = toEuroAmount(roundToCent(annualTaxSavingsEur / 12));

  return Object.freeze({
    baseline,
    reduced,
    appliedDeductionEur: params.deductionEur,
    annualTaxSavingsEur,
    monthlyTaxSavingsEur,
  });
}
