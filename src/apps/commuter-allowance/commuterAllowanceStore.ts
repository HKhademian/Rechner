import {
  batch,
  computed,
  signal,
} from "@preact/signals";
import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  CommuteTransportMode,
  evaluateCommuterAllowanceAndJobTicket,
  resolveCommuterRulesForYear,
  toCommuteTransportMode,
} from "#engine/formulas/pure/commuterAllowanceEvaluator";
import {
  GermanFederalState,
} from "#engine/formulas/pure/housingFormulas";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  browserAppStorage,
} from "#engine/storage/appStorage";
import {
  type EuroAmount,
  type FullCalendarYear,
  toEuroAmount,
  toFullCalendarYear,
} from "#engine/types";
import {
  unifiedLifeOverview,
  unifiedLifeProfile,
} from "#store/lifeProfileStore";
import {
  activeStatutoryContext,
  setParameterYear,
} from "#store/parameterStore";

export interface CommuterAllowanceState {
  readonly oneWayCommuteKm: number;
  readonly officeDaysPerYear: number;
  readonly transportMode: CommuteTransportMode;
  readonly homeOfficeDaysPerYear: number;
  readonly otherAnnualWorkExpensesEur: EuroAmount;
  readonly monthlyTransitTicketCostEur: EuroAmount;
  readonly monthlyEmployerJobTicketSubsidyEur: EuroAmount;
  readonly taxableIncomeZvEEur: EuroAmount;
  readonly isMarriedJointAssessment: boolean;
  readonly hasChurchTax: boolean;
  readonly isBavariaOrBadenWuerttemberg: boolean;
}

const COMMUTER_STORAGE_KEY = "state";
const commuterStorage = browserAppStorage(AppId.CommuterAllowance);

export function createDefaultCommuterAllowanceState(): CommuterAllowanceState {
  return Object.freeze({
    oneWayCommuteKm: 25,
    officeDaysPerYear: 180,
    transportMode: CommuteTransportMode.PublicTransitOrBike,
    homeOfficeDaysPerYear: 50,
    otherAnnualWorkExpensesEur: toEuroAmount(150),
    monthlyTransitTicketCostEur: toEuroAmount(63),
    monthlyEmployerJobTicketSubsidyEur: toEuroAmount(45),
    taxableIncomeZvEEur: toEuroAmount(55000),
    isMarriedJointAssessment: false,
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

function parseCommuterAllowanceState(raw: unknown): CommuterAllowanceState {
  const defaults = createDefaultCommuterAllowanceState();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return defaults;
  }
  const obj = raw as Record<string, unknown>;
  let transportMode = defaults.transportMode;
  if (typeof obj.transportMode === "string") {
    try {
      transportMode = toCommuteTransportMode(obj.transportMode);
    }
    catch {
      transportMode = defaults.transportMode;
    }
  }

  return Object.freeze({
    oneWayCommuteKm: Math.round(readNum(obj.oneWayCommuteKm, defaults.oneWayCommuteKm, 0, 500)),
    officeDaysPerYear: Math.round(
      readNum(obj.officeDaysPerYear, defaults.officeDaysPerYear, 0, 366),
    ),
    transportMode,
    homeOfficeDaysPerYear: Math.round(
      readNum(obj.homeOfficeDaysPerYear, defaults.homeOfficeDaysPerYear, 0, 366),
    ),
    otherAnnualWorkExpensesEur: toEuroAmount(
      readNum(obj.otherAnnualWorkExpensesEur, defaults.otherAnnualWorkExpensesEur, 0, 50000),
    ),
    monthlyTransitTicketCostEur: toEuroAmount(
      readNum(obj.monthlyTransitTicketCostEur, defaults.monthlyTransitTicketCostEur, 0, 1000),
    ),
    monthlyEmployerJobTicketSubsidyEur: toEuroAmount(
      readNum(
        obj.monthlyEmployerJobTicketSubsidyEur,
        defaults.monthlyEmployerJobTicketSubsidyEur,
        0,
        1000,
      ),
    ),
    taxableIncomeZvEEur: toEuroAmount(
      readNum(obj.taxableIncomeZvEEur, defaults.taxableIncomeZvEEur, 0, 1000000),
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

function loadCommuterAllowanceState(): CommuterAllowanceState {
  const raw = commuterStorage.getItem(COMMUTER_STORAGE_KEY);
  if (!raw) {
    return createDefaultCommuterAllowanceState();
  }
  try {
    return parseCommuterAllowanceState(JSON.parse(raw));
  }
  catch {
    return createDefaultCommuterAllowanceState();
  }
}

export const DEFAULT_COMMUTER_ALLOWANCE_STATE = createDefaultCommuterAllowanceState();
export const commuterAllowanceState = signal<CommuterAllowanceState>(
  loadCommuterAllowanceState(),
);

function evaluateCommuterFromState(
  state: CommuterAllowanceState,
  calendarYear: FullCalendarYear,
  workExpenseAllowanceOverrideEur?: EuroAmount,
) {
  return evaluateCommuterAllowanceAndJobTicket({
    calendarYear,
    oneWayCommuteKm: state.oneWayCommuteKm,
    officeDaysPerYear: state.officeDaysPerYear,
    transportMode: state.transportMode,
    homeOfficeDaysPerYear: state.homeOfficeDaysPerYear,
    otherAnnualWorkExpensesEur: state.otherAnnualWorkExpensesEur,
    monthlyTransitTicketCostEur: state.monthlyTransitTicketCostEur,
    monthlyEmployerJobTicketSubsidyEur: state.monthlyEmployerJobTicketSubsidyEur,
    taxableIncomeZvEEur: state.taxableIncomeZvEEur,
    isMarriedJointAssessment: state.isMarriedJointAssessment,
    hasChurchTax: state.hasChurchTax,
    isBavariaOrBadenWuerttemberg: state.isBavariaOrBadenWuerttemberg,
    workExpenseAllowanceOverrideEur,
  });
}

export const DEFAULT_COMMUTER_ALLOWANCE_EVALUATION = evaluateCommuterFromState(
  DEFAULT_COMMUTER_ALLOWANCE_STATE,
  toFullCalendarYear(2026),
);

export const commuterAllowanceEvaluation = computed(() => {
  const ctx = activeStatutoryContext.value;
  return evaluateCommuterFromState(
    commuterAllowanceState.value,
    ctx.calendarYear,
    ctx.getParameterEuroAmount(ParameterId.Tax_WorkExpenseAllowance),
  );
});

export function updateCommuterAllowanceField<K extends keyof CommuterAllowanceState>(
  field: K,
  value: CommuterAllowanceState[K],
): void {
  const next = parseCommuterAllowanceState({
    ...commuterAllowanceState.value,
    [field]: value,
  });
  commuterAllowanceState.value = next;
  commuterStorage.setItem(COMMUTER_STORAGE_KEY, JSON.stringify(next));
}

export function syncCommuterAllowanceFromLifeProfile(): void {
  const lp = unifiedLifeProfile.value;
  batch(() => {
    setParameterYear(lp.planningYear);
    const overview = unifiedLifeOverview.value;
    const annualOfficeDays = Math.min(366, Math.max(0, Math.round(lp.commuteOfficeDaysPerMonth * 12)));
    const yearRules = resolveCommuterRulesForYear(lp.planningYear);
    const next = parseCommuterAllowanceState({
      ...commuterAllowanceState.value,
      oneWayCommuteKm: lp.commuteOneWayKm,
      officeDaysPerYear: annualOfficeDays,
      homeOfficeDaysPerYear: Math.max(0, Math.min(250, 220 - annualOfficeDays)),
      monthlyTransitTicketCostEur: yearRules.deutschlandticketMonthlyEur,
      taxableIncomeZvEEur: overview.householdTax.estimatedTaxableIncomeZvEEur,
      isMarriedJointAssessment: lp.hasPartner && lp.isMarriedJointAssessment,
      isBavariaOrBadenWuerttemberg:
        lp.federalState === GermanFederalState.Bayern ||
        lp.federalState === GermanFederalState.BadenWuerttemberg,
    });
    commuterAllowanceState.value = next;
    commuterStorage.setItem(COMMUTER_STORAGE_KEY, JSON.stringify(next));
  });
}

export function resetCommuterAllowanceCalculator(): void {
  const defaults = createDefaultCommuterAllowanceState();
  commuterAllowanceState.value = defaults;
  commuterStorage.removeItem(COMMUTER_STORAGE_KEY);
}
