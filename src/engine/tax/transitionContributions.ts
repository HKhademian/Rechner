import {
  type GrossSalary,
  toGrossSalary,
  toPercentageRate,
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
  const eligible = expectedMonthlyGross > lower && expectedMonthlyGross <= upper;
  const marginal = actualMonthlyGross > 0 && expectedMonthlyGross <= lower;
  // F uses published average rates, never the employee's personal insurer supplement.
  const published = createTaxRules(rules.sourceYear);
  const p = published.parameters;
  const totalRate = 2 * (p.healthEmployeeRate.value + p.pensionEmployeeRate.value +
    p.unemploymentEmployeeRate.value + p.careEmployeeBaseRate.value) + p.healthSupplementTotalRate.value;
  const factor = toPercentageRate(Math.round(p.transitionFlatRate.value / totalRate * 10000) / 10000);
  let employeeAssessment = actualMonthlyGross;
  let totalAssessment = actualMonthlyGross;
  const reduced = eligible && actualMonthlyGross <= upper;
  if (reduced) {
    employeeAssessment = toGrossSalary(Math.max(0, upper / (upper - lower) * (actualMonthlyGross - lower)));
    totalAssessment = toGrossSalary(actualMonthlyGross <= lower ? actualMonthlyGross * factor
      : factor * lower + (upper / (upper - lower) - lower / (upper - lower) * factor) * (actualMonthlyGross - lower));
  }
  return Object.freeze({ employeeAssessment,
    totalAssessment,
    reduced,
    marginal,
    factor,
    factorSourceYear: published.sourceYear,
    thresholds });
}
