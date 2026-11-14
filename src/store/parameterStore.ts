import {
  type LawId,
} from "#engine/laws/types";
import {
  attemptParameterModification,
  getParametersByLaw,
  resolveParameterForYear,
  searchParameters,
} from "#engine/parameters/registry";
import {
  type ParameterDomain,
  type ParameterId,
  type ParameterModificationFlag,
  type ParameterModificationResult,
  type ParameterMutability,
  type ResolvedParameterValue,
} from "#engine/parameters/types";
import {
  DEFAULT_TAX_YEAR,
} from "#engine/tax/taxRules";
import {
  type FullCalendarYear,
  toFullCalendarYear,
} from "#engine/types";
import {
  computed,
  signal,
} from "@preact/signals";

/** Active calendar year used to observe and resolve year-indexed statutory parameters. */
export const activeParameterYear = signal<FullCalendarYear>(DEFAULT_TAX_YEAR);

/** User-customized parameter overrides (only `Customizable` parameters are permitted). */
export const customParameterOverrides = signal<Readonly<Partial<Record<ParameterId, number>>>>({});

/** Optional domain filter inside the Parameter Observer & Editor UI. */
export const activeParameterDomainFilter = signal<ParameterDomain | undefined>(undefined);

/** Optional mutability filter inside the Parameter Observer & Editor UI. */
export const activeParameterMutabilityFilter = signal<ParameterMutability | undefined>(undefined);

/** Search query inside the Parameter Observer & Editor UI. */
export const activeParameterSearchQuery = signal<string>("");

/** Most recent flag raised when an unmodifiable or out-of-bounds edit was attempted. */
export const lastParameterModificationFlag = signal<ParameterModificationFlag | null>(null);

/** Audit trail of raised statutory/validation flags (newest first, max 10). */
export const parameterModificationFlagHistory = signal<readonly ParameterModificationFlag[]>([]);

/** Complete list of all parameters resolved for `activeParameterYear` and active overrides. */
export const allResolvedParameters = computed<readonly ResolvedParameterValue[]>(() =>
  searchParameters(
    "",
    { year: activeParameterYear.value },
    customParameterOverrides.value,
  ));

/** Filtered list of parameters matching the active query, domain, and mutability filters. */
export const filteredResolvedParameters = computed<readonly ResolvedParameterValue[]>(() =>
  searchParameters(
    activeParameterSearchQuery.value,
    {
      domain: activeParameterDomainFilter.value,
      mutability: activeParameterMutabilityFilter.value,
      year: activeParameterYear.value,
    },
    customParameterOverrides.value,
  ));

/** Number of customizable parameters currently overridden away from their baseline default. */
export const activeParameterOverrideCount = computed<number>(() =>
  allResolvedParameters.value.filter((item) => item.overridden).length);

/** Switches the active calendar year used for year-indexed statutory parameter resolution. */
export function setParameterYear(year: FullCalendarYear): void {
  activeParameterYear.value = toFullCalendarYear(year);
}

/** Updates the active domain filter in the unified parameter observer. */
export function setParameterDomainFilter(domain: ParameterDomain | undefined): void {
  activeParameterDomainFilter.value = domain;
}

/** Updates the active mutability filter in the unified parameter observer. */
export function setParameterMutabilityFilter(mutability: ParameterMutability | undefined): void {
  activeParameterMutabilityFilter.value = mutability;
}

/** Updates the search query in the unified parameter observer. */
export function setParameterSearchQuery(query: string): void {
  activeParameterSearchQuery.value = query;
}

/**
 * Attempts to modify parameter `id` to `nextValue`.
 *
 * - If `id` is `Customizable` and within bounds, persists the override (or clears if equal to baseline).
 * - If `id` is `StatutoryFixed` or `YearIndexed` (or out of bounds), leaves values unchanged and
 *   raises `lastParameterModificationFlag` with the statutory rationale and governing `LawId`s.
 */
export function modifyParameterValue(
  id: ParameterId,
  nextValue: number,
): ParameterModificationResult {
  const result = attemptParameterModification(id, nextValue);
  if (!result.ok) {
    lastParameterModificationFlag.value = result.flag;
    parameterModificationFlagHistory.value = [
      result.flag,
      ...parameterModificationFlagHistory.value,
    ].slice(0, 10);
    return result;
  }

  const current = resolveParameterForYear(
    id,
    activeParameterYear.value,
    customParameterOverrides.value,
  );
  const nextOverrides: Partial<Record<ParameterId, number>> = {
    ...customParameterOverrides.value,
  };
  if (result.value === current.baselineValue) {
    delete nextOverrides[id];
  }
  else {
    nextOverrides[id] = result.value;
  }
  customParameterOverrides.value = nextOverrides;

  if (lastParameterModificationFlag.value?.parameterId === id) {
    lastParameterModificationFlag.value = null;
  }
  return result;
}

/**
 * Explicitly raises a statutory lock flag when inspecting or testing modification
 * on a locked (`StatutoryFixed` or `YearIndexed`) parameter.
 */
export function flagLockedParameterAttempt(
  id: ParameterId,
  attemptedValue?: number,
): ParameterModificationResult {
  const resolved = resolveParameterForYear(
    id,
    activeParameterYear.value,
    customParameterOverrides.value,
  );
  return modifyParameterValue(id, attemptedValue ?? resolved.activeValue);
}

/** Resets a single parameter override back to its baseline default. */
export function resetParameterOverride(id: ParameterId): void {
  if (!Object.hasOwn(customParameterOverrides.value, id)) {
    return;
  }
  const nextOverrides: Partial<Record<ParameterId, number>> = {
    ...customParameterOverrides.value,
  };
  delete nextOverrides[id];
  customParameterOverrides.value = nextOverrides;
}

/** Clears all parameter overrides, filters, and raised flags back to clean defaults. */
export function resetAllParameterOverrides(): void {
  customParameterOverrides.value = {};
  activeParameterDomainFilter.value = undefined;
  activeParameterMutabilityFilter.value = undefined;
  activeParameterSearchQuery.value = "";
  lastParameterModificationFlag.value = null;
  parameterModificationFlagHistory.value = [];
  activeParameterYear.value = DEFAULT_TAX_YEAR;
}

/** Dismisses the currently visible statutory modification warning flag banner. */
export function dismissParameterModificationFlag(): void {
  lastParameterModificationFlag.value = null;
}

/** Resolves all parameters governed by `lawId` for the active year and overrides. */
export function getGovernedResolvedParametersForLaw(
  lawId: LawId,
): readonly ResolvedParameterValue[] {
  return getParametersByLaw(lawId).map((def) =>
    resolveParameterForYear(
      def.id,
      activeParameterYear.value,
      customParameterOverrides.value,
    ));
}
