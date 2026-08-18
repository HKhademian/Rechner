/**
 * German Elterngeld & Parental Leave 5-Year Financial Simulator - Sibling Bonus Engine
 *
 * Implements the statutory Geschwisterbonus calculation under § 2a BEEG, adding a 10% premium
 * (minimum +€75/month for ElterngeldPlus) when at least one older sibling under 3 years resides in the household.
 */

import {
  type SimulationMonth,
  type EuroAmount,
  toEuroAmount,
} from "#engine/types";

/**
 * Statutory Sibling Bonus Calculation Result (§ 2a BEEG).
 * Contains bonus eligibility, added premium amount, and resulting total parental allowance.
 */
export interface SiblingBonusCalculation {
  /** True if older sibling is currently under 36 months of age (§ 2a Abs. 1 BEEG). */
  readonly isEligible: boolean;
  /** Baseline ElterngeldPlus amount before bonus addition in EUR. */
  readonly baseElterngeldPlus: EuroAmount;
  /** Sibling bonus addition in EUR (+10% of base, statutory minimum +€75/mo under § 2a Abs. 4 BEEG). */
  readonly siblingBonusAmount: EuroAmount;
  /** Total ElterngeldPlus benefit including bonus in EUR (capped at statutory ceiling €900/mo). */
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
): SiblingBonusCalculation {
  const current = currentMonth as number;
  const olderBirth = olderChildBirthMonth as number;

  const olderChildAgeInMonths = current - olderBirth;

  // § 2a Abs. 1 BEEG: Eligible until older sibling turns 36 months (3rd birthday)
  const isEligible = olderChildAgeInMonths >= 0 && olderChildAgeInMonths < 36;

  if (!isEligible) {
    return {
      isEligible: false,
      baseElterngeldPlus,
      siblingBonusAmount: toEuroAmount(0),
      totalElterngeldPlusWithBonus: baseElterngeldPlus,
      olderChildAgeInMonths,
      statutoryCitation: "BEEG § 2a (Expired: Older child ≥36M)",
    };
  }

  const baseVal = baseElterngeldPlus as number;
  // § 2a Abs. 1 & 4 BEEG: +10% with a statutory minimum of +€75,00/month for ElterngeldPlus
  const bonusAddition = Math.max(75, Math.round(baseVal * 0.1));
  // Total capped at statutory max €900
  const total = Math.min(900, baseVal + bonusAddition);

  return {
    isEligible: true,
    baseElterngeldPlus,
    siblingBonusAmount: toEuroAmount(bonusAddition),
    totalElterngeldPlusWithBonus: toEuroAmount(total),
    olderChildAgeInMonths,
    statutoryCitation: "BEEG § 2a (*Geschwisterbonus* +10% / min. +75 €)",
  };
}
