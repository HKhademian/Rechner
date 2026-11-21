/**
 * German Elterngeld & Parental Leave 5-Year Financial Simulator - Allowance Variant Adapters
 *
 * Delegates all mathematical budget and Basis <-> Plus conversion calculations to
 * Tier 1 pure mathematical formulas (`parentalBenefitFormulas.ts`) and Tier 2
 * context-aware evaluators (`statutoryEvaluators.ts`).
 */

import {
  type ParentalAllowanceBudgetFormulaResult,
  evaluateAllowanceVariantMonthConversionFormula,
  evaluateParentalAllowanceBudgetFormula,
} from "#engine/formulas/pure/parentalBenefitFormulas";
import {
  evaluateAllowanceVariantConversionInContext,
  evaluateParentalAllowanceBudgetInContext,
} from "#engine/formulas/context/statutoryEvaluators";
import {
  type FormulaEvaluationResult,
  type StatutoryCalculationContext,
} from "#engine/formulas/types";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  type MonthDuration,
  type PregnancyAction,
  AllowancePlanMode,
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

export type AllowanceBudgetSummary = ParentalAllowanceBudgetFormulaResult;

/** Resolves the mother's ordinary parental allowance plan mode (defaults to Plus for legacy payloads). */
export function resolveMotherAllowancePlanMode(
  pregnancy: PregnancyAction,
): AllowancePlanMode {
  if (pregnancy.motherAllowancePlanMode !== undefined) {
    return pregnancy.motherAllowancePlanMode;
  }
  if (pregnancy.motherAllowanceVariant === ElterngeldVariant.Basis) {
    return AllowancePlanMode.Basis;
  }
  return AllowancePlanMode.Plus;
}

/** Resolves the father's ordinary parental allowance plan mode (defaults to Plus for legacy payloads). */
export function resolveFatherAllowancePlanMode(
  pregnancy: PregnancyAction,
): AllowancePlanMode {
  if (pregnancy.fatherAllowancePlanMode !== undefined) {
    return pregnancy.fatherAllowancePlanMode;
  }
  if (pregnancy.fatherAllowanceVariant === ElterngeldVariant.Basis) {
    return AllowancePlanMode.Basis;
  }
  return AllowancePlanMode.Plus;
}

/** Resolves the mother's ordinary parental allowance variant (defaults to ElterngeldPlus). */
export function resolveMotherAllowanceVariant(
  pregnancy: PregnancyAction,
): ElterngeldVariant {
  if (pregnancy.motherAllowancePlanMode === AllowancePlanMode.Basis) {
    return ElterngeldVariant.Basis;
  }
  if (pregnancy.motherAllowancePlanMode === AllowancePlanMode.Plus) {
    return ElterngeldVariant.Plus;
  }
  return pregnancy.motherAllowanceVariant ?? ElterngeldVariant.Plus;
}

/** Resolves the father's ordinary parental allowance variant (defaults to ElterngeldPlus). */
export function resolveFatherAllowanceVariant(
  pregnancy: PregnancyAction,
): ElterngeldVariant {
  if (pregnancy.fatherAllowancePlanMode === AllowancePlanMode.Basis) {
    return ElterngeldVariant.Basis;
  }
  if (pregnancy.fatherAllowancePlanMode === AllowancePlanMode.Plus) {
    return ElterngeldVariant.Plus;
  }
  return pregnancy.fatherAllowanceVariant ?? ElterngeldVariant.Plus;
}

/** Resolves the mother's ordinary allowance month count in her selected variant via Tier 1 conversion math. */
export function resolveMotherOrdinaryMonthsCount(
  pregnancy: PregnancyAction,
  conventions: TimelineConventions = DEFAULT_TIMELINE_CONVENTIONS,
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
): MonthDuration {
  if (pregnancy.motherAllowanceMonthsCount !== undefined) {
    return pregnancy.motherAllowanceMonthsCount;
  }
  const variant = resolveMotherAllowanceVariant(pregnancy);
  if (variant === ElterngeldVariant.Basis) {
    const maxMotherBasisMonths = Math.max(
      0,
      rules.familyBasisMonths.value - conventions.maternityPostBirthMonths.value,
    );
    return evaluateAllowanceVariantMonthConversionFormula({
      currentMonths: conventions.motherOrdinaryPlusMonths.value,
      fromVariant: ElterngeldVariant.Plus,
      toVariant: ElterngeldVariant.Basis,
      maxMonthsInTargetVariant: maxMotherBasisMonths,
      elterngeldPlusFraction: rules.plusFraction.value,
    });
  }
  return conventions.motherOrdinaryPlusMonths.value;
}

/** Resolves the mother's ordinary allowance month count directly from a Tier 2 `StatutoryCalculationContext`. */
export function resolveMotherOrdinaryMonthsCountInContext(
  pregnancy: PregnancyAction,
  context: StatutoryCalculationContext,
): MonthDuration {
  if (pregnancy.motherAllowanceMonthsCount !== undefined) {
    return pregnancy.motherAllowanceMonthsCount;
  }
  const defaultPlusMonths = toMonthDuration(
    context.getParameterNumber(ParameterId.Convention_MotherOrdinaryPlusMonths),
  );
  const variant = resolveMotherAllowanceVariant(pregnancy);
  if (variant === ElterngeldVariant.Basis) {
    const maxMotherBasisMonths = Math.max(
      0,
      context.getParameterNumber(ParameterId.Benefit_FamilyBasisMonths) -
        context.getParameterNumber(ParameterId.Convention_MaternityPostBirthMonths),
    );
    return evaluateAllowanceVariantConversionInContext(
      {
        currentMonths: defaultPlusMonths,
        fromVariant: ElterngeldVariant.Plus,
        toVariant: ElterngeldVariant.Basis,
        maxMonthsInTargetVariant: maxMotherBasisMonths,
      },
      context,
    ).value;
  }
  return defaultPlusMonths;
}

/** Delegates BEEG §§ 4, 4a, 4b budget evaluation to Tier 1 pure mathematics with explicit rule constants. */
export function computeAllowanceBudgetSummary(
  pregnancy: PregnancyAction,
  conventions: TimelineConventions = DEFAULT_TIMELINE_CONVENTIONS,
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
): AllowanceBudgetSummary {
  return evaluateParentalAllowanceBudgetFormula({
    motherVariant: resolveMotherAllowanceVariant(pregnancy),
    fatherVariant: resolveFatherAllowanceVariant(pregnancy),
    motherOrdinaryMonths: resolveMotherOrdinaryMonthsCount(pregnancy, conventions, rules),
    fatherOrdinaryMonths: pregnancy.fatherPartnerMonthsCount,
    maternityPostBirthMonths: conventions.maternityPostBirthMonths.value,
    partnershipBonusMonths: conventions.partnershipBonusMonths.value,
    familyBasisMonths: rules.familyBasisMonths.value,
    additionalPartnerBasisMonths: rules.additionalPartnerBasisMonths.value,
    minimumParentClaimMonths: rules.minimumParentClaimMonths.value,
    elterngeldPlusFraction: rules.plusFraction.value,
  });
}

/** Evaluates a pregnancy's BEEG §§ 4, 4a, 4b budget through Tier 2 context-aware statutory evaluation with full audit provenance. */
export function evaluatePregnancyAllowanceBudgetInContext(
  pregnancy: PregnancyAction,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<AllowanceBudgetSummary> {
  return evaluateParentalAllowanceBudgetInContext(
    {
      motherVariant: resolveMotherAllowanceVariant(pregnancy),
      fatherVariant: resolveFatherAllowanceVariant(pregnancy),
      motherOrdinaryMonths: resolveMotherOrdinaryMonthsCountInContext(pregnancy, context),
      fatherOrdinaryMonths: pregnancy.fatherPartnerMonthsCount,
    },
    context,
  );
}

/** Delegates Basiselterngeld <-> ElterngeldPlus month conversion to Tier 1 pure mathematics. */
export function convertAllowanceMonthsOnVariantChange(
  currentMonths: MonthDuration,
  fromVariant: ElterngeldVariant,
  toVariant: ElterngeldVariant,
  maxMonthsInTargetVariant: number,
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
): MonthDuration {
  return evaluateAllowanceVariantMonthConversionFormula({
    currentMonths,
    fromVariant,
    toVariant,
    maxMonthsInTargetVariant,
    elterngeldPlusFraction: rules.plusFraction.value,
  });
}
