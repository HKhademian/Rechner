import {
  evaluateTransitionZoneAssessmentBasesFormula,
  evaluateTransitionZoneFactorFormula,
} from "#engine/formulas/pure/socialContributionFormulas";
import {
  type GrossSalary,
} from "#engine/types";
import {
  type TaxRules,
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  getEmploymentThresholds,
} from "#engine/tax/employmentThresholds";

/** Ordinary single-job contribution bases under SGB IV §20(2a), distinct from BEEG flat deductions.
 * Regular expected pay determines eligibility; actual monthly pay determines the bases.
 * https://www.gesetze-im-internet.de/sgb_4/__20.html
 */
export function computeTransitionContributionBases(
  actualMonthlyGross: GrossSalary,
  expectedMonthlyGross: GrossSalary,
  rules: TaxRules,
) {
  const thresholds = getEmploymentThresholds(rules.calendarYear);
  const lower = thresholds.marginal.value;
  const upper = thresholds.transition.value;
  // F uses published average rates, never the employee's personal insurer supplement.
  const published = createTaxRules(rules.sourceYear);
  const parameters = published.parameters;
  const factor = evaluateTransitionZoneFactorFormula({
    transitionFlatRate: parameters.transitionFlatRate.value,
    healthEmployeeRate: parameters.healthEmployeeRate.value,
    healthSupplementTotalRate: parameters.healthSupplementTotalRate.value,
    pensionEmployeeRate: parameters.pensionEmployeeRate.value,
    unemploymentEmployeeRate: parameters.unemploymentEmployeeRate.value,
    careEmployeeBaseRate: parameters.careEmployeeBaseRate.value,
  });
  const bases = evaluateTransitionZoneAssessmentBasesFormula({
    actualMonthlyGross,
    expectedMonthlyGross,
    marginalEarningsLimitMonthly: lower,
    transitionZoneCeilingMonthly: upper,
    transitionZoneFactor: factor,
  });

  return Object.freeze({
    employeeAssessment: bases.employeeAssessmentBase,
    totalAssessment: bases.totalAssessmentBase,
    reduced: bases.isReducedTransitionZone,
    marginal: bases.isMarginalEmployment,
    factor,
    factorSourceYear: published.sourceYear,
    thresholds,
  });
}
