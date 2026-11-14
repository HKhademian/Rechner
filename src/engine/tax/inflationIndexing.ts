import {
  evaluateIndexedTaxBracketsFormula,
} from "#engine/formulas/pure/inflationFormulas";
import {
  type TaxParameters,
  type TaxRules,
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  extractIncomeTaxTariffConstants,
} from "#engine/tax/wageTax";
import {
  type FullCalendarYear,
  type InflationAssumptionsConfig,
  type PercentageRate,
  toPercentageRate,
} from "#engine/types";

/**
 * Default macroeconomic inflation assumptions:
 * 2.0% annual CPI purchasing-power discounting, 0% nominal wage growth,
 * and 0% future bracket indexing (preserving nominal baseline parity).
 */
export function createDefaultInflationAssumptionsConfig(): InflationAssumptionsConfig {
  return Object.freeze({
    annualInflationRate: toPercentageRate(0.02),
    annualWageGrowthRate: toPercentageRate(0),
    annualBracketIndexRate: toPercentageRate(0),
    indexFutureTaxBrackets: false,
  });
}

/**
 * Resolves effective annual `TaxRules` for `calendarYear`.
 *
 * Strictly preserves published verified statutory rules unchanged (even if
 * `indexFutureTaxBrackets` is enabled) whenever `calendarYear <= sourceYear`.
 * Only for unverified projected future years (`rules.projected === true`),
 * when `indexFutureTaxBrackets` is true and `annualBracketIndexRate > 0`, shifts
 * § 32a EStG tariff bounds upward via `evaluateIndexedTaxBracketsFormula` to model
 * legislative *Inflationsausgleich* (mitigating *kalte Progression*).
 */
export function resolveEffectiveTaxRulesForYear(
  calendarYear: FullCalendarYear,
  baseOverrides?: Readonly<Partial<Record<keyof TaxParameters, number>>>,
  annualBracketIndexRate?: PercentageRate,
  indexFutureTaxBrackets: boolean = false,
): TaxRules {
  const baseRules = createTaxRules(calendarYear, baseOverrides);
  if (!indexFutureTaxBrackets || !baseRules.projected || !annualBracketIndexRate || annualBracketIndexRate <= 0) {
    return baseRules;
  }

  const yearsElapsed = Math.max(0, baseRules.calendarYear - baseRules.sourceYear);
  if (yearsElapsed === 0) {
    return baseRules;
  }

  const baseTariff = extractIncomeTaxTariffConstants(baseRules);
  const indexedTariff = evaluateIndexedTaxBracketsFormula({
    baseTariff,
    annualIndexRate: annualBracketIndexRate,
    yearsElapsed,
  });

  return createTaxRules(calendarYear, {
    ...baseOverrides,
    basicAllowance: indexedTariff.basicAllowance,
    progression1Ceiling: indexedTariff.progressionZone1Ceiling,
    progression2Ceiling: indexedTariff.progressionZone2Ceiling,
    topRateCeiling: indexedTariff.topRateCeiling,
    progression1Quadratic: indexedTariff.progressionZone1QuadraticCoefficient,
    progression1Linear: indexedTariff.progressionZone1LinearCoefficient,
    progression2Quadratic: indexedTariff.progressionZone2QuadraticCoefficient,
    progression2Linear: indexedTariff.progressionZone2LinearCoefficient,
    progression2Constant: indexedTariff.progressionZone2ConstantOffset,
    topOffset: indexedTariff.topMarginalOffset,
    highestOffset: indexedTariff.highestMarginalOffset,
  });
}
