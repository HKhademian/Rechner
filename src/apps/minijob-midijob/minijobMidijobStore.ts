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
  MinijobTaxMode,
  evaluateMinijobMidijobTransition,
  toMinijobTaxMode,
} from "#engine/formulas/pure/minijobTransitionEvaluator";
import {
  createTaxRulesFromContext,
} from "#engine/parameters/contextAdapters";
import {
  browserAppStorage,
} from "#engine/storage/appStorage";
import {
  VERIFIED_TAX_YEARS,
} from "#engine/tax/taxRules";
import {
  type FullCalendarYear,
  type GrossSalary,
  TaxClass,
  toChildrenCount,
  toFullCalendarYear,
  toGrossSalary,
  toTaxClass,
} from "#engine/types";
import {
  unifiedLifeProfile,
} from "#store/lifeProfileStore";
import {
  activeStatutoryContext,
  setParameterYear,
} from "#store/parameterStore";

export interface MinijobMidijobState {
  readonly monthlyGrossEur: GrossSalary;
  readonly taxClass: TaxClass;
  readonly childrenCount: number;
  readonly hasChurchTax: boolean;
  readonly isBavariaOrBadenWuerttemberg: boolean;
  readonly inSaxony: boolean;
  readonly minijobPensionOptOut: boolean;
  readonly minijobTaxMode: MinijobTaxMode;
}

const MINIJOB_MIDIJOB_STORAGE_KEY = "state";
const minijobMidijobStorage = browserAppStorage(AppId.MinijobMidijob);

export function createDefaultMinijobMidijobState(): MinijobMidijobState {
  return Object.freeze({
    monthlyGrossEur: toGrossSalary(1200),
    taxClass: TaxClass.I,
    childrenCount: 0,
    hasChurchTax: false,
    isBavariaOrBadenWuerttemberg: false,
    inSaxony: false,
    minijobPensionOptOut: false,
    minijobTaxMode: MinijobTaxMode.EmployerFlat2Percent,
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

function parseMinijobMidijobState(raw: unknown): MinijobMidijobState {
  const defaults = createDefaultMinijobMidijobState();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return defaults;
  }
  const obj = raw as Record<string, unknown>;
  let taxClass = defaults.taxClass;
  if (typeof obj.taxClass === "string") {
    try {
      taxClass = toTaxClass(obj.taxClass);
    }
    catch {
      taxClass = defaults.taxClass;
    }
  }
  let minijobTaxMode = defaults.minijobTaxMode;
  if (typeof obj.minijobTaxMode === "string") {
    try {
      minijobTaxMode = toMinijobTaxMode(obj.minijobTaxMode);
    }
    catch {
      minijobTaxMode = defaults.minijobTaxMode;
    }
  }

  return Object.freeze({
    monthlyGrossEur: toGrossSalary(readNum(obj.monthlyGrossEur, defaults.monthlyGrossEur, 0, 20000)),
    taxClass,
    childrenCount: Math.round(readNum(obj.childrenCount, defaults.childrenCount, 0, 10)),
    hasChurchTax: readBool(obj.hasChurchTax, defaults.hasChurchTax),
    isBavariaOrBadenWuerttemberg: readBool(
      obj.isBavariaOrBadenWuerttemberg,
      defaults.isBavariaOrBadenWuerttemberg,
    ),
    inSaxony: readBool(obj.inSaxony, defaults.inSaxony),
    minijobPensionOptOut: readBool(obj.minijobPensionOptOut, defaults.minijobPensionOptOut),
    minijobTaxMode,
  });
}

function loadMinijobMidijobState(): MinijobMidijobState {
  const raw = minijobMidijobStorage.getItem(MINIJOB_MIDIJOB_STORAGE_KEY);
  if (!raw) {
    return createDefaultMinijobMidijobState();
  }
  try {
    return parseMinijobMidijobState(JSON.parse(raw));
  }
  catch {
    return createDefaultMinijobMidijobState();
  }
}

export const DEFAULT_MINIJOB_MIDIJOB_STATE = createDefaultMinijobMidijobState();
export const minijobMidijobState = signal<MinijobMidijobState>(loadMinijobMidijobState());

function evaluateMinijobMidijobFromState(
  state: MinijobMidijobState,
  calendarYear: FullCalendarYear,
) {
  return evaluateMinijobMidijobTransition({
    calendarYear,
    monthlyGrossEur: state.monthlyGrossEur,
    taxClass: state.taxClass,
    childrenCount: toChildrenCount(state.childrenCount),
    hasChurchTax: state.hasChurchTax,
    isBavariaOrBadenWuerttemberg: state.isBavariaOrBadenWuerttemberg,
    inSaxony: state.inSaxony,
    minijobPensionOptOut: state.minijobPensionOptOut,
    minijobTaxMode: state.minijobTaxMode,
  });
}

export const DEFAULT_MINIJOB_MIDIJOB_EVALUATION = evaluateMinijobMidijobFromState(
  DEFAULT_MINIJOB_MIDIJOB_STATE,
  toFullCalendarYear(2026),
);

export const minijobMidijobEvaluation = computed(() => {
  const ctx = activeStatutoryContext.value;
  const s = minijobMidijobState.value;
  const effectiveTaxYear = toFullCalendarYear(Math.max(ctx.calendarYear, VERIFIED_TAX_YEARS[0]));
  const rulesOverride = createTaxRulesFromContext(ctx, effectiveTaxYear);

  return evaluateMinijobMidijobTransition({
    calendarYear: ctx.calendarYear,
    monthlyGrossEur: s.monthlyGrossEur,
    taxClass: s.taxClass,
    childrenCount: toChildrenCount(s.childrenCount),
    hasChurchTax: s.hasChurchTax,
    isBavariaOrBadenWuerttemberg: s.isBavariaOrBadenWuerttemberg,
    inSaxony: s.inSaxony,
    minijobPensionOptOut: s.minijobPensionOptOut,
    minijobTaxMode: s.minijobTaxMode,
    rulesOverride,
  });
});

export function updateMinijobMidijobField<K extends keyof MinijobMidijobState>(
  field: K,
  value: MinijobMidijobState[K],
): void {
  const next = parseMinijobMidijobState({
    ...minijobMidijobState.value,
    [field]: value,
  });
  minijobMidijobState.value = next;
  minijobMidijobStorage.setItem(MINIJOB_MIDIJOB_STORAGE_KEY, JSON.stringify(next));
}

export function syncMinijobMidijobFromLifeProfile(): void {
  const lp = unifiedLifeProfile.value;
  batch(() => {
    setParameterYear(lp.planningYear);
    const referenceAnnual = lp.hasPartner && lp.partnerAnnualGrossEur > 0
      ? lp.partnerAnnualGrossEur
      : lp.primaryAnnualGrossEur;
    const referenceMonthly = toGrossSalary(Math.min(20000, Math.round(referenceAnnual / 12)));
    const next = parseMinijobMidijobState({
      ...minijobMidijobState.value,
      monthlyGrossEur: referenceMonthly,
      taxClass: lp.hasPartner && lp.isMarriedJointAssessment ? TaxClass.IV : TaxClass.I,
      childrenCount: lp.dependentChildrenCount,
      isBavariaOrBadenWuerttemberg:
        lp.federalState === GermanFederalState.Bayern ||
        lp.federalState === GermanFederalState.BadenWuerttemberg,
      inSaxony: lp.federalState === GermanFederalState.Sachsen,
    });
    minijobMidijobState.value = next;
    minijobMidijobStorage.setItem(MINIJOB_MIDIJOB_STORAGE_KEY, JSON.stringify(next));
  });
}

export function resetMinijobMidijobCalculator(): void {
  const defaults = createDefaultMinijobMidijobState();
  minijobMidijobState.value = defaults;
  minijobMidijobStorage.removeItem(MINIJOB_MIDIJOB_STORAGE_KEY);
}
