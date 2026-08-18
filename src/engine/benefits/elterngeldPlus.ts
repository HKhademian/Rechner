/**
 * German Elterngeld & Parental Leave 5-Year Financial Simulator - Parental Allowance Engine
 *
 * Implements statutory calculation formulas for Basiselterngeld, ElterngeldPlus,
 * sliding-scale wage replacement rates, and part-time hours eligibility under BEEG.
 */

import {
  type NetSalary,
  type EuroAmount,
  type PercentageRate,
  type WorkingHours,
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";

/**
 * Calculates the statutory wage replacement rate under § 2 Abs. 1 & 2 BEEG.
 *
 * Statutory Sliding Scale:
 * - Net < 1.000 €: Replacement increases above 67% by +0.1% per 2 € under 1.000 € (up to 100%).
 * - Net 1.000 € to 1.200 €: Standard baseline replacement rate of 67%.
 * - Net 1.200 € to 1.240 €: Replacement decreases below 67% by -0.1% per 2 € above 1.200 € (down to 65%).
 * - Net > 1.240 €: Fixed statutory minimum replacement rate of 65%.
 *
 * @param preBirthNet - Monthly pre-birth average net income assessment baseline (§ 2b BEEG).
 * @returns Wage replacement ratio as a branded `PercentageRate` between 0.65 and 1.00.
 */
export function computeStatutoryReplacementRate(
  preBirthNet: NetSalary,
): PercentageRate {
  if (preBirthNet <= 0) {
    return toPercentageRate(0.67);
  }

  // Low income scale (§ 2 Abs. 2: < 1.000 € -> increases up to 100%)
  if (preBirthNet < 1000) {
    const increase = (1000 - preBirthNet) * 0.0005; // +0.1% per 2 €
    return toPercentageRate(Math.min(1.0, 0.67 + increase));
  }

  // Standard zone: 1.000 € to 1.200 €
  if (preBirthNet <= 1200) {
    return toPercentageRate(0.67);
  }

  // High income scale (§ 2 Abs. 1: 1.200 € to 1.240 € -> decreases to 65%)
  if (preBirthNet < 1240) {
    const decrease = (preBirthNet - 1200) * 0.0005; // -0.1% per 2 €
    return toPercentageRate(Math.max(0.65, 0.67 - decrease));
  }

  // > 1.240 € -> 65%
  return toPercentageRate(0.65);
}

/**
 * Statutory Parental Allowance Entitlement Determination Result (§§ 2, 4, 4a BEEG).
 * Contains computed monthly benefits for both Basiselterngeld and ElterngeldPlus.
 */
export interface ElterngeldEntitlement {
  /** Monthly pre-birth synthetic net income baseline (§ 2b, § 2c BEEG) in EUR. */
  readonly preBirthNet: NetSalary;
  /** Monthly part-time net take-home income earned during parental leave in EUR. */
  readonly partTimeNet: NetSalary;
  /** Net monthly income loss suffered due to parental leave in EUR (preBirthNet - partTimeNet). */
  readonly netIncomeLoss: EuroAmount;
  /** Statutory wage replacement rate applied (0.65..1.00) as a branded `PercentageRate`. */
  readonly replacementRate: PercentageRate;
  /** Monthly full Basiselterngeld entitlement in EUR (min €300, max €1.800 under § 2 Abs. 1 BEEG). */
  readonly basiselterngeld: EuroAmount;
  /** Monthly ElterngeldPlus entitlement in EUR (min €150, max €900 under § 4a BEEG). */
  readonly elterngeldPlus: EuroAmount;
  /** Boolean flag indicating whether the statutory maximum benefit cap was reached (€1.800/€900). */
  readonly isMaxCapped: boolean;
  /** Boolean flag indicating whether the statutory minimum benefit floor was applied (€300/€150). */
  readonly isMinFloorApplied: boolean;
  /** Statutory legal citations governing the computation. */
  readonly statutoryCitation: string;
}

/**
 * Evaluates weekly working hours eligibility for parental allowance under § 1 Abs. 1 Nr. 4 BEEG.
 * Parental allowance is strictly restricted to parents working <= 32 hours per week.
 *
 * @param weeklyHours - Contractual weekly working hours during parental leave.
 * @returns True if hours are within the statutory 0..32 hours/week window; false if disqualified.
 */
export function isElterngeldHoursEligible(
  weeklyHours: WorkingHours | number,
): boolean {
  return weeklyHours >= 0 && weeklyHours <= 32;
}

/**
 * Evaluates statutory Partnerschaftsbonus eligibility under § 4b BEEG.
 * Both parents must simultaneously work between 24 and 32 hours per week in consecutive months.
 *
 * @param motherHours - Mother's weekly employment hours.
 * @param fatherHours - Father's weekly employment hours.
 * @returns True if both parents concurrently satisfy the 24..32 hours/week criterion.
 */
export function isPartnerschaftsbonusEligible(
  motherHours: WorkingHours | number,
  fatherHours: WorkingHours | number,
): boolean {
  return (
    motherHours >= 24 &&
    motherHours <= 32 &&
    fatherHours >= 24 &&
    fatherHours <= 32
  );
}

/**
 * Computes monthly Basiselterngeld and ElterngeldPlus benefit amounts based on pre-birth net income,
 * post-birth part-time income, and weekly working hours under §§ 2, 4, 4a BEEG.
 *
 * @param preBirthNet - Monthly pre-birth average net income assessment baseline.
 * @param partTimeNetDuringLeave - Monthly net income earned during parental leave (defaults to 0).
 * @param weeklyHours - Weekly employment hours during leave (exceeding 32h zeroes out entitlement).
 * @returns Complete `ElterngeldEntitlement` specification with caps and statutory citations.
 */
export function computeElterngeldBenefits(
  preBirthNet: NetSalary,
  partTimeNetDuringLeave: NetSalary = 0 as NetSalary,
  weeklyHours?: WorkingHours | number,
): ElterngeldEntitlement {
  // Statutory Exclusion (§ 1 Abs. 1 Nr. 4 BEEG):
  // Working more than 32 hours/week disqualifies from parental allowance entirely.
  if (weeklyHours !== undefined && weeklyHours > 32) {
    return {
      preBirthNet,
      partTimeNet: partTimeNetDuringLeave,
      netIncomeLoss: toEuroAmount(0),
      replacementRate: toPercentageRate(0),
      basiselterngeld: toEuroAmount(0),
      elterngeldPlus: toEuroAmount(0),
      isMaxCapped: false,
      isMinFloorApplied: false,
      statutoryCitation:
        "BEEG § 1 Abs. 1 Nr. 4 (Ausschluss bei Erwerbstätigkeit > 32 Wochenstunden)",
    };
  }

  const loss = Math.max(0, preBirthNet - partTimeNetDuringLeave);
  const rate = computeStatutoryReplacementRate(preBirthNet);

  const rawBenefit = loss * rate;

  // Basiselterngeld: min €300, max €1.800 (§ 2 Abs. 1 BEEG)
  const basis = Math.min(1800, Math.max(300, Math.round(rawBenefit)));

  // ElterngeldPlus: min €150, max €900 (§ 4a BEEG - exactly 50% of monthly full entitlement cap)
  const plus = Math.min(900, Math.max(150, Math.round(rawBenefit)));

  const isMaxCapped = plus === 900;
  const isMinFloorApplied = plus === 150;

  return {
    preBirthNet,
    partTimeNet: partTimeNetDuringLeave,
    netIncomeLoss: toEuroAmount(loss),
    replacementRate: rate,
    basiselterngeld: toEuroAmount(basis),
    elterngeldPlus: toEuroAmount(plus),
    isMaxCapped,
    isMinFloorApplied,
    statutoryCitation:
      "BEEG § 2 (Ersatzrate), § 4 (Basiselterngeld), § 4a (ElterngeldPlus)",
  };
}
