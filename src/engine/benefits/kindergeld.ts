/**
 * German Elterngeld & Parental Leave 5-Year Financial Simulator - Child Benefit Engine
 *
 * Implements statutory monthly child benefit (Kindergeld) calculations under § 66 EStG.
 */

import {
  type EuroAmount,
  toEuroAmount,
  toStatutoryCitation,
} from "#engine/types";
import { getDefaultPersistedState } from "#engine/storage/persistence";

/**
 * Statutory Child Benefit Entitlement Result (§ 66 EStG).
 * Encapsulates the number of qualifying children and total monthly cash benefit disbursed.
 */
export interface KindergeldEntitlement {
  /** Count of qualifying dependent children receiving benefit. */
  readonly childrenCount: number;
  /** Statutory monthly benefit rate per child in EUR (e.g. 259 € under 2025/2026 tariff). */
  readonly ratePerChild: EuroAmount;
  /** Total monthly household Kindergeld disbursement in EUR (childrenCount * ratePerChild). */
  readonly totalMonthlyKindergeld: EuroAmount;
  /** Statutory legal citation reference. */
  readonly statutoryCitation: string;
}

/**
 * Computes the total monthly household Kindergeld disbursement under § 66 EStG.
 *
 * @param childrenCount - Count of eligible dependent children.
 * @param customRatePerChild - Optional custom monthly rate per child (defaults to persisted statutory standard e.g. 259 €).
 * @returns Complete `KindergeldEntitlement` structure.
 */
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
