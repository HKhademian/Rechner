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
  toNetSalary,
} from "#engine/types";
import {
  type BenefitRules,
  DEFAULT_BENEFIT_RULES,
} from "#engine/config/benefitRules";

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
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
): PercentageRate {
  if (preBirthNet <= 0) {
    return rules.standardReplacementRate.value;
  }

  // Low income scale (§ 2 Abs. 2: < 1.000 € -> increases up to 100%)
  if (preBirthNet < rules.lowIncomeThreshold.value) {
    const increase = (rules.lowIncomeThreshold.value - preBirthNet) * rules.rateChangePerEuro.value;
    return toPercentageRate(Math.min(rules.maximumReplacementRate.value, rules.standardReplacementRate.value + increase));
  }

  // Standard zone: 1.000 € to 1.200 €
  if (preBirthNet <= rules.rateDecreaseThreshold.value) {
    return rules.standardReplacementRate.value;
  }

  // High income scale (§ 2 Abs. 1: 1.200 € to 1.240 € -> decreases to 65%)
  if (preBirthNet < rules.minimumRateThreshold.value) {
    const decrease = (preBirthNet - rules.rateDecreaseThreshold.value) * rules.rateChangePerEuro.value;
    return toPercentageRate(Math.max(rules.minimumReplacementRate.value, rules.standardReplacementRate.value - decrease));
  }

  // > 1.240 € -> 65%
  return rules.minimumReplacementRate.value;
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
  /** No-income Basis entitlement used to establish the personal Plus ceiling. */
  readonly noIncomeBasiselterngeld: EuroAmount;
  /** Personal Plus ceiling under § 4a(2), with statutory cent rounding. */
  readonly elterngeldPlusCeiling: EuroAmount;
  /** True when the personal Plus ceiling is reached. */
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
  weeklyHours: WorkingHours,
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
): boolean {
  return weeklyHours >= 0 && weeklyHours <= rules.maximumWeeklyHours.value;
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
  motherHours: WorkingHours,
  fatherHours: WorkingHours,
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
): boolean {
  return (
    motherHours >= rules.partnershipMinimumHours.value &&
    motherHours <= rules.maximumWeeklyHours.value &&
    fatherHours >= rules.partnershipMinimumHours.value &&
    fatherHours <= rules.maximumWeeklyHours.value
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
  partTimeNetDuringLeave: NetSalary = toNetSalary(0),
  weeklyHours?: WorkingHours,
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
): ElterngeldEntitlement {
  // Statutory Exclusion (§ 1 Abs. 1 Nr. 4 BEEG):
  // Working more than 32 hours/week disqualifies from parental allowance entirely.
  if (weeklyHours !== undefined && !isElterngeldHoursEligible(weeklyHours, rules)) {
    return {
      preBirthNet,
      partTimeNet: partTimeNetDuringLeave,
      netIncomeLoss: toEuroAmount(0),
      replacementRate: toPercentageRate(0),
      basiselterngeld: toEuroAmount(0),
      elterngeldPlus: toEuroAmount(0),
      noIncomeBasiselterngeld: toEuroAmount(0),
      elterngeldPlusCeiling: toEuroAmount(0),
      isMaxCapped: false,
      isMinFloorApplied: false,
      statutoryCitation:
        `BEEG § 1 Abs. 6 (Ausschluss bei Erwerbstätigkeit > ${rules.maximumWeeklyHours.value} Wochenstunden)`,
    };
  }

  const loss = Math.max(0, preBirthNet - partTimeNetDuringLeave);
  const rate = computeStatutoryReplacementRate(preBirthNet, rules);

  const rawBenefit = toEuroAmount(loss * rate);

  // Basiselterngeld: min €300, max €1.800 (§ 2 Abs. 1 BEEG)
  const basis = toEuroAmount(Math.min(rules.basisMaximum.value, Math.max(rules.basisMinimum.value, rawBenefit)));

  // § 4a(2): the cap is personal, derived from the no-income entitlement.
  const noIncomeBasiselterngeld = toEuroAmount(Math.min(rules.basisMaximum.value, Math.max(rules.basisMinimum.value, toEuroAmount(preBirthNet * rate))));
  const elterngeldPlusCeiling = toEuroAmount(noIncomeBasiselterngeld * rules.plusFraction.value);
  const plusMinimum = toEuroAmount(rules.basisMinimum.value * rules.plusFraction.value);
  const plus = Math.min(elterngeldPlusCeiling, Math.max(plusMinimum, rawBenefit));

  const isMaxCapped = plus === elterngeldPlusCeiling;
  const isMinFloorApplied = plus === plusMinimum;

  return {
    preBirthNet,
    partTimeNet: partTimeNetDuringLeave,
    netIncomeLoss: toEuroAmount(loss),
    replacementRate: rate,
    basiselterngeld: toEuroAmount(basis),
    elterngeldPlus: toEuroAmount(plus),
    noIncomeBasiselterngeld,
    elterngeldPlusCeiling,
    isMaxCapped,
    isMinFloorApplied,
    statutoryCitation:
      "BEEG § 2 (Ersatzrate), § 4 (Basiselterngeld), § 4a (ElterngeldPlus)",
  };
}
