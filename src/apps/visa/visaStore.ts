import {
  batch,
  computed,
  signal,
} from "@preact/signals";
import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  evaluateBlueCardEligibilityInContext,
  evaluateOpportunityCardPointsInContext,
} from "#engine/formulas/context/domainEvaluators";
import {
  type GermanLanguageLevel,
  type VisaOccupationRoute,
  GermanLanguageLevel as LanguageLevels,
  VisaOccupationRoute as OccupationRoutes,
  toGermanLanguageLevel,
  toVisaOccupationRoute,
} from "#engine/formulas/pure/visaFormulas";
import {
  browserAppStorage,
} from "#engine/storage/appStorage";
import {
  type GrossSalary,
  toGrossSalary,
} from "#engine/types";
import {
  unifiedLifeProfile,
} from "#store/lifeProfileStore";
import {
  activeStatutoryContext,
  setParameterYear,
} from "#store/parameterStore";

export interface VisaCalculatorState {
  readonly annualGrossSalary: GrossSalary;
  readonly applicantAgeYears: number;
  readonly occupationRoute: VisaOccupationRoute;
  readonly germanLevel: GermanLanguageLevel;
  readonly hasRecognizedGermanOrEquivalentDegree: boolean;
  readonly hasVocationalOrPartialRecognition: boolean;
  readonly hasEnglishC1OrNative: boolean;
  readonly qualifiedExperienceYears: number;
  readonly hasPriorSixMonthLegalStayInGermany: boolean;
  readonly isShortageOccupation: boolean;
  readonly partnerAlsoAppliesSkilled: boolean;
  readonly stayDurationMonths: number;
}

const VISA_STORAGE_KEY = "state";
const visaAppStorage = browserAppStorage(AppId.Visa);

export function createDefaultVisaCalculatorState(): VisaCalculatorState {
  return Object.freeze({
    annualGrossSalary: toGrossSalary(65000),
    applicantAgeYears: 33,
    occupationRoute: OccupationRoutes.Standard,
    germanLevel: LanguageLevels.B1Plus,
    hasRecognizedGermanOrEquivalentDegree: true,
    hasVocationalOrPartialRecognition: true,
    hasEnglishC1OrNative: true,
    qualifiedExperienceYears: 5,
    hasPriorSixMonthLegalStayInGermany: false,
    isShortageOccupation: true,
    partnerAlsoAppliesSkilled: false,
    stayDurationMonths: 12,
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

function parseVisaCalculatorState(raw: unknown): VisaCalculatorState {
  const defaults = createDefaultVisaCalculatorState();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return defaults;
  }
  const obj = raw as Record<string, unknown>;
  let occupationRoute = defaults.occupationRoute;
  if (typeof obj.occupationRoute === "string") {
    try {
      occupationRoute = toVisaOccupationRoute(obj.occupationRoute);
    }
    catch {
      occupationRoute = defaults.occupationRoute;
    }
  }
  let germanLevel = defaults.germanLevel;
  if (typeof obj.germanLevel === "string") {
    try {
      germanLevel = toGermanLanguageLevel(obj.germanLevel);
    }
    catch {
      germanLevel = defaults.germanLevel;
    }
  }

  return Object.freeze({
    annualGrossSalary: toGrossSalary(readNum(obj.annualGrossSalary, defaults.annualGrossSalary, 0, 1000000)),
    applicantAgeYears: Math.round(readNum(obj.applicantAgeYears, defaults.applicantAgeYears, 18, 80)),
    occupationRoute,
    germanLevel,
    hasRecognizedGermanOrEquivalentDegree: readBool(
      obj.hasRecognizedGermanOrEquivalentDegree,
      defaults.hasRecognizedGermanOrEquivalentDegree,
    ),
    hasVocationalOrPartialRecognition: readBool(
      obj.hasVocationalOrPartialRecognition,
      defaults.hasVocationalOrPartialRecognition,
    ),
    hasEnglishC1OrNative: readBool(obj.hasEnglishC1OrNative, defaults.hasEnglishC1OrNative),
    qualifiedExperienceYears: Math.round(
      readNum(obj.qualifiedExperienceYears, defaults.qualifiedExperienceYears, 0, 40),
    ),
    hasPriorSixMonthLegalStayInGermany: readBool(
      obj.hasPriorSixMonthLegalStayInGermany,
      defaults.hasPriorSixMonthLegalStayInGermany,
    ),
    isShortageOccupation: readBool(obj.isShortageOccupation, defaults.isShortageOccupation),
    partnerAlsoAppliesSkilled: readBool(
      obj.partnerAlsoAppliesSkilled,
      defaults.partnerAlsoAppliesSkilled,
    ),
    stayDurationMonths: Math.round(readNum(obj.stayDurationMonths, defaults.stayDurationMonths, 1, 12)),
  });
}

function loadVisaCalculatorState(): VisaCalculatorState {
  const raw = visaAppStorage.getItem(VISA_STORAGE_KEY);
  if (!raw) {
    return createDefaultVisaCalculatorState();
  }
  try {
    return parseVisaCalculatorState(JSON.parse(raw));
  }
  catch {
    return createDefaultVisaCalculatorState();
  }
}

export const visaState = signal<VisaCalculatorState>(loadVisaCalculatorState());

export const blueCardEvaluation = computed(() => {
  const s = visaState.value;
  return evaluateBlueCardEligibilityInContext(
    {
      annualGrossSalary: s.annualGrossSalary,
      applicantAgeYears: s.applicantAgeYears,
      occupationRoute: s.occupationRoute,
      germanLevel: s.germanLevel,
    },
    activeStatutoryContext.value,
  );
});

export const opportunityCardEvaluation = computed(() => {
  const s = visaState.value;
  return evaluateOpportunityCardPointsInContext(
    {
      hasRecognizedGermanOrEquivalentDegree: s.hasRecognizedGermanOrEquivalentDegree,
      hasVocationalOrPartialRecognition: s.hasVocationalOrPartialRecognition,
      germanLevel: s.germanLevel,
      hasEnglishC1OrNative: s.hasEnglishC1OrNative,
      qualifiedExperienceYears: s.qualifiedExperienceYears,
      applicantAgeYears: s.applicantAgeYears,
      hasPriorSixMonthLegalStayInGermany: s.hasPriorSixMonthLegalStayInGermany,
      isShortageOccupation: s.isShortageOccupation,
      partnerAlsoAppliesSkilled: s.partnerAlsoAppliesSkilled,
      stayDurationMonths: s.stayDurationMonths,
    },
    activeStatutoryContext.value,
  );
});

export function updateVisaField<K extends keyof VisaCalculatorState>(
  field: K,
  value: VisaCalculatorState[K],
): void {
  const next = parseVisaCalculatorState({
    ...visaState.value,
    [field]: value,
  });
  visaState.value = next;
  visaAppStorage.setItem(VISA_STORAGE_KEY, JSON.stringify(next));
}

export function syncVisaFromLifeProfile(): void {
  const lp = unifiedLifeProfile.value;
  batch(() => {
    setParameterYear(lp.planningYear);
    const next = parseVisaCalculatorState({
      ...visaState.value,
      annualGrossSalary: lp.primaryAnnualGrossEur,
      applicantAgeYears: lp.applicantAgeYears,
      occupationRoute: lp.occupationRoute,
      germanLevel: lp.germanLevel,
    });
    visaState.value = next;
    visaAppStorage.setItem(VISA_STORAGE_KEY, JSON.stringify(next));
  });
}

export function resetVisaCalculator(): void {
  const defaults = createDefaultVisaCalculatorState();
  visaState.value = defaults;
  visaAppStorage.removeItem(VISA_STORAGE_KEY);
}
