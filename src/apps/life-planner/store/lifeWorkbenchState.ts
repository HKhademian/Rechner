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
  type DisasterShockConfig,
  type LifeHouseholdBaseline,
  type LifePlanInput,
  type LifeSimulatorEvent,
  LifeEventDomain,
  LifeEventKind,
  LifePersonKey,
  ParentalLeavePlanMode,
  toLifeEventId,
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
export const useCustomDisasterMode = signal<boolean>(false);
export const customDisasterShocks = signal<readonly DisasterShockConfig[]>(Object.freeze([]));
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

export function updateLifeEvent(updated: LifeSimulatorEvent): void {
  const prev = lifeWorkbenchPlan.peek();
  const next: LifePlanInput = Object.freeze({
    ...prev,
    events: Object.freeze(
      prev.events
        .map((ev) => (ev.id === updated.id ? updated : ev))
        .sort((a, b) => a.effectiveMonth - b.effectiveMonth),
    ),
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

export function updateLifeEventMonth(eventId: string, nextMonth: SimulationMonth): void {
  const prev = lifeWorkbenchPlan.peek();
  const clamped = toSimulationMonth(
    Math.max(1, Math.min(prev.baseline.horizonMonths, Math.trunc(nextMonth))),
  );
  const next: LifePlanInput = Object.freeze({
    ...prev,
    events: Object.freeze(
      prev.events
        .map((ev) => (ev.id === eventId ? Object.freeze({ ...ev,
          effectiveMonth: clamped }) : ev))
        .sort((a, b) => a.effectiveMonth - b.effectiveMonth),
    ),
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

export function getActiveDisasterShocks(): readonly DisasterShockConfig[] {
  if (useCustomDisasterMode.value && customDisasterShocks.value.length > 0) {
    return customDisasterShocks.value;
  }
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

/** Validates and loads a serialized LifePlanInput JSON payload. */
export function importLifePlanFromJson(rawJson: string): {
  readonly ok: boolean;
  readonly error?: string;
} {
  try {
    const parsed = JSON.parse(rawJson) as Partial<LifePlanInput>;
    if (!parsed || !parsed.baseline || !parsed.baseline.primary || !Array.isArray(parsed.events)) {
      return {
        ok: false,
        error: "Invalid Life Planner JSON: missing baseline or events array.",
      };
    }
    const next = Object.freeze({
      baseline: Object.freeze(parsed.baseline),
      events: Object.freeze(parsed.events),
    }) as LifePlanInput;
    batch(() => {
      lifeWorkbenchPlan.value = next;
      commitmentStressDeltaEur.value = toEuroAmount(0);
      resetLifeDampening();
    });
    persistPlan(next);
    return { ok: true };
  }
  catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not parse JSON.",
    };
  }
}

/**
 * 1-click bridge: imports salaries, horizon, pregnancies/births, tax-class switches,
 * salary raises, and Kita fees from saved Parental Planner storage without mutating it.
 */
export function importFromParentalPlanner(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const ppStorage = browserAppStorage(AppId.ParentalPlanner);
    const raw = ppStorage.getItem("state") ?? browserAppStorage(AppId.ParentalLeave).getItem("state");
    if (!raw) {
      return false;
    }
    const parsed = JSON.parse(raw) as {
      readonly husbandGross?: number;
      readonly wifeGross?: number;
      readonly simulationDurationMonths?: number;
      readonly customPregnancies?: readonly {
        readonly pregnancyId?: string;
        readonly calculatedDeliverySimulationMonth?: number;
        readonly motherBasisMonths?: number;
        readonly motherPlusMonths?: number;
        readonly fatherBasisMonths?: number;
      }[];
      readonly customTaxClassSwitches?: readonly {
        readonly switchId?: string;
        readonly effectiveSimulationMonth?: number;
        readonly newHusbandTaxClass?: TaxClass;
        readonly newWifeTaxClass?: TaxClass;
      }[];
      readonly customSalaryRaises?: readonly {
        readonly raiseId?: string;
        readonly effectiveSimulationMonth?: number;
        readonly percentageIncrease?: number;
        readonly reason?: string;
      }[];
      readonly childcareConfig?: {
        readonly enabled?: boolean;
        readonly startOffsetMonthsAfterBirth?: number;
        readonly monthlyFeeOverride?: number;
      };
    };
    if (typeof parsed.husbandGross !== "number") {
      return false;
    }

    const horizon = typeof parsed.simulationDurationMonths === "number"
      ? Math.max(12, Math.min(360, parsed.simulationDurationMonths))
      : lifeWorkbenchPlan.peek().baseline.horizonMonths;

    const importedEvents: LifeSimulatorEvent[] = [];

    for (const [idx, preg] of (parsed.customPregnancies ?? []).entries()) {
      const birthMonth = Math.max(
        1,
        Math.min(horizon, Math.trunc(preg.calculatedDeliverySimulationMonth ?? 12)),
      );
      const basisM = preg.motherBasisMonths ?? 10;
      const plusM = preg.motherPlusMonths ?? 0;
      const leaveMode = plusM > 0 && basisM === 0
        ? ParentalLeavePlanMode.Plus
        : plusM > 0
          ? ParentalLeavePlanMode.Mixed
          : ParentalLeavePlanMode.Basis;
      importedEvents.push({
        id: toLifeEventId(`PP-BIRTH-${preg.pregnancyId ?? idx + 1}`),
        domain: LifeEventDomain.Family,
        kind: LifeEventKind.ChildBirth,
        effectiveMonth: toSimulationMonth(birthMonth),
        title: `Child ${idx + 1} Birth (from Parental Planner)`,
        parentOnLeave: LifePersonKey.Partner,
        leaveMode,
        leaveMonths: Math.max(1, basisM + plusM),
        partnerLeaveMonths: Math.max(0, preg.fatherBasisMonths ?? 2),
        includeMutterschutz: true,
      });

      if (parsed.childcareConfig?.enabled) {
        const kitaStart = Math.min(
          horizon,
          birthMonth + (parsed.childcareConfig.startOffsetMonthsAfterBirth ?? 12),
        );
        importedEvents.push({
          id: toLifeEventId(`PP-KITA-${idx + 1}`),
          domain: LifeEventDomain.Family,
          kind: LifeEventKind.ChildcareFee,
          effectiveMonth: toSimulationMonth(kitaStart),
          title: `Kita Child ${idx + 1} (from Parental Planner)`,
          monthlyFee: toEuroAmount(Math.max(0, parsed.childcareConfig.monthlyFeeOverride ?? 400)),
          durationMonths: 36,
          childIndex: idx + 1,
          taxDeductible: true,
        });
      }
    }

    for (const [idx, sw] of (parsed.customTaxClassSwitches ?? []).entries()) {
      const swMonth = Math.max(1, Math.min(horizon, Math.trunc(sw.effectiveSimulationMonth ?? 1)));
      importedEvents.push({
        id: toLifeEventId(`PP-SWITCH-${sw.switchId ?? idx + 1}`),
        domain: LifeEventDomain.Tax,
        kind: LifeEventKind.TaxClassSwitch,
        effectiveMonth: toSimulationMonth(swMonth),
        title: `Tax Switch ${sw.newHusbandTaxClass ?? TaxClass.V} / ${sw.newWifeTaxClass ?? TaxClass.III}`,
        primaryTaxClass: sw.newHusbandTaxClass ?? TaxClass.V,
        partnerTaxClass: sw.newWifeTaxClass ?? TaxClass.III,
      });
    }

    for (const [idx, raise] of (parsed.customSalaryRaises ?? []).entries()) {
      const rMonth = Math.max(1, Math.min(horizon, Math.trunc(raise.effectiveSimulationMonth ?? 13)));
      importedEvents.push({
        id: toLifeEventId(`PP-RAISE-${raise.raiseId ?? idx + 1}`),
        domain: LifeEventDomain.Career,
        kind: LifeEventKind.SalaryRaise,
        effectiveMonth: toSimulationMonth(rMonth),
        title: raise.reason ?? "Salary Raise (from Parental Planner)",
        personKey: LifePersonKey.Primary,
        percentageIncrease: toPercentageRate(Math.max(0, raise.percentageIncrease ?? 0.03)),
      });
    }

    const prev = lifeWorkbenchPlan.peek();
    const nonPpEvents = prev.events.filter((ev) => !ev.id.startsWith("PP-"));
    const nextPlan: LifePlanInput = Object.freeze({
      baseline: Object.freeze({
        ...prev.baseline,
        isMarriedJointAssessment: true,
        horizonMonths: horizon,
        primary: Object.freeze({
          ...prev.baseline.primary,
          monthlyGross: toGrossSalary(Math.max(0, parsed.husbandGross ?? 0)),
        }),
        partner: Object.freeze({
          personKey: LifePersonKey.Partner,
          name: prev.baseline.partner?.name ?? "Partner",
          monthlyGross: toGrossSalary(Math.max(0, parsed.wifeGross ?? 0)),
          weeklyHours: prev.baseline.partner?.weeklyHours ?? toWorkingHours(40),
          taxClass: prev.baseline.partner?.taxClass ?? TaxClass.IV,
          churchTaxRate: prev.baseline.partner?.churchTaxRate ?? toPercentageRate(0),
        }),
      }),
      events: Object.freeze(
        [...nonPpEvents, ...importedEvents].sort((a, b) => a.effectiveMonth - b.effectiveMonth),
      ),
    });

    lifeWorkbenchPlan.value = nextPlan;
    persistPlan(nextPlan);
    return true;
  }
  catch {
    return false;
  }
}
