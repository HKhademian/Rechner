import {
  type FormulaEvaluationAudit,
  type StatutoryCalculationContext,
  type StatutoryContextOptions,
  type CalculationTier,
  type FormulaId,
} from "#engine/formulas/types";
import {
  type LawId,
} from "#engine/laws/types";
import {
  attemptParameterModification,
  resolveParameterForYear,
} from "#engine/parameters/registry";
import {
  type ParameterId,
  type ResolvedParameterValue,
} from "#engine/parameters/types";
import {
  DEFAULT_TAX_YEAR,
} from "#engine/tax/taxRules";
import {
  type EuroAmount,
  type FullCalendarYear,
  type PercentageRate,
  toEuroAmount,
  toFullCalendarYear,
  toPercentageRate,
} from "#engine/types";

/**
 * Validates any supplied custom parameter overrides against the central parameter mutability
 * policy (`StatutoryFixed` and `YearIndexed` overrides throw explicitly) and freezes an
 * immutable `StatutoryCalculationContext` snapshot for the requested calendar year.
 */
export function createStatutoryCalculationContext(
  options: StatutoryContextOptions = {},
): StatutoryCalculationContext {
  const calendarYear = toFullCalendarYear(options.calendarYear ?? DEFAULT_TAX_YEAR);
  const rawOverrides = options.customParameterOverrides ?? {};
  const validatedOverrides: Partial<Record<ParameterId, number>> = {};

  for (const [rawId, rawValue] of Object.entries(rawOverrides)) {
    if (rawValue === undefined) {
      continue;
    }
    const parameterId = rawId as ParameterId;
    const verification = attemptParameterModification(parameterId, rawValue);
    if (!verification.ok) {
      throw new TypeError(verification.flag.message);
    }
    validatedOverrides[parameterId] = verification.value;
  }

  const frozenOverrides = Object.freeze({ ...validatedOverrides });
  const cache = new Map<ParameterId, ResolvedParameterValue>();

  const resolveParameter = (id: ParameterId): ResolvedParameterValue => {
    const cached = cache.get(id);
    if (cached) {
      return cached;
    }
    const resolved = resolveParameterForYear(id, calendarYear, frozenOverrides);
    cache.set(id, resolved);
    return resolved;
  };

  const overriddenParameterIds = Object.freeze(
    (Object.keys(frozenOverrides) as ParameterId[]).filter(
      (id) => resolveParameter(id).overridden,
    ),
  );

  return Object.freeze({
    calendarYear,
    customParameterOverrides: frozenOverrides,
    overriddenParameterIds,
    resolveParameter,
    getParameterNumber: (id: ParameterId): number => resolveParameter(id).activeValue,
    getParameterEuroAmount: (id: ParameterId): EuroAmount => toEuroAmount(resolveParameter(id).activeValue),
    getParameterPercentageRate: (id: ParameterId): PercentageRate => toPercentageRate(resolveParameter(id).activeValue),
  });
}

/**
 * Builds an immutable `FormulaEvaluationAudit` from a resolved list of parameters,
 * collecting governing `LawId`s and flagging whether custom overrides or year projection applied.
 */
export function buildFormulaEvaluationAudit(
  formulaId: FormulaId,
  tier: CalculationTier,
  context: StatutoryCalculationContext,
  consumedParameterIds: readonly ParameterId[],
  extraLawIds: readonly LawId[] = [],
): FormulaEvaluationAudit {
  const lawIds = new Set<LawId>(extraLawIds);
  const projectedFromYears = new Set<FullCalendarYear>();
  let customOverrideApplied = false;

  for (const paramId of consumedParameterIds) {
    const resolved = context.resolveParameter(paramId);
    for (const lawId of resolved.definition.lawIds) {
      lawIds.add(lawId);
    }
    if (resolved.overridden) {
      customOverrideApplied = true;
    }
    if (resolved.projected && resolved.sourceYear !== undefined) {
      projectedFromYears.add(resolved.sourceYear);
    }
  }

  return Object.freeze({
    formulaId,
    tier,
    calendarYear: context.calendarYear,
    governingLawIds: Object.freeze([...lawIds]),
    consumedParameterIds: Object.freeze([...consumedParameterIds]),
    customOverrideApplied,
    projectedFromYears: Object.freeze([...projectedFromYears]),
  });
}
