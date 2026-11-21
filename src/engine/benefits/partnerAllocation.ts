import {
  type MonthDuration,
  type SimulationMonth,
  type WorkingHours,
  ElterngeldVariant,
} from "#engine/types";
import {
  type BenefitRules,
  DEFAULT_BENEFIT_RULES,
} from "#engine/config/benefitRules";
import {
  isElterngeldHoursEligible,
} from "#engine/benefits/elterngeldPlus";

/** Count validation only: the cohort projector checks the combined parent minimum and family budget.
 * Partner counts denote months in the selected allowance variant (defaults to ElterngeldPlus).
 */
export function validatePartnerMonths(
  requested: MonthDuration,
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
  variant: ElterngeldVariant = ElterngeldVariant.Plus,
): void {
  const maximum = variant === ElterngeldVariant.Basis
    ? rules.familyBasisMonths.value
    : rules.familyBasisMonths.value / rules.plusFraction.value;
  if (!Number.isInteger(requested) || requested < 0 || requested > maximum) {
    const label = variant === ElterngeldVariant.Basis ? "Basis" : "Plus";
    throw new TypeError(`Partner ${label} months must be a whole count between 0 and ${maximum}.`);
  }
}

/** Ordinary partner payments and partnership-bonus payments use separate allocations. */
export function isOrdinaryPartnerPaymentMonth(
  month: SimulationMonth,
  firstPaymentMonth: SimulationMonth,
  requested: MonthDuration,
  weeklyHours: WorkingHours,
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
  variant: ElterngeldVariant = ElterngeldVariant.Plus,
): boolean {
  validatePartnerMonths(requested, rules, variant);
  const elapsed = month - firstPaymentMonth;
  return elapsed >= 0 && elapsed < requested && isElterngeldHoursEligible(weeklyHours, rules);
}
