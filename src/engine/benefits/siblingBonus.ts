import {
  type SimulationMonth,
  type EuroAmount,
  toEuroAmount,
  toStatutoryCitation
} from '../types';

/**
 * Sibling Bonus Determination (§ 2a BEEG)
 * Applies when at least one older sibling under 3 years (36 months) lives in the household.
 */
export interface SiblingBonusCalculation {
  readonly isEligible: boolean;
  readonly baseElterngeldPlus: EuroAmount;
  readonly siblingBonusAmount: EuroAmount;
  readonly totalElterngeldPlusWithBonus: EuroAmount;
  readonly olderChildAgeInMonths: number;
  readonly statutoryCitation: string;
}

export function computeSiblingBonus(
  baseElterngeldPlus: EuroAmount,
  olderChildBirthMonth: SimulationMonth,
  currentMonth: SimulationMonth
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
      statutoryCitation: 'BEEG § 2a (Expired: Older child ≥36M)'
    };
  }

  const baseVal = baseElterngeldPlus as number;
  // § 2a Abs. 1 & 4 BEEG: +10% with a statutory minimum of +€75,00/month for ElterngeldPlus
  const bonusAddition = Math.max(75, Math.round(baseVal * 0.10));
  // Total capped at statutory max €900
  const total = Math.min(900, baseVal + bonusAddition);

  return {
    isEligible: true,
    baseElterngeldPlus,
    siblingBonusAmount: toEuroAmount(bonusAddition),
    totalElterngeldPlusWithBonus: toEuroAmount(total),
    olderChildAgeInMonths,
    statutoryCitation: 'BEEG § 2a (*Geschwisterbonus* +10% / min. +75 €)'
  };
}
