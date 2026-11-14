import {
  type EuroAmount,
  type GrossSalary,
  toEuroAmount,
} from "#engine/types";

/**
 * Tier 1 Pure Mathematical German Visa & Residence Formulas (Context-Unaware).
 *
 * Implements § 18g AufenthG (EU Blue Card), § 18 Abs. 2 Nr. 5 AufenthG (45+ salary floor),
 * § 18c AufenthG (permanent settlement timeline), and § 20a AufenthG (Opportunity Card points
 * and subsistence verification) using explicit named parameters.
 */

export const VisaOccupationRoute = {
  Standard: "standard",
  ShortageOrGraduate: "shortage_or_graduate",
} as const;
export type VisaOccupationRoute = (typeof VisaOccupationRoute)[keyof typeof VisaOccupationRoute];

export function isVisaOccupationRoute(value: string): value is VisaOccupationRoute {
  return Object.values(VisaOccupationRoute).includes(value as VisaOccupationRoute);
}

export function toVisaOccupationRoute(value: string): VisaOccupationRoute {
  if (!isVisaOccupationRoute(value)) {
    throw new TypeError(`Invalid VisaOccupationRoute: "${value}"`);
  }
  return value;
}

export const GermanLanguageLevel = {
  NoneOrBasic: "none_or_basic",
  A1: "a1",
  A2: "a2",
  B1Plus: "b1_plus",
  B2Plus: "b2_plus",
} as const;
export type GermanLanguageLevel = (typeof GermanLanguageLevel)[keyof typeof GermanLanguageLevel];

export function isGermanLanguageLevel(value: string): value is GermanLanguageLevel {
  return Object.values(GermanLanguageLevel).includes(value as GermanLanguageLevel);
}

export function toGermanLanguageLevel(value: string): GermanLanguageLevel {
  if (!isGermanLanguageLevel(value)) {
    throw new TypeError(`Invalid GermanLanguageLevel: "${value}"`);
  }
  return value;
}

export const BlueCardEligibilityStatus = {
  EligibleStandard: "eligible_standard",
  EligibleShortageOrGraduate: "eligible_shortage_or_graduate",
  BelowThreshold: "below_threshold",
} as const;
export type BlueCardEligibilityStatus =
  (typeof BlueCardEligibilityStatus)[keyof typeof BlueCardEligibilityStatus];

export interface BlueCardEligibilityFormulaInputs {
  readonly annualGrossSalary: GrossSalary;
  readonly applicantAgeYears: number;
  readonly occupationRoute: VisaOccupationRoute;
  readonly germanLevel: GermanLanguageLevel;
  readonly blueCardStandardSalaryThreshold: EuroAmount;
  readonly blueCardShortageSalaryThreshold: EuroAmount;
  readonly age45MinimumSalaryFloor: EuroAmount;
  readonly settlementMonthsA1: number;
  readonly settlementMonthsB1: number;
  readonly opportunityCardMonthlyFunds: EuroAmount;
}

export interface BlueCardEligibilityFormulaResult {
  readonly status: BlueCardEligibilityStatus;
  readonly isEligible: boolean;
  readonly applicableSalaryThreshold: EuroAmount;
  readonly salarySurplusOrShortfall: EuroAmount;
  readonly shortfallToStandard: EuroAmount;
  readonly age45PensionProofRequired: boolean;
  readonly age45SalarySatisfied: boolean;
  readonly requiredSettlementMonths: number;
  readonly settlementMonthsSavedByB1: number;
  readonly opportunityCardAnnualBlockedAccount: EuroAmount;
}

export interface OpportunityCardPointsFormulaInputs {
  readonly hasRecognizedGermanOrEquivalentDegree: boolean;
  readonly hasVocationalOrPartialRecognition: boolean;
  readonly germanLevel: GermanLanguageLevel;
  readonly hasEnglishC1OrNative: boolean;
  readonly qualifiedExperienceYears: number;
  readonly applicantAgeYears: number;
  readonly hasPriorSixMonthLegalStayInGermany: boolean;
  readonly isShortageOccupation: boolean;
  readonly partnerAlsoAppliesSkilled: boolean;
  readonly stayDurationMonths: number;
  readonly monthlySubsistenceFunds: EuroAmount;
}

export interface OpportunityCardPointsFormulaResult {
  readonly directSkilledWorkerTrack: boolean;
  readonly totalPoints: number;
  readonly pointsRequired: number;
  readonly eligibleViaPoints: boolean;
  readonly eligibleOverall: boolean;
  readonly requiredBlockedAccountTotal: EuroAmount;
  readonly breakdown: Readonly<{
    readonly partialRecognition: number;
    readonly experience: number;
    readonly germanLanguage: number;
    readonly englishLanguage: number;
    readonly age: number;
    readonly priorStayInGermany: number;
    readonly shortageBonus: number;
    readonly partnerBonus: number;
  }>;
}

function roundToCent(amount: number): number {
  return Math.round(amount * 100 + Number.EPSILON * amount * 100) / 100;
}

/**
 * Evaluates EU Blue Card eligibility (§ 18g AufenthG), age-45 salary/pension gate (§ 18 Abs. 2 Nr. 5),
 * and permanent residency acceleration (§ 18c AufenthG).
 */
export function evaluateBlueCardEligibilityFormula(
  inputs: Readonly<BlueCardEligibilityFormulaInputs>,
): BlueCardEligibilityFormulaResult {
  if (!Number.isFinite(inputs.annualGrossSalary) || inputs.annualGrossSalary < 0) {
    throw new TypeError("Annual gross salary must be non-negative.");
  }
  if (!Number.isFinite(inputs.applicantAgeYears) || inputs.applicantAgeYears < 16 || inputs.applicantAgeYears > 90) {
    throw new TypeError("Applicant age must be between 16 and 90.");
  }
  if (inputs.blueCardShortageSalaryThreshold <= 0 || inputs.blueCardStandardSalaryThreshold <= 0) {
    throw new TypeError("Blue Card statutory thresholds must be positive.");
  }
  if (inputs.settlementMonthsA1 <= 0 || inputs.settlementMonthsB1 <= 0) {
    throw new TypeError("Settlement duration thresholds must be positive.");
  }

  const meetsStandard = inputs.annualGrossSalary >= inputs.blueCardStandardSalaryThreshold;
  const meetsShortage = inputs.annualGrossSalary >= inputs.blueCardShortageSalaryThreshold;

  let status: BlueCardEligibilityStatus;
  let applicableSalaryThreshold: EuroAmount;
  if (meetsStandard) {
    status = BlueCardEligibilityStatus.EligibleStandard;
    applicableSalaryThreshold = inputs.blueCardStandardSalaryThreshold;
  }
  else if (inputs.occupationRoute === VisaOccupationRoute.ShortageOrGraduate && meetsShortage) {
    status = BlueCardEligibilityStatus.EligibleShortageOrGraduate;
    applicableSalaryThreshold = inputs.blueCardShortageSalaryThreshold;
  }
  else {
    status = BlueCardEligibilityStatus.BelowThreshold;
    applicableSalaryThreshold =
      inputs.occupationRoute === VisaOccupationRoute.ShortageOrGraduate
        ? inputs.blueCardShortageSalaryThreshold
        : inputs.blueCardStandardSalaryThreshold;
  }

  const isEligible = status !== BlueCardEligibilityStatus.BelowThreshold;
  const salarySurplusOrShortfall = toEuroAmount(
    roundToCent(inputs.annualGrossSalary - applicableSalaryThreshold),
  );
  const shortfallToStandard = toEuroAmount(
    roundToCent(Math.max(0, inputs.blueCardStandardSalaryThreshold - inputs.annualGrossSalary)),
  );

  const age45SalarySatisfied = inputs.annualGrossSalary >= inputs.age45MinimumSalaryFloor;
  const age45PensionProofRequired = inputs.applicantAgeYears >= 45 && !age45SalarySatisfied;

  const hasB1OrBetter =
    inputs.germanLevel === GermanLanguageLevel.B1Plus ||
    inputs.germanLevel === GermanLanguageLevel.B2Plus;
  const requiredSettlementMonths = hasB1OrBetter
    ? inputs.settlementMonthsB1
    : inputs.settlementMonthsA1;
  const settlementMonthsSavedByB1 = Math.max(
    0,
    inputs.settlementMonthsA1 - inputs.settlementMonthsB1,
  );

  const opportunityCardAnnualBlockedAccount = toEuroAmount(
    roundToCent(inputs.opportunityCardMonthlyFunds * 12),
  );

  return Object.freeze({
    status,
    isEligible,
    applicableSalaryThreshold,
    salarySurplusOrShortfall,
    shortfallToStandard,
    age45PensionProofRequired,
    age45SalarySatisfied,
    requiredSettlementMonths,
    settlementMonthsSavedByB1,
    opportunityCardAnnualBlockedAccount,
  });
}

/**
 * Evaluates German Opportunity Card (Chancenkarte, §§ 20a–20b AufenthG) qualification points
 * and required blocked-account subsistence coverage.
 */
export function evaluateOpportunityCardPointsFormula(
  inputs: Readonly<OpportunityCardPointsFormulaInputs>,
): OpportunityCardPointsFormulaResult {
  if (!Number.isFinite(inputs.qualifiedExperienceYears) || inputs.qualifiedExperienceYears < 0) {
    throw new TypeError("Qualified work experience years must be non-negative.");
  }
  if (!Number.isFinite(inputs.applicantAgeYears) || inputs.applicantAgeYears < 16 || inputs.applicantAgeYears > 90) {
    throw new TypeError("Applicant age must be between 16 and 90.");
  }
  if (!Number.isInteger(inputs.stayDurationMonths) || inputs.stayDurationMonths < 1 || inputs.stayDurationMonths > 12) {
    throw new TypeError("Opportunity Card initial stay duration must be 1 to 12 months.");
  }

  const partialRecognition = inputs.hasVocationalOrPartialRecognition ? 4 : 0;
  const experience = inputs.qualifiedExperienceYears >= 5 ? 3 : inputs.qualifiedExperienceYears >= 2 ? 2 : 0;

  let germanLanguage = 0;
  if (inputs.germanLevel === GermanLanguageLevel.B2Plus) {
    germanLanguage = 3;
  }
  else if (inputs.germanLevel === GermanLanguageLevel.B1Plus) {
    germanLanguage = 2;
  }
  else if (inputs.germanLevel === GermanLanguageLevel.A2) {
    germanLanguage = 1;
  }

  const englishLanguage = inputs.hasEnglishC1OrNative ? 1 : 0;
  const age = inputs.applicantAgeYears <= 35 ? 2 : inputs.applicantAgeYears <= 40 ? 1 : 0;
  const priorStayInGermany = inputs.hasPriorSixMonthLegalStayInGermany ? 1 : 0;
  const shortageBonus = inputs.isShortageOccupation ? 1 : 0;
  const partnerBonus = inputs.partnerAlsoAppliesSkilled ? 1 : 0;

  const totalPoints =
    partialRecognition +
    experience +
    germanLanguage +
    englishLanguage +
    age +
    priorStayInGermany +
    shortageBonus +
    partnerBonus;

  const pointsRequired = 6;
  const eligibleViaPoints =
    inputs.hasVocationalOrPartialRecognition && totalPoints >= pointsRequired;
  const eligibleOverall = inputs.hasRecognizedGermanOrEquivalentDegree || eligibleViaPoints;

  const requiredBlockedAccountTotal = toEuroAmount(
    roundToCent(inputs.stayDurationMonths * inputs.monthlySubsistenceFunds),
  );

  return Object.freeze({
    directSkilledWorkerTrack: inputs.hasRecognizedGermanOrEquivalentDegree,
    totalPoints,
    pointsRequired,
    eligibleViaPoints,
    eligibleOverall,
    requiredBlockedAccountTotal,
    breakdown: Object.freeze({
      partialRecognition,
      experience,
      germanLanguage,
      englishLanguage,
      age,
      priorStayInGermany,
      shortageBonus,
      partnerBonus,
    }),
  });
}
