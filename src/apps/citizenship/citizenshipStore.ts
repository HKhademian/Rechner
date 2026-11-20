import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  CitizenshipPathway,
  toCitizenshipPathway,
} from "#engine/lifeProfile/citizenshipPreparation";
import {
  createScopedStateStore,
} from "#engine/storage/scopedStateStore";

export interface CitizenshipState {
  readonly pathway: CitizenshipPathway;
  readonly residenceStartDate: string;
  readonly asOfDate: string;
  readonly longestSingleAbsenceDays: number;
  readonly hasEligibleResidenceTitle: boolean;
  readonly hasValidIdentityAndPassport: boolean;
  readonly hasLanguageB1Certificate: boolean;
  readonly hasNaturalizationTest: boolean;
  readonly hasIndependentLivelihoodProof: boolean;
  readonly hasCivilStatusCertificates: boolean;
}

const DEFAULT_STATE: CitizenshipState = {
  pathway: CitizenshipPathway.StandardFiveYear,
  residenceStartDate: "2022-03-01",
  asOfDate: "2026-04-01",
  longestSingleAbsenceDays: 0,
  hasEligibleResidenceTitle: true,
  hasValidIdentityAndPassport: true,
  hasLanguageB1Certificate: false,
  hasNaturalizationTest: false,
  hasIndependentLivelihoodProof: true,
  hasCivilStatusCertificates: false,
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

function parseState(raw: unknown): CitizenshipState {
  if (typeof raw !== "object" || raw === null) {
    return DEFAULT_STATE;
  }
  const obj = raw as Record<string, unknown>;
  let pathway: CitizenshipPathway = DEFAULT_STATE.pathway;
  if (typeof obj.pathway === "string") {
    try {
      pathway = toCitizenshipPathway(obj.pathway);
    }
    catch {
      pathway = DEFAULT_STATE.pathway;
    }
  }
  return {
    pathway,
    residenceStartDate: isIsoDate(obj.residenceStartDate) ? obj.residenceStartDate : DEFAULT_STATE.residenceStartDate,
    asOfDate: isIsoDate(obj.asOfDate) ? obj.asOfDate : DEFAULT_STATE.asOfDate,
    longestSingleAbsenceDays: clampDays(obj.longestSingleAbsenceDays, DEFAULT_STATE.longestSingleAbsenceDays),
    hasEligibleResidenceTitle: typeof obj.hasEligibleResidenceTitle === "boolean" ? obj.hasEligibleResidenceTitle : DEFAULT_STATE.hasEligibleResidenceTitle,
    hasValidIdentityAndPassport: typeof obj.hasValidIdentityAndPassport === "boolean" ? obj.hasValidIdentityAndPassport : DEFAULT_STATE.hasValidIdentityAndPassport,
    hasLanguageB1Certificate: typeof obj.hasLanguageB1Certificate === "boolean" ? obj.hasLanguageB1Certificate : DEFAULT_STATE.hasLanguageB1Certificate,
    hasNaturalizationTest: typeof obj.hasNaturalizationTest === "boolean" ? obj.hasNaturalizationTest : DEFAULT_STATE.hasNaturalizationTest,
    hasIndependentLivelihoodProof: typeof obj.hasIndependentLivelihoodProof === "boolean" ? obj.hasIndependentLivelihoodProof : DEFAULT_STATE.hasIndependentLivelihoodProof,
    hasCivilStatusCertificates: typeof obj.hasCivilStatusCertificates === "boolean" ? obj.hasCivilStatusCertificates : DEFAULT_STATE.hasCivilStatusCertificates,
  };
}

export const citizenshipStore = createScopedStateStore<CitizenshipState>({
  appId: AppId.Citizenship,
  field: "state",
  createDefault: () => DEFAULT_STATE,
  parse: parseState,
});
