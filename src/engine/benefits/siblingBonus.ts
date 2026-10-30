/**
 * German Elterngeld & Parental Leave 5-Year Financial Simulator - Sibling Bonus Engine
 *
 * Implements the statutory Geschwisterbonus calculation under § 2a BEEG, adding a 10% premium
 * with configured statutory limits when an eligible older sibling lives in the household.
 */

import {
  type SimulationMonth,
  type EuroAmount,
  toEuroAmount,
} from "#engine/types";
import {
  type BenefitRules,
  DEFAULT_BENEFIT_RULES,
} from "#engine/config/benefitRules";

/**
 * Statutory Sibling Bonus Calculation Result (§ 2a BEEG).
 * Contains bonus eligibility, added premium amount, and resulting total parental allowance.
 */
export interface SiblingBonusCalculation {
  /** True through the month in which the older sibling reaches the configured age limit. */
  readonly isEligible: boolean;
  /** Baseline ElterngeldPlus amount before bonus addition in EUR. */
  readonly baseElterngeldPlus: EuroAmount;
  /** Sibling addition actually payable, with the Plus minimum under § 4a(2). */
  readonly siblingBonusAmount: EuroAmount;
  /** Total Plus benefit including the increase to its ordinary maximum under § 2a. */
  readonly totalElterngeldPlusWithBonus: EuroAmount;
  /** Current calculated age of older sibling in elapsed months. */
  readonly olderChildAgeInMonths: number;
  /** Statutory legal citation reference. */
  readonly statutoryCitation: string;
}

/**
 * Computes statutory sibling bonus under § 2a BEEG for a given simulation month.
 *
 * @param baseElterngeldPlus - Monthly un-augmented ElterngeldPlus benefit.
 * @param olderChildBirthMonth - Simulation month when older child was delivered.
 * @param currentMonth - Current simulation month being evaluated.
 * @returns Complete `SiblingBonusCalculation` structure.
 */
export function computeSiblingBonus(
  baseElterngeldPlus: EuroAmount,
  olderChildBirthMonth: SimulationMonth,
  currentMonth: SimulationMonth,
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
): SiblingBonusCalculation {
  const olderChildAgeInMonths = currentMonth - olderChildBirthMonth;

  // § 2a(3): payment includes the life-month in which the qualifying age is reached.
  // Calendar-month simulation approximates life-months; exact birth days are not modeled.
  const isEligible = baseElterngeldPlus > 0 && olderChildAgeInMonths >= 0 && olderChildAgeInMonths <= rules.siblingAgeLimitMonths.value;

  return applySiblingBonus(baseElterngeldPlus, isEligible, olderChildAgeInMonths, rules);
}

/** All other household children count, including a younger sibling born during the claim. */
export function computeHouseholdSiblingBonus(
  baseElterngeldPlus: EuroAmount,
  siblingBirthMonths: readonly SimulationMonth[],
  currentMonth: SimulationMonth,
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
): SiblingBonusCalculation {
  const ages = siblingBirthMonths.filter((birth) => birth <= currentMonth).map((birth) => currentMonth - birth);
  const qualifying = ages.some((age) => age <= rules.siblingAgeLimitMonths.value) ||
    ages.filter((age) => age <= rules.siblingMultipleAgeLimitMonths.value).length >= rules.siblingMultipleMinimumCount.value;
  return applySiblingBonus(
    baseElterngeldPlus,
    baseElterngeldPlus > 0 && qualifying,
    ages.length > 0 ? Math.min(...ages) : -1,
    rules,
  );
}

function applySiblingBonus(
  baseElterngeldPlus: EuroAmount,
  isEligible: boolean,
  olderChildAgeInMonths: number,
  rules: BenefitRules,
): SiblingBonusCalculation {
  if (!isEligible) {
    return {
      isEligible: false,
      baseElterngeldPlus,
      siblingBonusAmount: toEuroAmount(0),
      totalElterngeldPlusWithBonus: baseElterngeldPlus,
      olderChildAgeInMonths,
      statutoryCitation: "BEEG § 2a (No underlying entitlement or no qualifying sibling)",
    };
  }

  const minimum = toEuroAmount(rules.siblingMinimumBasis.value * rules.plusFraction.value);
  const bonusAddition = Math.max(minimum, toEuroAmount(baseElterngeldPlus * rules.siblingRate.value));
  const maximum = toEuroAmount(rules.basisMaximum.value * rules.plusFraction.value * (1 + rules.siblingRate.value));
  const total = toEuroAmount(Math.min(maximum, baseElterngeldPlus + bonusAddition));

  return {
    isEligible: true,
    baseElterngeldPlus,
    siblingBonusAmount: toEuroAmount(total - baseElterngeldPlus),
    totalElterngeldPlusWithBonus: toEuroAmount(total),
    olderChildAgeInMonths,
    statutoryCitation: "BEEG § 2a & § 4a Abs. 2 (Geschwisterbonus für ElterngeldPlus)",
  };
}
