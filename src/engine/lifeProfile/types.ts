import {
  type CommuteValuationMethod,
  type VehiclePowertrain,
  CommuteValuationMethod as CommuteMethods,
  VehiclePowertrain as Powertrains,
  toCommuteValuationMethod,
  toVehiclePowertrain,
} from "#engine/formulas/pure/companyCarFormulas";
import {
  type GermanFederalState,
  GermanFederalState as FederalStates,
  toGermanFederalState,
} from "#engine/formulas/pure/housingFormulas";
import {
  type SolarFeedInMode,
  SolarFeedInMode as FeedInModes,
  toSolarFeedInMode,
} from "#engine/formulas/pure/solarEnergyFormulas";
import {
  type GermanLanguageLevel,
  type VisaOccupationRoute,
  GermanLanguageLevel as LanguageLevels,
  VisaOccupationRoute as OccupationRoutes,
  toGermanLanguageLevel,
  toVisaOccupationRoute,
} from "#engine/formulas/pure/visaFormulas";
import {
  type EuroAmount,
  type FullCalendarYear,
  type GrossSalary,
  type PercentageRate,
  toEuroAmount,
  toFullCalendarYear,
  toGrossSalary,
  toPercentageRate,
} from "#engine/types";

/**
 * Shared storage key for the Unified General Life & Support Profile.
 * Explicitly namespaced under `rechner:life-profile:v1:*` so individual app
 * stores (`rechner:<app>:v1:*`) remain isolated per `dependencyBoundaries.test.ts`
 * and `isolation.test.ts`.
 */
export const LIFE_PROFILE_STORAGE_KEY = "rechner:life-profile:v1:profile";

/**
 * Unified General Household, Career, Mobility, Housing & Energy Profile (Stage 6 Engine).
 * Allows entering core household facts once and projecting them across all standalone calculators.
 */
export interface UnifiedLifeProfile {
  readonly version: 1;
  readonly planningYear: FullCalendarYear;
  readonly federalState: GermanFederalState;
  readonly primaryAnnualGrossEur: GrossSalary;
  readonly hasPartner: boolean;
  readonly partnerAnnualGrossEur: GrossSalary;
  readonly dependentChildrenCount: number;
  readonly applicantAgeYears: number;
  readonly occupationRoute: VisaOccupationRoute;
  readonly germanLevel: GermanLanguageLevel;
  readonly hasCompanyCar: boolean;
  readonly companyCarListPriceEur: EuroAmount;
  readonly companyCarPowertrain: VehiclePowertrain;
  readonly commuteOneWayKm: number;
  readonly commuteOfficeDaysPerMonth: number;
  readonly commuteValuationMethod: CommuteValuationMethod;
  readonly plansSolarPv: boolean;
  readonly solarCapacityKwp: number;
  readonly solarSystemCostNetEur: EuroAmount;
  readonly annualHouseholdElectricityKwh: number;
  readonly solarFeedInMode: SolarFeedInMode;
  readonly plansHomePurchase: boolean;
  readonly targetPropertyPriceEur: EuroAmount;
  readonly availableEquityEur: EuroAmount;
  readonly includesBrokerCommission: boolean;
  readonly isKfw300NewBuild: boolean;
  readonly isQngPlusCertified: boolean;
  readonly annualRenovationLaborEur: EuroAmount;
  readonly assumedMarginalTaxAndSocialRate: PercentageRate;
}

/** Creates the clean statutory default Unified Life Profile. */
export function createDefaultUnifiedLifeProfile(): UnifiedLifeProfile {
  return Object.freeze({
    version: 1,
    planningYear: toFullCalendarYear(2026),
    federalState: FederalStates.NordrheinWestfalen,
    primaryAnnualGrossEur: toGrossSalary(65000),
    hasPartner: true,
    partnerAnnualGrossEur: toGrossSalary(42000),
    dependentChildrenCount: 1,
    applicantAgeYears: 33,
    occupationRoute: OccupationRoutes.Standard,
    germanLevel: LanguageLevels.B1Plus,
    hasCompanyCar: true,
    companyCarListPriceEur: toEuroAmount(55000),
    companyCarPowertrain: Powertrains.PureElectricEv,
    commuteOneWayKm: 18,
    commuteOfficeDaysPerMonth: 12,
    commuteValuationMethod: CommuteMethods.MonthlyFlat003,
    plansSolarPv: true,
    solarCapacityKwp: 10,
    solarSystemCostNetEur: toEuroAmount(14500),
    annualHouseholdElectricityKwh: 4500,
    solarFeedInMode: FeedInModes.PartialSelfConsumption,
    plansHomePurchase: true,
    targetPropertyPriceEur: toEuroAmount(480000),
    availableEquityEur: toEuroAmount(100000),
    includesBrokerCommission: true,
    isKfw300NewBuild: true,
    isQngPlusCertified: false,
    annualRenovationLaborEur: toEuroAmount(4000),
    assumedMarginalTaxAndSocialRate: toPercentageRate(0.42),
  });
}

function readFiniteNonNegative(raw: unknown, fallback: number, max?: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) {
    return fallback;
  }
  return max !== undefined ? Math.min(max, raw) : raw;
}

function readBoolean(raw: unknown, fallback: boolean): boolean {
  return typeof raw === "boolean" ? raw : fallback;
}

function readEnum<T extends string>(
  raw: unknown,
  parser: (value: string) => T,
  fallback: T,
): T {
  if (typeof raw !== "string") {
    return fallback;
  }
  try {
    return parser(raw);
  }
  catch {
    return fallback;
  }
}

/**
 * Validates and reconstructs a `UnifiedLifeProfile` from untrusted serialized JSON,
 * falling back gracefully per field to clean statutory defaults.
 */
export function parseUnifiedLifeProfile(raw: unknown): UnifiedLifeProfile {
  const defaults = createDefaultUnifiedLifeProfile();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return defaults;
  }
  const obj = raw as Record<string, unknown>;

  let planningYear = defaults.planningYear;
  if (typeof obj.planningYear === "number" && Number.isInteger(obj.planningYear)) {
    try {
      planningYear = toFullCalendarYear(obj.planningYear);
    }
    catch {
      planningYear = defaults.planningYear;
    }
  }

  return Object.freeze({
    version: 1,
    planningYear,
    federalState: readEnum(obj.federalState, toGermanFederalState, defaults.federalState),
    primaryAnnualGrossEur: toGrossSalary(
      readFiniteNonNegative(obj.primaryAnnualGrossEur, defaults.primaryAnnualGrossEur),
    ),
    hasPartner: readBoolean(obj.hasPartner, defaults.hasPartner),
    partnerAnnualGrossEur: toGrossSalary(
      readFiniteNonNegative(obj.partnerAnnualGrossEur, defaults.partnerAnnualGrossEur),
    ),
    dependentChildrenCount: Math.floor(
      readFiniteNonNegative(obj.dependentChildrenCount, defaults.dependentChildrenCount, 15),
    ),
    applicantAgeYears: Math.max(
      18,
      Math.min(
        80,
        Math.round(readFiniteNonNegative(obj.applicantAgeYears, defaults.applicantAgeYears, 80)),
      ),
    ),
    occupationRoute: readEnum(obj.occupationRoute, toVisaOccupationRoute, defaults.occupationRoute),
    germanLevel: readEnum(obj.germanLevel, toGermanLanguageLevel, defaults.germanLevel),
    hasCompanyCar: readBoolean(obj.hasCompanyCar, defaults.hasCompanyCar),
    companyCarListPriceEur: toEuroAmount(
      Math.max(5000, readFiniteNonNegative(obj.companyCarListPriceEur, defaults.companyCarListPriceEur)),
    ),
    companyCarPowertrain: readEnum(
      obj.companyCarPowertrain,
      toVehiclePowertrain,
      defaults.companyCarPowertrain,
    ),
    commuteOneWayKm: readFiniteNonNegative(obj.commuteOneWayKm, defaults.commuteOneWayKm, 500),
    commuteOfficeDaysPerMonth: Math.min(
      31,
      Math.round(
        readFiniteNonNegative(
          obj.commuteOfficeDaysPerMonth,
          defaults.commuteOfficeDaysPerMonth,
          31,
        ),
      ),
    ),
    commuteValuationMethod: readEnum(
      obj.commuteValuationMethod,
      toCommuteValuationMethod,
      defaults.commuteValuationMethod,
    ),
    plansSolarPv: readBoolean(obj.plansSolarPv, defaults.plansSolarPv),
    solarCapacityKwp: Math.max(
      0.4,
      Math.min(100, readFiniteNonNegative(obj.solarCapacityKwp, defaults.solarCapacityKwp, 100)),
    ),
    solarSystemCostNetEur: toEuroAmount(
      readFiniteNonNegative(obj.solarSystemCostNetEur, defaults.solarSystemCostNetEur),
    ),
    annualHouseholdElectricityKwh: readFiniteNonNegative(
      obj.annualHouseholdElectricityKwh,
      defaults.annualHouseholdElectricityKwh,
    ),
    solarFeedInMode: readEnum(obj.solarFeedInMode, toSolarFeedInMode, defaults.solarFeedInMode),
    plansHomePurchase: readBoolean(obj.plansHomePurchase, defaults.plansHomePurchase),
    targetPropertyPriceEur: toEuroAmount(
      Math.max(10000, readFiniteNonNegative(obj.targetPropertyPriceEur, defaults.targetPropertyPriceEur)),
    ),
    availableEquityEur: toEuroAmount(
      readFiniteNonNegative(obj.availableEquityEur, defaults.availableEquityEur),
    ),
    includesBrokerCommission: readBoolean(
      obj.includesBrokerCommission,
      defaults.includesBrokerCommission,
    ),
    isKfw300NewBuild: readBoolean(obj.isKfw300NewBuild, defaults.isKfw300NewBuild),
    isQngPlusCertified: readBoolean(obj.isQngPlusCertified, defaults.isQngPlusCertified),
    annualRenovationLaborEur: toEuroAmount(
      readFiniteNonNegative(obj.annualRenovationLaborEur, defaults.annualRenovationLaborEur),
    ),
    assumedMarginalTaxAndSocialRate: toPercentageRate(
      Math.max(
        0,
        Math.min(
          0.6,
          readFiniteNonNegative(
            obj.assumedMarginalTaxAndSocialRate,
            defaults.assumedMarginalTaxAndSocialRate,
            0.6,
          ),
        ),
      ),
    ),
  });
}
