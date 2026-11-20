import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  ResidencePermitKind,
  toResidencePermitKind,
} from "#engine/lifeProfile/residencePermitEvent";
import {
  PermanentResidencyRoute,
  toPermanentResidencyRoute,
} from "#engine/lifeProfile/residencyPreparation";
import {
  createScopedStateStore,
} from "#engine/storage/scopedStateStore";

export interface PermanentResidencyState {
  readonly route: PermanentResidencyRoute;
  readonly permitKind: ResidencePermitKind;
  readonly permitIssueDate: string;
  readonly permitExpiryDate: string;
  readonly absenceDays: number;
  readonly asOfDate: string;
  readonly hasLanguageCertificate: boolean;
  readonly hasPensionHistoryProof: boolean;
  readonly hasCivicTestCertificate: boolean;
  readonly hasLivelihoodAndHousingProof: boolean;
}

const DEFAULT_STATE: PermanentResidencyState = {
  route: PermanentResidencyRoute.BlueCardB1,
  permitKind: ResidencePermitKind.EuBlueCard,
  permitIssueDate: "2024-06-01",
  permitExpiryDate: "2028-05-31",
  absenceDays: 0,
  asOfDate: "2026-04-01",
  hasLanguageCertificate: false,
  hasPensionHistoryProof: true,
  hasCivicTestCertificate: false,
  hasLivelihoodAndHousingProof: true,
};

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function clampDays(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(3650, Math.round(value)));
}

function parseState(raw: unknown): PermanentResidencyState {
  if (typeof raw !== "object" || raw === null) {
    return DEFAULT_STATE;
  }
  const obj = raw as Record<string, unknown>;
  let route: PermanentResidencyRoute = DEFAULT_STATE.route;
  if (typeof obj.route === "string") {
    try {
      route = toPermanentResidencyRoute(obj.route);
    }
    catch {
      route = DEFAULT_STATE.route;
    }
  }
  let permitKind: ResidencePermitKind = DEFAULT_STATE.permitKind;
  if (typeof obj.permitKind === "string") {
    try {
      permitKind = toResidencePermitKind(obj.permitKind);
    }
    catch {
      permitKind = DEFAULT_STATE.permitKind;
    }
  }
  return {
    route,
    permitKind,
    permitIssueDate: isIsoDate(obj.permitIssueDate) ? obj.permitIssueDate : DEFAULT_STATE.permitIssueDate,
    permitExpiryDate: isIsoDate(obj.permitExpiryDate) ? obj.permitExpiryDate : DEFAULT_STATE.permitExpiryDate,
    absenceDays: clampDays(obj.absenceDays, DEFAULT_STATE.absenceDays),
    asOfDate: isIsoDate(obj.asOfDate) ? obj.asOfDate : DEFAULT_STATE.asOfDate,
    hasLanguageCertificate: typeof obj.hasLanguageCertificate === "boolean" ? obj.hasLanguageCertificate : DEFAULT_STATE.hasLanguageCertificate,
    hasPensionHistoryProof: typeof obj.hasPensionHistoryProof === "boolean" ? obj.hasPensionHistoryProof : DEFAULT_STATE.hasPensionHistoryProof,
    hasCivicTestCertificate: typeof obj.hasCivicTestCertificate === "boolean" ? obj.hasCivicTestCertificate : DEFAULT_STATE.hasCivicTestCertificate,
    hasLivelihoodAndHousingProof: typeof obj.hasLivelihoodAndHousingProof === "boolean" ? obj.hasLivelihoodAndHousingProof : DEFAULT_STATE.hasLivelihoodAndHousingProof,
  };
}

export const permanentResidencyStore = createScopedStateStore<PermanentResidencyState>({
  appId: AppId.PermanentResidency,
  field: "state",
  createDefault: () => DEFAULT_STATE,
  parse: parseState,
});
