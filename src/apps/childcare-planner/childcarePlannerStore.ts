import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  ChildcareApplicationStatus,
  ChildcareFacilityKind,
  toChildcareApplicationStatus,
  toChildcareFacilityKind,
} from "#engine/lifeProfile/childcareEvent";
import {
  createScopedStateStore,
} from "#engine/storage/scopedStateStore";

export interface StandaloneChildcareOption {
  readonly id: string;
  readonly providerName: string;
  readonly municipality: string;
  readonly facilityKind: ChildcareFacilityKind;
  readonly applicationStatus: ChildcareApplicationStatus;
  readonly desiredStartDate: string;
  readonly applicationDeadline: string;
  readonly enrollmentDeadline: string;
  readonly monthlyFeeEur: number;
  readonly monthlyMealEur: number;
}

export interface ChildcarePlannerState {
  readonly asOfDate: string;
  readonly options: readonly StandaloneChildcareOption[];
}

const DEFAULT_STATE: ChildcarePlannerState = {
  asOfDate: "2026-04-01",
  options: [
    {
      id: "cc-1",
      providerName: "Kita Sonnenschein",
      municipality: "Munich",
      facilityKind: ChildcareFacilityKind.Krippe,
      applicationStatus: ChildcareApplicationStatus.Applied,
      desiredStartDate: "2026-09-01",
      applicationDeadline: "2026-04-30",
      enrollmentDeadline: "2026-06-15",
      monthlyFeeEur: 320,
      monthlyMealEur: 85,
    },
    {
      id: "cc-2",
      providerName: "Waldkindergarten Isar",
      municipality: "Munich",
      facilityKind: ChildcareFacilityKind.Kita,
      applicationStatus: ChildcareApplicationStatus.Shortlisted,
      desiredStartDate: "2026-09-01",
      applicationDeadline: "2026-05-15",
      enrollmentDeadline: "",
      monthlyFeeEur: 180,
      monthlyMealEur: 75,
    },
  ],
};

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function clampEur(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(5000, Math.round(value)));
}

function parseOption(raw: unknown, index: number): StandaloneChildcareOption | undefined {
  if (typeof raw !== "object" || raw === null) {
    return undefined;
  }
  const obj = raw as Record<string, unknown>;
  let facilityKind: ChildcareFacilityKind = ChildcareFacilityKind.Kita;
  if (typeof obj.facilityKind === "string") {
    try {
      facilityKind = toChildcareFacilityKind(obj.facilityKind);
    }
    catch {
      facilityKind = ChildcareFacilityKind.Kita;
    }
  }
  let applicationStatus: ChildcareApplicationStatus = ChildcareApplicationStatus.Shortlisted;
  if (typeof obj.applicationStatus === "string") {
    try {
      applicationStatus = toChildcareApplicationStatus(obj.applicationStatus);
    }
    catch {
      applicationStatus = ChildcareApplicationStatus.Shortlisted;
    }
  }
  return {
    id: typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : `cc-${index + 1}`,
    providerName: typeof obj.providerName === "string" && obj.providerName.trim() ? obj.providerName.trim() : `Option ${index + 1}`,
    municipality: typeof obj.municipality === "string" ? obj.municipality.trim() : "",
    facilityKind,
    applicationStatus,
    desiredStartDate: isIsoDate(obj.desiredStartDate) ? obj.desiredStartDate : "",
    applicationDeadline: isIsoDate(obj.applicationDeadline) ? obj.applicationDeadline : "",
    enrollmentDeadline: isIsoDate(obj.enrollmentDeadline) ? obj.enrollmentDeadline : "",
    monthlyFeeEur: clampEur(obj.monthlyFeeEur, 0),
    monthlyMealEur: clampEur(obj.monthlyMealEur, 0),
  };
}

function parseState(raw: unknown): ChildcarePlannerState {
  if (typeof raw !== "object" || raw === null) {
    return DEFAULT_STATE;
  }
  const obj = raw as Record<string, unknown>;
  const options = Array.isArray(obj.options)
    ? obj.options.map(parseOption).filter((item): item is StandaloneChildcareOption => item !== undefined)
    : DEFAULT_STATE.options;

  return {
    asOfDate: isIsoDate(obj.asOfDate) ? obj.asOfDate : DEFAULT_STATE.asOfDate,
    options,
  };
}

export const childcarePlannerStore = createScopedStateStore<ChildcarePlannerState>({
  appId: AppId.ChildcarePlanner,
  field: "state",
  createDefault: () => DEFAULT_STATE,
  parse: parseState,
});
