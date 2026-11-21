/**
 * German Elterngeld & Parental Leave 5-Year Financial Simulator - Allowance Variant & Budget Helpers
 *
 * Pure statutory helpers for resolving Basiselterngeld (§ 4 BEEG) vs. ElterngeldPlus (§ 4a BEEG)
 * variants, default ordinary month counts, and statutory family Basis-unit budgets.
 */

import {
  type MonthDuration,
  type PregnancyAction,
  ElterngeldVariant,
  toMonthDuration,
} from "#engine/types";
import {
  type BenefitRules,
  DEFAULT_BENEFIT_RULES,
} from "#engine/config/benefitRules";
import {
  type TimelineConventions,
  DEFAULT_TIMELINE_CONVENTIONS,
} from "#engine/config/timelineConventions";

export interface AllowanceBudgetSummary {
  readonly motherVariant: ElterngeldVariant;
  readonly fatherVariant: ElterngeldVariant;
  readonly motherOrdinaryMonths: MonthDuration;
  readonly fatherOrdinaryMonths: MonthDuration;
  readonly maternityBasisUnits: number;
  readonly motherBasisUnits: number;
  readonly fatherBasisUnits: number;
  readonly totalBasisUnits: number;
  readonly maxIndividualBasisUnits: number;
  readonly maxFamilyBasisUnits: number;
  readonly maxMotherOrdinaryMonths: number;
  readonly maxFatherOrdinaryMonths: number;
}

/** Resolves the mother's ordinary parental allowance variant (defaults to ElterngeldPlus). */
export function resolveMotherAllowanceVariant(
  pregnancy: PregnancyAction,
): ElterngeldVariant {
  return pregnancy.motherAllowanceVariant ?? ElterngeldVariant.Plus;
}

/** Resolves the father's ordinary parental allowance variant (defaults to ElterngeldPlus). */
export function resolveFatherAllowanceVariant(
  pregnancy: PregnancyAction,
): ElterngeldVariant {
  return pregnancy.fatherAllowanceVariant ?? ElterngeldVariant.Plus;
}

/** Resolves the mother's ordinary allowance month count in her selected variant. */
export function resolveMotherOrdinaryMonthsCount(
  pregnancy: PregnancyAction,
  conventions: TimelineConventions = DEFAULT_TIMELINE_CONVENTIONS,
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
): MonthDuration {
  if (pregnancy.motherAllowanceMonthsCount !== undefined) {
    return pregnancy.motherAllowanceMonthsCount;
  }
  if (resolveMotherAllowanceVariant(pregnancy) === ElterngeldVariant.Basis) {
    const converted = Math.round(conventions.motherOrdinaryPlusMonths.value * rules.plusFraction.value);
    const individualMax = Math.max(0, rules.familyBasisMonths.value - conventions.maternityPostBirthMonths.value);
    return toMonthDuration(Math.min(individualMax, converted));
  }
  return conventions.motherOrdinaryPlusMonths.value;
}

/** Computes statutory BEEG § 4 / § 4a Basis-unit budget utilization and per-parent limits. */
export function computeAllowanceBudgetSummary(
  pregnancy: PregnancyAction,
  conventions: TimelineConventions = DEFAULT_TIMELINE_CONVENTIONS,
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
): AllowanceBudgetSummary {
  const motherVariant = resolveMotherAllowanceVariant(pregnancy);
  const fatherVariant = resolveFatherAllowanceVariant(pregnancy);
  const motherOrdinaryMonths = resolveMotherOrdinaryMonthsCount(pregnancy, conventions, rules);
  const fatherOrdinaryMonths = pregnancy.fatherPartnerMonthsCount;
  const motherWeight = motherVariant === ElterngeldVariant.Basis ? 1 : rules.plusFraction.value;
  const fatherWeight = fatherVariant === ElterngeldVariant.Basis ? 1 : rules.plusFraction.value;
  const maternityBasisUnits = conventions.maternityPostBirthMonths.value;
  const motherBasisUnits = maternityBasisUnits + motherOrdinaryMonths * motherWeight;
  const fatherBasisUnits = fatherOrdinaryMonths * fatherWeight;
  const totalBasisUnits = motherBasisUnits + fatherBasisUnits;
  const maxIndividualBasisUnits = rules.familyBasisMonths.value;
  const hasPartnerClaim = fatherOrdinaryMonths + conventions.partnershipBonusMonths.value >= rules.minimumParentClaimMonths.value;
  const maxFamilyBasisUnits = rules.familyBasisMonths.value + (hasPartnerClaim ? rules.additionalPartnerBasisMonths.value : 0);
  const remainingMotherBasisUnits = Math.max(
    0,
    Math.min(maxIndividualBasisUnits - maternityBasisUnits, maxFamilyBasisUnits - maternityBasisUnits - fatherBasisUnits),
  );
  const remainingFatherBasisUnits = Math.max(
    0,
    Math.min(maxIndividualBasisUnits, rules.familyBasisMonths.value + rules.additionalPartnerBasisMonths.value - motherBasisUnits),
  );
  const maxMotherOrdinaryMonths = Math.floor(remainingMotherBasisUnits / motherWeight);
  const maxFatherOrdinaryMonths = Math.floor(remainingFatherBasisUnits / fatherWeight);
  return Object.freeze({
    motherVariant,
    fatherVariant,
    motherOrdinaryMonths,
    fatherOrdinaryMonths,
    maternityBasisUnits,
    motherBasisUnits,
    fatherBasisUnits,
    totalBasisUnits,
    maxIndividualBasisUnits,
    maxFamilyBasisUnits,
    maxMotherOrdinaryMonths,
    maxFatherOrdinaryMonths,
  });
}

/**
 * Converts a parent's ordinary month count when switching between Basiselterngeld and ElterngeldPlus
 * so the resulting schedule always remains within statutory BEEG § 4 / § 4a limits.
 */
export function convertAllowanceMonthsOnVariantChange(
  currentMonths: MonthDuration,
  fromVariant: ElterngeldVariant,
  toVariant: ElterngeldVariant,
  maxMonthsInTargetVariant: number,
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
): MonthDuration {
  if (fromVariant === toVariant) {
    return toMonthDuration(Math.min(maxMonthsInTargetVariant, currentMonths));
  }
  const converted = toVariant === ElterngeldVariant.Basis
    ? Math.round(currentMonths * rules.plusFraction.value)
    : Math.round(currentMonths / rules.plusFraction.value);
  return toMonthDuration(Math.max(0, Math.min(maxMonthsInTargetVariant, converted)));
}
