import {
  type EuroAmount,
  type GrossSalary,
  type PercentageRate,
  toEuroAmount,
  toGrossSalary,
  toPercentageRate,
} from "#engine/types";

/**
 * Tier 1 Pure Mathematical Social Security & Contribution Formulas (Context-Unaware).
 *
 * Every function receives all thresholds, rates, caps, and flags explicitly as named parameters
 * with zero dependency on registries, JSON rules, stores, or calculation contexts.
 */

/**
 * Named inputs for computing the official transition-zone (Midijob) factor F (§ 20 Abs. 2 SGB IV).
 */
export interface TransitionZoneFactorFormulaInputs {
  readonly transitionFlatRate: PercentageRate;
  readonly healthEmployeeRate: PercentageRate;
  readonly healthSupplementTotalRate: PercentageRate;
  readonly pensionEmployeeRate: PercentageRate;
  readonly unemploymentEmployeeRate: PercentageRate;
  readonly careEmployeeBaseRate: PercentageRate;
}

/**
 * Named inputs for computing Midijob reduced contribution bases (§ 20 Abs. 2a SGB IV).
 */
export interface TransitionZoneAssessmentBasesFormulaInputs {
  readonly actualMonthlyGross: GrossSalary;
  readonly expectedMonthlyGross: GrossSalary;
  readonly marginalEarningsLimitMonthly: EuroAmount;
  readonly transitionZoneCeilingMonthly: EuroAmount;
  readonly transitionZoneFactor: PercentageRate;
}

/**
 * Result of Midijob assessment base evaluation.
 */
export interface TransitionZoneAssessmentBasesResult {
  readonly employeeAssessmentBase: GrossSalary;
  readonly totalAssessmentBase: GrossSalary;
  readonly isReducedTransitionZone: boolean;
  readonly isMarginalEmployment: boolean;
  readonly isEligibleExpectedIncome: boolean;
}

/**
 * Named inputs for employee health insurance contribution with separate base and supplement rounding (§ 2 BVV).
 */
export interface HealthInsuranceContributionFormulaInputs {
  readonly assessmentBase: EuroAmount;
  readonly baseHealthEmployeeRate: PercentageRate;
  readonly insurerSupplementTotalRate: PercentageRate;
}

/**
 * Named inputs for employee long-term nursing care contribution (§ 55 SGB XI).
 */
export interface CareInsuranceContributionFormulaInputs {
  readonly healthAssessmentBase: EuroAmount;
  readonly totalTransitionAssessmentBase: EuroAmount;
  readonly isReducedTransitionZone: boolean;
  readonly careBaseEmployeeRate: PercentageRate;
  readonly saxonyExtraEmployeeRate: PercentageRate;
  readonly childlessSurchargeRate: PercentageRate;
  readonly childDiscountRatePerChild: PercentageRate;
  readonly appliesSaxonyRate: boolean;
  readonly appliesChildlessSurcharge: boolean;
  readonly qualifyingDiscountChildCount: number;
}

/**
 * Result of employee care insurance contribution formula.
 */
export interface CareInsuranceContributionResult {
  readonly careContribution: EuroAmount;
  readonly effectiveCareRate: PercentageRate;
}

/**
 * Named inputs for standardized parental-allowance transition-zone social contribution base (§ 2f BEEG).
 */
export interface BenefitTransitionContributionBaseFormulaInputs {
  readonly monthlyGross: GrossSalary;
  readonly marginalEarningsLimitMonthly: EuroAmount;
  readonly transitionZoneCeilingMonthly: EuroAmount;
  readonly benefitTransitionFlatRate: PercentageRate;
  readonly standardHealthCareDeductionRate: PercentageRate;
  readonly standardPensionDeductionRate: PercentageRate;
  readonly standardUnemploymentDeductionRate: PercentageRate;
}

/**
 * Computes the transition-zone factor `F` rounded to four decimal places (§ 20 Abs. 2 SGB IV).
 */
export function evaluateTransitionZoneFactorFormula(
  inputs: Readonly<TransitionZoneFactorFormulaInputs>,
): PercentageRate {
  const totalStatutoryContributionRate =
    2 * (
      inputs.healthEmployeeRate +
      inputs.pensionEmployeeRate +
      inputs.unemploymentEmployeeRate +
      inputs.careEmployeeBaseRate
    ) +
    inputs.healthSupplementTotalRate;
  if (totalStatutoryContributionRate <= 0) {
    throw new TypeError("Total statutory contribution rate must be positive to derive transition factor F.");
  }
  return toPercentageRate(
    Math.round((inputs.transitionFlatRate / totalStatutoryContributionRate) * 10000) / 10000,
  );
}

/**
 * Evaluates employee and total assessment bases inside the § 20 Abs. 2 SGB IV transition corridor.
 */
export function evaluateTransitionZoneAssessmentBasesFormula(
  inputs: Readonly<TransitionZoneAssessmentBasesFormulaInputs>,
): TransitionZoneAssessmentBasesResult {
  const lowerLimit = inputs.marginalEarningsLimitMonthly;
  const upperCeiling = inputs.transitionZoneCeilingMonthly;
  const isEligibleExpectedIncome =
    inputs.expectedMonthlyGross > lowerLimit && inputs.expectedMonthlyGross <= upperCeiling;
  const isMarginalEmployment =
    inputs.actualMonthlyGross > 0 && inputs.expectedMonthlyGross <= lowerLimit;
  const isReducedTransitionZone =
    isEligibleExpectedIncome && inputs.actualMonthlyGross <= upperCeiling;

  let employeeAssessmentBase = inputs.actualMonthlyGross;
  let totalAssessmentBase = inputs.actualMonthlyGross;

  if (isReducedTransitionZone) {
    employeeAssessmentBase = toGrossSalary(
      Math.max(
        0,
        (upperCeiling / (upperCeiling - lowerLimit)) * (inputs.actualMonthlyGross - lowerLimit),
      ),
    );
    totalAssessmentBase = toGrossSalary(
      inputs.actualMonthlyGross <= lowerLimit
        ? inputs.actualMonthlyGross * inputs.transitionZoneFactor
        : inputs.transitionZoneFactor * lowerLimit +
          (upperCeiling / (upperCeiling - lowerLimit) -
            (lowerLimit / (upperCeiling - lowerLimit)) * inputs.transitionZoneFactor) *
            (inputs.actualMonthlyGross - lowerLimit),
    );
  }

  return Object.freeze({
    employeeAssessmentBase,
    totalAssessmentBase,
    isReducedTransitionZone,
    isMarginalEmployment,
    isEligibleExpectedIncome,
  });
}

/**
 * Computes employee monthly health insurance contribution by rounding the general share
 * and insurer-specific half-supplement share independently before summing (§ 241, § 249 SGB V, § 2 BVV).
 */
export function evaluateHealthInsuranceContributionFormula(
  inputs: Readonly<HealthInsuranceContributionFormulaInputs>,
): EuroAmount {
  const baseShare = toEuroAmount(inputs.assessmentBase * inputs.baseHealthEmployeeRate);
  const supplementShare = toEuroAmount(
    inputs.assessmentBase * (inputs.insurerSupplementTotalRate / 2),
  );
  return toEuroAmount(baseShare + supplementShare);
}

/**
 * Computes employee monthly nursing care contribution (§ 55 SGB XI, § 58 SGB XI).
 * Applies separate childless surcharge on total assessment base inside the Midijob transition zone.
 */
export function evaluateCareInsuranceContributionFormula(
  inputs: Readonly<CareInsuranceContributionFormulaInputs>,
): CareInsuranceContributionResult {
  const effectiveCareRate = toPercentageRate(
    inputs.careBaseEmployeeRate +
      (inputs.appliesSaxonyRate ? inputs.saxonyExtraEmployeeRate : 0) +
      (inputs.appliesChildlessSurcharge
        ? inputs.childlessSurchargeRate
        : -inputs.qualifyingDiscountChildCount * inputs.childDiscountRatePerChild),
  );

  const careContribution = inputs.isReducedTransitionZone
    ? toEuroAmount(
      toEuroAmount(
        inputs.healthAssessmentBase *
          (inputs.careBaseEmployeeRate +
            (inputs.appliesSaxonyRate ? inputs.saxonyExtraEmployeeRate : 0)),
      ) +
        (inputs.appliesChildlessSurcharge
          ? toEuroAmount(inputs.totalTransitionAssessmentBase * inputs.childlessSurchargeRate)
          : -toEuroAmount(
            inputs.healthAssessmentBase *
              inputs.qualifyingDiscountChildCount *
              inputs.childDiscountRatePerChild,
          )),
    )
    : toEuroAmount(inputs.healthAssessmentBase * effectiveCareRate);

  return Object.freeze({
    careContribution,
    effectiveCareRate,
  });
}

/**
 * Evaluates standardized BEEG § 2f social contribution assessment base for Minijob/Midijob pay.
 */
export function evaluateBenefitTransitionContributionBaseFormula(
  inputs: Readonly<BenefitTransitionContributionBaseFormulaInputs>,
): GrossSalary {
  if (inputs.monthlyGross === 0) {
    return inputs.monthlyGross;
  }
  const lowerLimit = inputs.marginalEarningsLimitMonthly;
  const upperCeiling = inputs.transitionZoneCeilingMonthly;
  if (inputs.monthlyGross <= lowerLimit) {
    return toGrossSalary(0);
  }
  if (inputs.monthlyGross > upperCeiling) {
    return inputs.monthlyGross;
  }
  const combinedEmployeeFlatRates =
    inputs.standardHealthCareDeductionRate +
    inputs.standardPensionDeductionRate +
    inputs.standardUnemploymentDeductionRate;
  if (combinedEmployeeFlatRates === 0) {
    return inputs.monthlyGross;
  }
  // Official BEEG guidelines § 2f.2.3: double flat employee rates, round factor F to four decimals.
  const factor =
    Math.round((inputs.benefitTransitionFlatRate / (combinedEmployeeFlatRates * 2)) * 10000) /
    10000;
  return toGrossSalary(
    factor * lowerLimit +
      (upperCeiling / (upperCeiling - lowerLimit) -
        (lowerLimit / (upperCeiling - lowerLimit)) * factor) *
        (inputs.monthlyGross - lowerLimit),
  );
}
