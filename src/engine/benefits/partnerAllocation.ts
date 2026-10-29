import {
  type MonthDuration,
  type SimulationMonth,
  type WorkingHours,
} from "#engine/types";
import {
  type BenefitRules,
  DEFAULT_BENEFIT_RULES,
} from "#engine/config/benefitRules";
import {
  isElterngeldHoursEligible,
} from "#engine/benefits/elterngeldPlus";

/** Partner counts in saved scenarios denote Plus payments, not Basis equivalents. */
export function validatePartnerMonths(
  requested: MonthDuration,
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
): void {
  const maximum = rules.additionalPartnerBasisMonths.value / rules.plusFraction.value;
  if (!Number.isInteger(requested) || requested < 0 || requested > maximum || (requested > 0 && requested < rules.minimumParentClaimMonths.value)) {
    throw new TypeError(`Partner Plus months must be a whole count between 0 and ${maximum}.`);
  }
}

/** Ordinary partner payments and partnership-bonus payments use separate allocations. */
export function isOrdinaryPartnerPaymentMonth(
  month: SimulationMonth,
  firstPaymentMonth: SimulationMonth,
  requested: MonthDuration,
  weeklyHours: WorkingHours,
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
): boolean {
  validatePartnerMonths(requested, rules);
  const elapsed = month - firstPaymentMonth;
  return elapsed >= 0 && elapsed < requested && isElterngeldHoursEligible(weeklyHours, rules);
}
