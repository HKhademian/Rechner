import {
  type EuroAmount,
  toEuroAmount,
  toStatutoryCitation,
} from "#engine/types";
import { getDefaultPersistedState } from "#engine/storage/persistence";

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
  customRatePerChild?: EuroAmount,
): KindergeldEntitlement {
  const effectiveRate =
    customRatePerChild ?? getDefaultPersistedState().kindergeldPerChild;
  if (childrenCount <= 0) {
    return {
      childrenCount: 0,
      ratePerChild: effectiveRate,
      totalMonthlyKindergeld: toEuroAmount(0),
      statutoryCitation: "EStG § 66",
    };
  }

  const count = Math.max(0, Math.floor(childrenCount));
  const rate = effectiveRate as number;
  const total = count * rate;

  return {
    childrenCount: count,
    ratePerChild: effectiveRate,
    totalMonthlyKindergeld: toEuroAmount(total),
    statutoryCitation: "EStG § 66 (*Kindergeld*)",
  };
}
