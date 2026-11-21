/**
 * German Elterngeld & Parental Leave 5-Year Financial Simulator - Sibling Bonus Engine
 *
 * Implements the statutory Geschwisterbonus calculation under § 2a BEEG, adding a 10% premium
 * with configured statutory limits when an eligible older sibling lives in the household.
 */

import {
  evaluateSiblingBonusFormula,
} from "#engine/formulas/pure/parentalBenefitFormulas";
import {
  type Brand,
  type SimulationMonth,
  type EuroAmount,
  ElterngeldVariant,
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
  /** Baseline parental allowance amount before bonus addition in EUR. */
  readonly baseElterngeldPlus: EuroAmount;
  /** Sibling addition actually payable (€75 min for Basis under § 2a, €37.50 min for Plus under § 4a(2)). */
  readonly siblingBonusAmount: EuroAmount;
  /** Total parental allowance including the sibling bonus up to the variant statutory maximum (§ 2a BEEG). */
  readonly totalElterngeldPlusWithBonus: EuroAmount;
  /** Current calculated age of older sibling in elapsed months. */
  readonly olderChildAgeInMonths: number;
  /** Statutory legal citation reference. */
  readonly statutoryCitation: string;
}

/**
 * Computes statutory sibling bonus under § 2a BEEG for a given simulation month.
 */
export function computeSiblingBonus(
  baseElterngeldPlus: EuroAmount,
  olderChildBirthMonth: SimulationMonth,
  currentMonth: SimulationMonth,
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
  variant: ElterngeldVariant = ElterngeldVariant.Plus,
): SiblingBonusCalculation {
  const olderChildAgeInMonths = currentMonth - olderChildBirthMonth;
  return evaluateWithSiblingAges(baseElterngeldPlus, [olderChildAgeInMonths], rules, variant);
}

/** All other household children count, including a younger sibling born during the claim. */
export function computeHouseholdSiblingBonus(
  baseElterngeldPlus: EuroAmount,
  siblingBirthMonths: readonly SimulationMonth[],
  currentMonth: SimulationMonth,
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
  variant: ElterngeldVariant = ElterngeldVariant.Plus,
): SiblingBonusCalculation {
  return computeSiblingBonusForAges(
    baseElterngeldPlus,
    siblingBirthMonths.filter((birth) => birth <= currentMonth).map((birth) => toSiblingAgeMonths(currentMonth - birth)),
    rules,
    variant,
  );
}

export type SiblingAgeMonths = Brand<number, "SiblingAgeMonths">;

export function toSiblingAgeMonths(value: number): SiblingAgeMonths {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("Sibling age must be a non-negative whole number of months.");
  }
  return value as SiblingAgeMonths;
}

export function computeSiblingBonusForAges(
  baseElterngeldPlus: EuroAmount,
  ages: readonly SiblingAgeMonths[],
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
  variant: ElterngeldVariant = ElterngeldVariant.Plus,
): SiblingBonusCalculation {
  return evaluateWithSiblingAges(baseElterngeldPlus, ages, rules, variant);
}

function evaluateWithSiblingAges(
  baseElterngeldPlus: EuroAmount,
  siblingAgesInMonths: readonly number[],
  rules: BenefitRules,
  variant: ElterngeldVariant,
): SiblingBonusCalculation {
  const isBasis = variant === ElterngeldVariant.Basis;
  const formulaResult = evaluateSiblingBonusFormula({
    baseElterngeldPlus,
    siblingAgesInMonths,
    siblingBonusRate: rules.siblingRate.value,
    siblingMinimumBasisAmount: rules.siblingMinimumBasis.value,
    basisMaximumAmount: rules.basisMaximum.value,
    elterngeldPlusFraction: isBasis ? 1 : rules.plusFraction.value,
    singleOlderSiblingMaxAgeMonths: rules.siblingAgeLimitMonths.value,
    multipleSiblingsMaxAgeMonths: rules.siblingMultipleAgeLimitMonths.value,
    multipleSiblingsMinimumCount: rules.siblingMultipleMinimumCount.value,
  });

  return {
    isEligible: formulaResult.isEligible,
    baseElterngeldPlus: formulaResult.baseElterngeldPlus,
    siblingBonusAmount: formulaResult.siblingBonusAmount,
    totalElterngeldPlusWithBonus: formulaResult.totalElterngeldPlusWithBonus,
    olderChildAgeInMonths: formulaResult.youngestQualifyingAgeInMonths,
    statutoryCitation: formulaResult.isEligible
      ? isBasis
        ? "BEEG § 2a Abs. 1 (Geschwisterbonus für Basiselterngeld)"
        : "BEEG § 2a & § 4a Abs. 2 (Geschwisterbonus für ElterngeldPlus)"
      : "BEEG § 2a (No underlying entitlement or no qualifying sibling)",
  };
}
