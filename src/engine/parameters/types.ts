import {
  type LawId,
} from "#engine/laws/types";
import {
  type FullCalendarYear,
} from "#engine/types";
import {
  type SourceUrl,
} from "#engine/config/benefitRules";

/**
 * Parameter domain classification across all supported calculators.
 */
export const ParameterDomain = {
  IncomeTax: "income_tax",
  SocialSecurity: "social_security",
  ParentalAllowance: "parental_allowance",
  MaternityProtection: "maternity_protection",
  FamilyBenefits: "family_benefits",
  PlanningAssumptions: "planning_assumptions",
  VisaResidence: "visa_residence",
  CompanyCar: "company_car",
  SolarEnergy: "solar_energy",
  HousingProperty: "housing_property",
} as const;
export type ParameterDomain = (typeof ParameterDomain)[keyof typeof ParameterDomain];

/**
 * Mutability classification governing whether a parameter can be customized
 * by users or is protected as a statutory constant / year-indexed legal table.
 */
export const ParameterMutability = {
  StatutoryFixed: "statutory_fixed",
  YearIndexed: "year_indexed",
  Customizable: "customizable",
} as const;
export type ParameterMutability = (typeof ParameterMutability)[keyof typeof ParameterMutability];

/**
 * Display and validation unit for a parameter value.
 */
export const ParameterUnit = {
  MoneyEur: "eur",
  PercentageRate: "rate",
  HoursPerWeek: "hours",
  Months: "months",
  CalendarMonth: "calendar_month",
  Years: "years",
  ChildrenCount: "children",
  DecimalPlaces: "decimal_places",
  Kilowatts: "kwp",
  EurPerKwh: "eur_per_kwh",
} as const;
export type ParameterUnit = (typeof ParameterUnit)[keyof typeof ParameterUnit];

/**
 * Strongly-typed parameter identifiers unifying all JSON rule catalogs across calculators.
 */
export const ParameterId = {
  // Income Tax & Tariff Rules (§ 32a, § 9a, § 10, § 10c, § 24a, § 24b, § 31, § 32, § 66 EStG, SolzG)
  Tax_BasicAllowance: "tax.basicAllowance",
  Tax_Progression1Ceiling: "tax.progression1Ceiling",
  Tax_Progression2Ceiling: "tax.progression2Ceiling",
  Tax_TopRateCeiling: "tax.topRateCeiling",
  Tax_Progression1Quadratic: "tax.progression1Quadratic",
  Tax_Progression1Linear: "tax.progression1Linear",
  Tax_Progression2Quadratic: "tax.progression2Quadratic",
  Tax_Progression2Linear: "tax.progression2Linear",
  Tax_Progression2Constant: "tax.progression2Constant",
  Tax_TopRate: "tax.topRate",
  Tax_TopOffset: "tax.topOffset",
  Tax_HighestRate: "tax.highestRate",
  Tax_HighestOffset: "tax.highestOffset",
  Tax_TariffDivisor: "tax.tariffDivisor",
  Tax_ProgressionRatePercentDecimalPlaces: "tax.progressionRatePercentDecimalPlaces",
  Tax_WorkExpenseAllowance: "tax.workExpenseAllowance",
  Tax_SpecialExpenseAllowance: "tax.specialExpenseAllowance",
  Tax_SingleParentRelief: "tax.singleParentRelief",
  Tax_SingleParentExtraChildRelief: "tax.singleParentExtraChildRelief",
  Tax_ChurchRateBavariaBadenWuerttemberg: "tax.churchRateBavariaBadenWuerttemberg",
  Tax_ChurchRateOther: "tax.churchRateOther",
  Tax_SolidarityRate: "tax.solidarityRate",
  Tax_SolidarityMitigationRate: "tax.solidarityMitigationRate",
  Tax_SolidarityExemptionSingle: "tax.solidarityExemptionSingle",
  Tax_ChildAllowanceAnnual: "tax.childAllowanceAnnual",
  Tax_ChildBenefitMonthly: "tax.childBenefitMonthly",
  Tax_HealthDeductibleFraction: "tax.healthDeductibleFraction",
  Tax_PensionDeductibleFraction: "tax.pensionDeductibleFraction",
  Tax_OtherInsuranceDeductionLimit: "tax.otherInsuranceDeductionLimit",
  Tax_AgeReliefMinimumAge: "tax.ageReliefMinimumAge",
  Tax_ChildcareDeductibleFraction: "tax.childcareDeductibleFraction",
  Tax_ChildcareMaxDeductionPerChild: "tax.childcareMaxDeductionPerChild",
  Tax_ChildcareMaxAgeYears: "tax.childcareMaxAgeYears",

  // Social Security & Payroll Contribution Rules (SGB III, IV, V, VI, XI)
  Tax_HealthCapMonthly: "tax.healthCapMonthly",
  Tax_PensionCapMonthly: "tax.pensionCapMonthly",
  Tax_TransitionFlatRate: "tax.transitionFlatRate",
  Tax_PriorYearBonusAllocationLastMonth: "tax.priorYearBonusAllocationLastMonth",
  Tax_HealthEmployeeRate: "tax.healthEmployeeRate",
  Tax_HealthSupplementTotalRate: "tax.healthSupplementTotalRate",
  Tax_PensionEmployeeRate: "tax.pensionEmployeeRate",
  Tax_UnemploymentEmployeeRate: "tax.unemploymentEmployeeRate",
  Tax_CareEmployeeBaseRate: "tax.careEmployeeBaseRate",
  Tax_CareChildlessSurcharge: "tax.careChildlessSurcharge",
  Tax_CareChildDiscount: "tax.careChildDiscount",
  Tax_CareMaximumDiscountChildren: "tax.careMaximumDiscountChildren",
  Tax_CareChildAgeLimit: "tax.careChildAgeLimit",
  Tax_CareChildlessMinimumAge: "tax.careChildlessMinimumAge",
  Tax_CareSaxonyExtraEmployeeRate: "tax.careSaxonyExtraEmployeeRate",

  // Benefit Rules (BEEG & MuSchG)
  Benefit_StandardReplacementRate: "benefit.standardReplacementRate",
  Benefit_MinimumReplacementRate: "benefit.minimumReplacementRate",
  Benefit_MaximumReplacementRate: "benefit.maximumReplacementRate",
  Benefit_LowIncomeThreshold: "benefit.lowIncomeThreshold",
  Benefit_RateDecreaseThreshold: "benefit.rateDecreaseThreshold",
  Benefit_MinimumRateThreshold: "benefit.minimumRateThreshold",
  Benefit_RateChangePerEuro: "benefit.rateChangePerEuro",
  Benefit_MaximumAssessableNet: "benefit.maximumAssessableNet",
  Benefit_BasisMinimum: "benefit.basisMinimum",
  Benefit_BasisMaximum: "benefit.basisMaximum",
  Benefit_PlusFraction: "benefit.plusFraction",
  Benefit_SiblingMinimumBasis: "benefit.siblingMinimumBasis",
  Benefit_SiblingRate: "benefit.siblingRate",
  Benefit_SiblingAgeLimitMonths: "benefit.siblingAgeLimitMonths",
  Benefit_SiblingMultipleAgeLimitMonths: "benefit.siblingMultipleAgeLimitMonths",
  Benefit_SiblingMultipleMinimumCount: "benefit.siblingMultipleMinimumCount",
  Benefit_MaximumWeeklyHours: "benefit.maximumWeeklyHours",
  Benefit_PartnershipMinimumHours: "benefit.partnershipMinimumHours",
  Benefit_PartnershipMinimumMonths: "benefit.partnershipMinimumMonths",
  Benefit_PartnershipMaximumMonths: "benefit.partnershipMaximumMonths",
  Benefit_AssessmentMonths: "benefit.assessmentMonths",
  Benefit_FamilyBasisMonths: "benefit.familyBasisMonths",
  Benefit_AdditionalPartnerBasisMonths: "benefit.additionalPartnerBasisMonths",
  Benefit_MinimumParentClaimMonths: "benefit.minimumParentClaimMonths",
  Benefit_StandardHealthCareDeduction: "benefit.standardHealthCareDeduction",
  Benefit_StandardPensionDeduction: "benefit.standardPensionDeduction",
  Benefit_StandardUnemploymentDeduction: "benefit.standardUnemploymentDeduction",
  Benefit_StandardChurchTaxRate: "benefit.standardChurchTaxRate",
  Benefit_OlderBenefitExclusionLifeMonths: "benefit.olderBenefitExclusionLifeMonths",
  Benefit_TransitionFlatRate: "benefit.transitionFlatRate",
  Benefit_MaternityAverageMonths: "benefit.maternityAverageMonths",
  Benefit_CoupleTaxableIncomeMaximum: "benefit.coupleTaxableIncomeMaximum",

  // Employment Corridor Thresholds (§ 8, § 20 SGB IV)
  Employment_MarginalLimitMonthly: "employment.marginalLimitMonthly",
  Employment_TransitionCeilingMonthly: "employment.transitionCeilingMonthly",

  // Planning Conventions & Default Assumptions
  Convention_MaternityPreBirthMonths: "convention.maternityPreBirthMonths",
  Convention_MaternityPostBirthMonths: "convention.maternityPostBirthMonths",
  Convention_MotherOrdinaryPlusMonths: "convention.motherOrdinaryPlusMonths",
  Convention_PartnershipBonusMonths: "convention.partnershipBonusMonths",
  Planning_AnnualInflationRate: "planning.annualInflationRate",
  Planning_AnnualWageGrowthRate: "planning.annualWageGrowthRate",
  Planning_AnnualBracketIndexRate: "planning.annualBracketIndexRate",

  // Visa & Residence Thresholds (AufenthG)
  Visa_BlueCardStandardSalary: "visa.blueCardStandardSalary",
  Visa_BlueCardShortageSalary: "visa.blueCardShortageSalary",
  Visa_Age45MinimumSalary: "visa.age45MinimumSalary",
  Visa_SettlementMonthsA1: "visa.settlementMonthsA1",
  Visa_SettlementMonthsB1: "visa.settlementMonthsB1",
  Visa_OpportunityCardMonthlyFunds: "visa.opportunityCardMonthlyFunds",

  // Company Car & Electric Mobility (§ 6 Abs. 1 Nr. 4, § 8 Abs. 2 EStG)
  Car_IceMonthlyRate: "car.iceMonthlyRate",
  Car_PhevMonthlyRate: "car.phevMonthlyRate",
  Car_EvMonthlyRate: "car.evMonthlyRate",
  Car_EvGrossListPriceCap: "car.evGrossListPriceCap",
  Car_CommuteMonthlyKmRate: "car.commuteMonthlyKmRate",
  Car_CommuteDailyTripRate: "car.commuteDailyTripRate",

  // Residential Solar PV & Energy (§ 48 EEG, § 3 Nr. 72 EStG, § 12 Abs. 3 UStG)
  Solar_EegPartialFeedInFirst10KwpEur: "solar.eegPartialFeedInFirst10KwpEur",
  Solar_EegFullFeedInFirst10KwpEur: "solar.eegFullFeedInFirst10KwpEur",
  Solar_EegPartialFeedIn10To40KwpEur: "solar.eegPartialFeedIn10To40KwpEur",
  Solar_EegFullFeedIn10To40KwpEur: "solar.eegFullFeedIn10To40KwpEur",
  Solar_IncomeTaxExemptMaxKwp: "solar.incomeTaxExemptMaxKwp",
  Solar_GridElectricityPriceEur: "solar.gridElectricityPriceEur",

  // Housing, KfW 300 & Closing Rules
  Housing_KfW300BaseIncomeLimit: "housing.kfw300BaseIncomeLimit",
  Housing_KfW300ExtraChildIncomeIncrement: "housing.kfw300ExtraChildIncomeIncrement",
  Housing_KfW300BaseLoan1To2Children: "housing.kfw300BaseLoan1To2Children",
  Housing_KfW300BaseLoan3To4Children: "housing.kfw300BaseLoan3To4Children",
  Housing_KfW300BaseLoan5PlusChildren: "housing.kfw300BaseLoan5PlusChildren",
  Housing_KfW300QngLoanBonus: "housing.kfw300QngLoanBonus",
  Housing_CraftsmanCreditRate: "housing.craftsmanCreditRate",
  Housing_CraftsmanCreditMaxAnnualEur: "housing.craftsmanCreditMaxAnnualEur",
  Housing_DefaultNotaryLandRegistryRate: "housing.defaultNotaryLandRegistryRate",
  Housing_DefaultAgentCommissionRate: "housing.defaultAgentCommissionRate",
} as const;
export type ParameterId = (typeof ParameterId)[keyof typeof ParameterId];

/**
 * Year-specific statutory value entry for year-indexed parameters.
 */
export interface ParameterYearEntry {
  readonly year: FullCalendarYear;
  readonly value: number;
  readonly source: SourceUrl;
  readonly note?: string;
}

/**
 * Validation constraints for a parameter value.
 */
export interface ParameterBounds {
  readonly min: number;
  readonly max?: number;
  readonly integerOnly?: boolean;
}

/**
 * Complete typed parameter definition in the central parameter value storage.
 */
export interface ParameterDefinition {
  readonly id: ParameterId;
  readonly label: string;
  readonly description: string;
  readonly domain: ParameterDomain;
  readonly unit: ParameterUnit;
  readonly mutability: ParameterMutability;
  readonly lawIds: readonly LawId[];
  readonly defaultValue: number;
  readonly source: SourceUrl;
  readonly yearEntries?: Readonly<Partial<Record<FullCalendarYear, ParameterYearEntry>>>;
  readonly bounds: ParameterBounds;
}

/**
 * Resolved runtime parameter value for a specific calendar year and override map.
 */
export interface ResolvedParameterValue {
  readonly definition: ParameterDefinition;
  readonly requestedYear: FullCalendarYear;
  readonly sourceYear?: FullCalendarYear;
  readonly baselineValue: number;
  readonly activeValue: number;
  readonly source: SourceUrl;
  readonly projected: boolean;
  readonly overridden: boolean;
  readonly editable: boolean;
}

/**
 * Flag reason code raised when an unmodifiable or invalid parameter edit is attempted.
 */
export const ParameterFlagCode = {
  StatutoryFixedLocked: "statutory_fixed_locked",
  YearIndexedLocked: "year_indexed_locked",
  InvalidBounds: "invalid_bounds",
} as const;
export type ParameterFlagCode = (typeof ParameterFlagCode)[keyof typeof ParameterFlagCode];

/**
 * Explicit flag raised whenever a user or caller attempts to mutate an unmodifiable
 * statutory parameter or supplies a value outside allowed bounds.
 */
export interface ParameterModificationFlag {
  readonly parameterId: ParameterId;
  readonly parameterLabel: string;
  readonly code: ParameterFlagCode;
  readonly attemptedValue: number;
  readonly message: string;
  readonly lawIds: readonly LawId[];
}

/**
 * Result returned when attempting to modify a parameter value in the unified store.
 */
export type ParameterModificationResult =
  | {
    readonly ok: true;
    readonly value: number;
  }
  | {
    readonly ok: false;
    readonly flag: ParameterModificationFlag;
  };

function createEnumParser<T extends string>(
  enumObj: Record<string, T>,
  typeName: string,
): (value: string) => T {
  const validValues = new Set<string>(Object.values(enumObj));
  return (value: string): T => {
    if (!validValues.has(value)) {
      throw new TypeError(`Invalid ${typeName}: ${value}`);
    }
    return value as T;
  };
}

/** Validates and returns a `ParameterId` enum value. */
export const toParameterId = createEnumParser(ParameterId, "ParameterId");

/** Validates and returns a `ParameterDomain` enum value. */
export const toParameterDomain = createEnumParser(ParameterDomain, "ParameterDomain");

/** Validates and returns a `ParameterMutability` enum value. */
export const toParameterMutability = createEnumParser(ParameterMutability, "ParameterMutability");

/** Validates and returns a `ParameterUnit` enum value. */
export const toParameterUnit = createEnumParser(ParameterUnit, "ParameterUnit");

/** Returns true when `value` matches a registered `ParameterId`. */
export function isParameterId(value: string): value is ParameterId {
  return (Object.values(ParameterId) as readonly string[]).includes(value);
}

/** Human-readable domain labels. */
export const PARAMETER_DOMAIN_LABELS: Readonly<Record<ParameterDomain, string>> = Object.freeze({
  [ParameterDomain.IncomeTax]: "Income Tax",
  [ParameterDomain.SocialSecurity]: "Social Security",
  [ParameterDomain.ParentalAllowance]: "Parental Allowance",
  [ParameterDomain.MaternityProtection]: "Maternity Protection",
  [ParameterDomain.FamilyBenefits]: "Family Benefits",
  [ParameterDomain.PlanningAssumptions]: "Planning Assumptions",
  [ParameterDomain.VisaResidence]: "Visa & Residence",
  [ParameterDomain.CompanyCar]: "Company Car & Mobility",
  [ParameterDomain.SolarEnergy]: "Solar & Green Energy",
  [ParameterDomain.HousingProperty]: "Housing & KfW 300",
});

/** Human-readable mutability policy labels. */
export const PARAMETER_MUTABILITY_LABELS: Readonly<Record<ParameterMutability, string>> = Object.freeze({
  [ParameterMutability.StatutoryFixed]: "Statutory Fixed",
  [ParameterMutability.YearIndexed]: "Year-Indexed Statute",
  [ParameterMutability.Customizable]: "Customizable",
});
