import {
  batch,
  signal,
} from "@preact/signals";
import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  browserAppStorage,
} from "#engine/storage/appStorage";
import {
  type EuroAmount,
  type SimulationMonth,
  TaxClass,
  toEuroAmount,
  toGrossSalary,
  toPercentageRate,
  toSimulationMonth,
  toWorkingHours,
} from "#engine/types";
import {
  unifiedLifeProfile,
} from "#store/lifeProfileStore";
import {
  type LifeHouseholdBaseline,
  type LifePlanInput,
  type LifeSimulatorEvent,
  LifePersonKey,
} from "#engine/lifeSimulator/types";
import {
  DISASTER_PRESETS,
  DisasterPresetId,
} from "#engine/lifeSimulator/disasterSimulator";
import {
  LifePlannerPresetId,
  buildLifePlannerPreset,
} from "#engine/lifeSimulator/lifePlannerPresets";
import {
  resetLifeDampening,
} from "#/apps/life-planner/store/lifeWorkbenchDampening.ts";

const storage = browserAppStorage(AppId.LifePlanner);
const PLAN_KEY = "plan-v1";

function loadInitialPlan(): LifePlanInput {
  const fallback = buildLifePlannerPreset(LifePlannerPresetId.GrowingFamilyHomePurchase);
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const raw = storage.getItem(PLAN_KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw) as LifePlanInput;
    if (parsed && parsed.baseline && Array.isArray(parsed.events)) {
      return Object.freeze(parsed);
    }
    return fallback;
  }
  catch {
    return fallback;
  }
}

function persistPlan(plan: LifePlanInput): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    storage.setItem(PLAN_KEY, JSON.stringify(plan));
  }
  catch {
    // Non-fatal in private / memory storage modes.
  }
}

export const lifeWorkbenchPlan = signal<LifePlanInput>(loadInitialPlan());
export const selectedLifePresetId = signal<LifePlannerPresetId>(
  LifePlannerPresetId.GrowingFamilyHomePurchase,
);
export const activeDisasterPresetId = signal<DisasterPresetId>(DisasterPresetId.Fired6m);
export const disasterTriggerMonth = signal<SimulationMonth>(toSimulationMonth(12));
export const commitmentStressDeltaEur = signal<EuroAmount>(toEuroAmount(0));

export function updateLifeBaseline(
  updater: (prev: LifeHouseholdBaseline) => LifeHouseholdBaseline,
): void {
  const prev = lifeWorkbenchPlan.peek();
  const next: LifePlanInput = Object.freeze({
    ...prev,
    baseline: Object.freeze(updater(prev.baseline)),
  });
  lifeWorkbenchPlan.value = next;
  persistPlan(next);
}

export function addLifeEvent(event: LifeSimulatorEvent): void {
  const prev = lifeWorkbenchPlan.peek();
  const next: LifePlanInput = Object.freeze({
    ...prev,
    events: Object.freeze([...prev.events, event].sort((a, b) => a.effectiveMonth - b.effectiveMonth)),
  });
  lifeWorkbenchPlan.value = next;
  persistPlan(next);
}

export function removeLifeEvent(eventId: string): void {
  const prev = lifeWorkbenchPlan.peek();
  const next: LifePlanInput = Object.freeze({
    ...prev,
    events: Object.freeze(prev.events.filter((ev) => ev.id !== eventId)),
  });
  lifeWorkbenchPlan.value = next;
  persistPlan(next);
}

export function applyLifePreset(id: LifePlannerPresetId): void {
  const next = buildLifePlannerPreset(id);
  batch(() => {
    selectedLifePresetId.value = id;
    lifeWorkbenchPlan.value = next;
    commitmentStressDeltaEur.value = toEuroAmount(0);
    resetLifeDampening();
  });
  persistPlan(next);
}

export function clearLifePlan(): void {
  applyLifePreset(LifePlannerPresetId.BlankPlan);
}

export function getActiveDisasterShocks() {
  const preset = DISASTER_PRESETS.find((p) => p.id === activeDisasterPresetId.value) ?? DISASTER_PRESETS[0];
  return preset.buildShocks(disasterTriggerMonth.value);
}

/** 1-click bridge: imports household salaries, children, and marital status from Unified Life Profile. */
export function syncLifeWorkbenchFromProfile(): void {
  const profile = unifiedLifeProfile.peek();
  updateLifeBaseline((prev) => ({
    ...prev,
    startCalendarYear: profile.planningYear,
    isMarriedJointAssessment: profile.hasPartner && profile.isMarriedJointAssessment,
    priorChildrenCount: profile.dependentChildrenCount,
    primary: Object.freeze({
      ...prev.primary,
      monthlyGross: toGrossSalary(Math.round((profile.primaryAnnualGrossEur / 12) * 100) / 100),
      taxClass: profile.hasPartner && profile.isMarriedJointAssessment
        ? TaxClass.IV
        : profile.dependentChildrenCount > 0 && !profile.hasPartner
          ? TaxClass.II
          : TaxClass.I,
    }),
    partner: profile.hasPartner
      ? Object.freeze({
        personKey: LifePersonKey.Partner,
        name: prev.partner?.name ?? "Partner",
        monthlyGross: toGrossSalary(Math.round((profile.partnerAnnualGrossEur / 12) * 100) / 100),
        weeklyHours: prev.partner?.weeklyHours ?? toWorkingHours(40),
        taxClass: profile.isMarriedJointAssessment ? TaxClass.IV : TaxClass.I,
        churchTaxRate: prev.partner?.churchTaxRate ?? toPercentageRate(0),
      })
      : undefined,
  }));
}
