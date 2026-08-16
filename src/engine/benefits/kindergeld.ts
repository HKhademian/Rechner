import {
  type EuroAmount,
  toEuroAmount,
  toStatutoryCitation
} from '../types.ts';

/**
 * Statutory Child Benefit Calculation (§ 66 EStG)
 */
export interface KindergeldEntitlement {
  readonly childrenCount: number;
  readonly ratePerChild: EuroAmount;
  readonly totalMonthlyKindergeld: EuroAmount;
  readonly statutoryCitation: string;
}

export function computeKindergeld(
  childrenCount: number,
  customRatePerChild: EuroAmount = toEuroAmount(259)
): KindergeldEntitlement {
  if (childrenCount <= 0) {
    return {
      childrenCount: 0,
      ratePerChild: customRatePerChild,
      totalMonthlyKindergeld: toEuroAmount(0),
      statutoryCitation: 'EStG § 66'
    };
  }

  const count = Math.max(0, Math.floor(childrenCount));
  const rate = customRatePerChild as number;
  const total = count * rate;

  return {
    childrenCount: count,
    ratePerChild: customRatePerChild,
    totalMonthlyKindergeld: toEuroAmount(total),
    statutoryCitation: 'EStG § 66 (*Kindergeld*)'
  };
}
