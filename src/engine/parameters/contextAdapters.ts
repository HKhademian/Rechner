import {
  type TimelineConventions,
  createTimelineConventions,
} from "#engine/config/timelineConventions";
import {
  type StatutoryCalculationContext,
} from "#engine/formulas/types";
import {
  TAX_KEY_TO_PARAMETER_ID,
} from "#engine/parameters/registry";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  type TaxParameters,
  type TaxRules,
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  type FullCalendarYear,
  type InflationAssumptionsConfig,
  toPercentageRate,
} from "#engine/types";

/**
 * Extracts validated `Customizable` tax rule overrides (such as personal health-insurer
 * supplementary rate) from a Tier 2 `StatutoryCalculationContext` for `createTaxRules`.
 */
export function extractTaxRuleOverridesFromContext(
  context: StatutoryCalculationContext,
): Partial<Record<keyof TaxParameters, number>> {
  const overrides: Partial<Record<keyof TaxParameters, number>> = {};
  const entries = Object.entries(TAX_KEY_TO_PARAMETER_ID) as readonly (readonly [keyof TaxParameters, ParameterId])[];

  for (const [taxKey, parameterId] of entries) {
    if (Object.hasOwn(context.customParameterOverrides, parameterId)) {
      overrides[taxKey] = context.getParameterNumber(parameterId);
    }
  }
  return overrides;
}

/**
 * Builds a complete `TaxRules` snapshot for `calendarYear` (defaulting to
 * `context.calendarYear`) applying any validated customizable overrides held in `context`.
 */
export function createTaxRulesFromContext(
  context: StatutoryCalculationContext,
  calendarYear: FullCalendarYear = context.calendarYear,
): TaxRules {
  return createTaxRules(
    calendarYear,
    extractTaxRuleOverridesFromContext(context),
  );
}

/**
 * Builds `TimelineConventions` (MuSchG buffers, ordinary ElterngeldPlus months, and
 * Partnerschaftsbonus months) from a Tier 2 `StatutoryCalculationContext`.
 */
export function createTimelineConventionsFromContext(
  context: StatutoryCalculationContext,
): TimelineConventions {
  return createTimelineConventions({
    maternityPreBirthMonths: context.getParameterNumber(ParameterId.Convention_MaternityPreBirthMonths),
    maternityPostBirthMonths: context.getParameterNumber(ParameterId.Convention_MaternityPostBirthMonths),
    motherOrdinaryPlusMonths: context.getParameterNumber(ParameterId.Convention_MotherOrdinaryPlusMonths),
    partnershipBonusMonths: context.getParameterNumber(ParameterId.Convention_PartnershipBonusMonths),
  });
}

/**
 * Builds `InflationAssumptionsConfig` from Tier 2 `Planning_*` parameters in `context`
 * combined with the caller's opt-in flag for future-year bracket indexing.
 */
export function createInflationAssumptionsFromContext(
  context: StatutoryCalculationContext,
  indexFutureTaxBrackets: boolean = false,
): InflationAssumptionsConfig {
  return Object.freeze({
    annualInflationRate: toPercentageRate(context.getParameterNumber(ParameterId.Planning_AnnualInflationRate)),
    annualWageGrowthRate: toPercentageRate(context.getParameterNumber(ParameterId.Planning_AnnualWageGrowthRate)),
    annualBracketIndexRate: toPercentageRate(context.getParameterNumber(ParameterId.Planning_AnnualBracketIndexRate)),
    indexFutureTaxBrackets,
  });
}
