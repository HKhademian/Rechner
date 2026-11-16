import {
  batch,
  computed,
  signal,
} from "@preact/signals";
import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  GermanFederalState,
} from "#engine/formulas/pure/housingFormulas";
import {
  evaluateKitaFeeAndTaxOffset,
} from "#engine/formulas/pure/kitaOffsetEvaluator";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  browserAppStorage,
} from "#engine/storage/appStorage";
import {
  type EuroAmount,
  type FullCalendarYear,
  type GrossSalary,
  FederalStateKitaPresetId,
  toEuroAmount,
  toFederalStateKitaPresetId,
  toFullCalendarYear,
  toGrossSalary,
} from "#engine/types";
import {
  unifiedLifeOverview,
  unifiedLifeProfile,
} from "#store/lifeProfileStore";
import {
  activeStatutoryContext,
  setParameterYear,
} from "#store/parameterStore";

export interface KitaCalculatorState {
  readonly presetId: FederalStateKitaPresetId;
  readonly customMonthlyCareFeePerChildEur: EuroAmount;
  readonly monthlyMealFeePerChildEur: EuroAmount;
  readonly childrenCount: number;
  readonly child1AgeMonths: number;
  readonly child2AgeMonths: number;
  readonly child3AgeMonths: number;
  readonly child4AgeMonths: number;
  readonly careMonthsPerYear: number;
  readonly householdAnnualGrossEur: GrossSalary;
  readonly householdTaxableIncomeZvEEur: EuroAmount;
  readonly isMarriedJointAssessment: boolean;
  readonly hasChurchTax: boolean;
  readonly isBavariaOrBadenWuerttemberg: boolean;
}

const KITA_STORAGE_KEY = "state";
const kitaAppStorage = browserAppStorage(AppId.Kita);

export function createDefaultKitaState(): KitaCalculatorState {
  return Object.freeze({
    presetId: FederalStateKitaPresetId.NrwDuesseldorf,
    customMonthlyCareFeePerChildEur: toEuroAmount(320),
    monthlyMealFeePerChildEur: toEuroAmount(65),
    childrenCount: 1,
    child1AgeMonths: 24,
    child2AgeMonths: 48,
    child3AgeMonths: 72,
    child4AgeMonths: 96,
    careMonthsPerYear: 12,
    householdAnnualGrossEur: toGrossSalary(95000),
    householdTaxableIncomeZvEEur: toEuroAmount(78000),
    isMarriedJointAssessment: true,
    hasChurchTax: false,
    isBavariaOrBadenWuerttemberg: false,
  });
}

function readNum(raw: unknown, fallback: number, min: number, max: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, raw));
}

function readBool(raw: unknown, fallback: boolean): boolean {
  return typeof raw === "boolean" ? raw : fallback;
}

function parseKitaState(raw: unknown): KitaCalculatorState {
  const defaults = createDefaultKitaState();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return defaults;
  }
  const obj = raw as Record<string, unknown>;
  let presetId = defaults.presetId;
  if (typeof obj.presetId === "string") {
    try {
      presetId = toFederalStateKitaPresetId(obj.presetId);
    }
    catch {
      presetId = defaults.presetId;
    }
  }

  return Object.freeze({
    presetId,
    customMonthlyCareFeePerChildEur: toEuroAmount(
      readNum(obj.customMonthlyCareFeePerChildEur, defaults.customMonthlyCareFeePerChildEur, 0, 5000),
    ),
    monthlyMealFeePerChildEur: toEuroAmount(
      readNum(obj.monthlyMealFeePerChildEur, defaults.monthlyMealFeePerChildEur, 0, 1000),
    ),
    childrenCount: Math.round(readNum(obj.childrenCount, defaults.childrenCount, 1, 4)),
    child1AgeMonths: Math.round(readNum(obj.child1AgeMonths, defaults.child1AgeMonths, 0, 167)),
    child2AgeMonths: Math.round(readNum(obj.child2AgeMonths, defaults.child2AgeMonths, 0, 167)),
    child3AgeMonths: Math.round(readNum(obj.child3AgeMonths, defaults.child3AgeMonths, 0, 167)),
    child4AgeMonths: Math.round(readNum(obj.child4AgeMonths, defaults.child4AgeMonths, 0, 167)),
    careMonthsPerYear: Math.round(readNum(obj.careMonthsPerYear, defaults.careMonthsPerYear, 1, 12)),
    householdAnnualGrossEur: toGrossSalary(
      readNum(obj.householdAnnualGrossEur, defaults.householdAnnualGrossEur, 0, 1000000),
    ),
    householdTaxableIncomeZvEEur: toEuroAmount(
      readNum(obj.householdTaxableIncomeZvEEur, defaults.householdTaxableIncomeZvEEur, 0, 1000000),
    ),
    isMarriedJointAssessment: readBool(
      obj.isMarriedJointAssessment,
      defaults.isMarriedJointAssessment,
    ),
    hasChurchTax: readBool(obj.hasChurchTax, defaults.hasChurchTax),
    isBavariaOrBadenWuerttemberg: readBool(
      obj.isBavariaOrBadenWuerttemberg,
      defaults.isBavariaOrBadenWuerttemberg,
    ),
  });
}

function loadKitaState(): KitaCalculatorState {
  const raw = kitaAppStorage.getItem(KITA_STORAGE_KEY);
  if (!raw) {
    return createDefaultKitaState();
  }
  try {
    return parseKitaState(JSON.parse(raw));
  }
  catch {
    return createDefaultKitaState();
  }
}

export const DEFAULT_KITA_STATE = createDefaultKitaState();
export const kitaState = signal<KitaCalculatorState>(loadKitaState());

function evaluateKitaFromState(
  state: KitaCalculatorState,
  calendarYear: FullCalendarYear,
  overrides?: {
    readonly deductibleFractionOverride?: ReturnType<typeof activeStatutoryContext.value.getParameterPercentageRate>;
    readonly maxAnnualDeductionPerChildOverride?: EuroAmount;
    readonly maxChildAgeYearsOverride?: number;
  },
) {
  const ages = [
    state.child1AgeMonths,
    state.child2AgeMonths,
    state.child3AgeMonths,
    state.child4AgeMonths,
  ].slice(0, state.childrenCount);

  return evaluateKitaFeeAndTaxOffset({
    calendarYear,
    presetId: state.presetId,
    customMonthlyCareFeePerChildEur: state.customMonthlyCareFeePerChildEur,
    monthlyMealFeePerChildEur: state.monthlyMealFeePerChildEur,
    childAgesMonths: ages,
    careMonthsPerYear: state.careMonthsPerYear,
    householdAnnualGrossEur: state.householdAnnualGrossEur,
    householdTaxableIncomeZvEEur: state.householdTaxableIncomeZvEEur,
    isMarriedJointAssessment: state.isMarriedJointAssessment,
    hasChurchTax: state.hasChurchTax,
    isBavariaOrBadenWuerttemberg: state.isBavariaOrBadenWuerttemberg,
    deductibleFractionOverride: overrides?.deductibleFractionOverride,
    maxAnnualDeductionPerChildOverride: overrides?.maxAnnualDeductionPerChildOverride,
    maxChildAgeYearsOverride: overrides?.maxChildAgeYearsOverride,
  });
}

export const DEFAULT_KITA_EVALUATION = evaluateKitaFromState(
  DEFAULT_KITA_STATE,
  toFullCalendarYear(2026),
);

export const kitaEvaluation = computed(() => {
  const ctx = activeStatutoryContext.value;
  return evaluateKitaFromState(kitaState.value, ctx.calendarYear, {
    deductibleFractionOverride: ctx.getParameterPercentageRate(
      ParameterId.Tax_ChildcareDeductibleFraction,
    ),
    maxAnnualDeductionPerChildOverride: ctx.getParameterEuroAmount(
      ParameterId.Tax_ChildcareMaxDeductionPerChild,
    ),
    maxChildAgeYearsOverride: ctx.getParameterNumber(ParameterId.Tax_ChildcareMaxAgeYears),
  });
});

export function updateKitaField<K extends keyof KitaCalculatorState>(
  field: K,
  value: KitaCalculatorState[K],
): void {
  const next = parseKitaState({
    ...kitaState.value,
    [field]: value,
  });
  kitaState.value = next;
  kitaAppStorage.setItem(KITA_STORAGE_KEY, JSON.stringify(next));
}

function presetForFederalState(
  federalState: GermanFederalState,
  fallback: FederalStateKitaPresetId,
): FederalStateKitaPresetId {
  switch (federalState) {
    case GermanFederalState.Berlin:
      return FederalStateKitaPresetId.Berlin;
    case GermanFederalState.NordrheinWestfalen:
      return FederalStateKitaPresetId.NrwDuesseldorf;
    case GermanFederalState.Bayern:
      return FederalStateKitaPresetId.BavariaMunich;
    case GermanFederalState.BadenWuerttemberg:
      return FederalStateKitaPresetId.BwStuttgart;
    case GermanFederalState.Hamburg:
      return FederalStateKitaPresetId.Hamburg;
    default:
      return fallback;
  }
}

export function syncKitaFromLifeProfile(): void {
  const lp = unifiedLifeProfile.value;
  batch(() => {
    setParameterYear(lp.planningYear);
    const overview = unifiedLifeOverview.value;
    const totalGross = toGrossSalary(
      lp.primaryAnnualGrossEur + (lp.hasPartner ? lp.partnerAnnualGrossEur : 0),
    );
    const next = parseKitaState({
      ...kitaState.value,
      presetId: presetForFederalState(lp.federalState, kitaState.value.presetId),
      childrenCount: Math.max(1, Math.min(4, lp.dependentChildrenCount)),
      householdAnnualGrossEur: totalGross,
      householdTaxableIncomeZvEEur: overview.householdTax.estimatedTaxableIncomeZvEEur,
      isMarriedJointAssessment: lp.hasPartner && lp.isMarriedJointAssessment,
      isBavariaOrBadenWuerttemberg:
        lp.federalState === GermanFederalState.Bayern ||
        lp.federalState === GermanFederalState.BadenWuerttemberg,
    });
    kitaState.value = next;
    kitaAppStorage.setItem(KITA_STORAGE_KEY, JSON.stringify(next));
  });
}

export function resetKitaCalculator(): void {
  const defaults = createDefaultKitaState();
  kitaState.value = defaults;
  kitaAppStorage.removeItem(KITA_STORAGE_KEY);
}
