import {
  buildFormulaEvaluationAudit,
} from "#engine/formulas/context/statutoryContext";
import {
  STATUTORY_FORMULA_DESCRIPTORS,
} from "#engine/formulas/context/statutoryEvaluators";
import {
  type CompanyCarBenefitFormulaResult,
  type CommuteValuationMethod,
  type VehiclePowertrain,
  evaluateCompanyCarBenefitFormula,
} from "#engine/formulas/pure/companyCarFormulas";
import {
  type GermanFederalState,
  type HousingAcquisitionFormulaResult,
  evaluateHousingAcquisitionFormula,
} from "#engine/formulas/pure/housingFormulas";
import {
  type SolarEnergyYieldFormulaResult,
  type SolarFeedInMode,
  evaluateSolarEnergyYieldFormula,
} from "#engine/formulas/pure/solarEnergyFormulas";
import {
  type BlueCardEligibilityFormulaResult,
  type GermanLanguageLevel,
  type OpportunityCardPointsFormulaResult,
  type VisaOccupationRoute,
  evaluateBlueCardEligibilityFormula,
  evaluateOpportunityCardPointsFormula,
} from "#engine/formulas/pure/visaFormulas";
import {
  type FormulaEvaluationResult,
  type StatutoryCalculationContext,
  CalculationTier,
  FormulaId,
} from "#engine/formulas/types";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  type EuroAmount,
  type GrossSalary,
  type PercentageRate,
} from "#engine/types";

/**
 * Tier 2 Immutable Context-Aware Evaluators for Track 3 Domain Calculators:
 * Visa / Blue Card (§§ 18g, 18c, 20a AufenthG), Company Car (§§ 6, 8 EStG),
 * Solar & Green Energy (§ 48 EEG, § 3 Nr. 72 EStG, § 12 Abs. 3 UStG), and
 * Housing & KfW 300 (§ 11 GrEStG, § 35a EStG).
 */

export function evaluateBlueCardEligibilityInContext(
  inputs: Readonly<{
    readonly annualGrossSalary: GrossSalary;
    readonly applicantAgeYears: number;
    readonly occupationRoute: VisaOccupationRoute;
    readonly germanLevel: GermanLanguageLevel;
  }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<BlueCardEligibilityFormulaResult> {
  const result = evaluateBlueCardEligibilityFormula({
    annualGrossSalary: inputs.annualGrossSalary,
    applicantAgeYears: inputs.applicantAgeYears,
    occupationRoute: inputs.occupationRoute,
    germanLevel: inputs.germanLevel,
    blueCardStandardSalaryThreshold: context.getParameterEuroAmount(
      ParameterId.Visa_BlueCardStandardSalary,
    ),
    blueCardShortageSalaryThreshold: context.getParameterEuroAmount(
      ParameterId.Visa_BlueCardShortageSalary,
    ),
    age45MinimumSalaryFloor: context.getParameterEuroAmount(
      ParameterId.Visa_Age45MinimumSalary,
    ),
    settlementMonthsA1: context.getParameterNumber(ParameterId.Visa_SettlementMonthsA1),
    settlementMonthsB1: context.getParameterNumber(ParameterId.Visa_SettlementMonthsB1),
    opportunityCardMonthlyFunds: context.getParameterEuroAmount(
      ParameterId.Visa_OpportunityCardMonthlyFunds,
    ),
  });
  const descriptor = STATUTORY_FORMULA_DESCRIPTORS[FormulaId.VisaBlueCardEligibility];
  return Object.freeze({
    value: result,
    audit: buildFormulaEvaluationAudit(
      FormulaId.VisaBlueCardEligibility,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      descriptor.consumedParameterIds,
      descriptor.governingLawIds,
    ),
  });
}

export function evaluateOpportunityCardPointsInContext(
  inputs: Readonly<{
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
  }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<OpportunityCardPointsFormulaResult> {
  const result = evaluateOpportunityCardPointsFormula({
    ...inputs,
    monthlySubsistenceFunds: context.getParameterEuroAmount(
      ParameterId.Visa_OpportunityCardMonthlyFunds,
    ),
  });
  const descriptor = STATUTORY_FORMULA_DESCRIPTORS[FormulaId.VisaOpportunityCardPoints];
  return Object.freeze({
    value: result,
    audit: buildFormulaEvaluationAudit(
      FormulaId.VisaOpportunityCardPoints,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      descriptor.consumedParameterIds,
      descriptor.governingLawIds,
    ),
  });
}

export function evaluateCompanyCarBenefitInContext(
  inputs: Readonly<{
    readonly grossListPriceEur: EuroAmount;
    readonly powertrain: VehiclePowertrain;
    readonly commuteOneWayKm: number;
    readonly commuteValuationMethod: CommuteValuationMethod;
    readonly commuteOfficeDaysPerMonth: number;
    readonly combinedMarginalTaxAndSocialRate: PercentageRate;
  }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<CompanyCarBenefitFormulaResult> {
  const result = evaluateCompanyCarBenefitFormula({
    ...inputs,
    iceMonthlyRate: context.getParameterPercentageRate(ParameterId.Car_IceMonthlyRate),
    phevMonthlyRate: context.getParameterPercentageRate(ParameterId.Car_PhevMonthlyRate),
    evMonthlyRate: context.getParameterPercentageRate(ParameterId.Car_EvMonthlyRate),
    evGrossListPriceCap: context.getParameterEuroAmount(ParameterId.Car_EvGrossListPriceCap),
    commuteMonthlyKmRate: context.getParameterPercentageRate(
      ParameterId.Car_CommuteMonthlyKmRate,
    ),
    commuteDailyTripRate: context.getParameterPercentageRate(
      ParameterId.Car_CommuteDailyTripRate,
    ),
  });
  const descriptor = STATUTORY_FORMULA_DESCRIPTORS[FormulaId.CompanyCarBenefitValuation];
  return Object.freeze({
    value: result,
    audit: buildFormulaEvaluationAudit(
      FormulaId.CompanyCarBenefitValuation,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      descriptor.consumedParameterIds,
      descriptor.governingLawIds,
    ),
  });
}

export function evaluateSolarEnergyYieldInContext(
  inputs: Readonly<{
    readonly capacityKwp: number;
    readonly specificYieldKwhPerKwp: number;
    readonly systemCostNetEur: EuroAmount;
    readonly annualMaintenanceEur: EuroAmount;
    readonly annualHouseholdConsumptionKwh: number;
    readonly selfConsumptionShareRate: PercentageRate;
    readonly feedInMode: SolarFeedInMode;
    readonly vatExemptEligible: boolean;
  }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<SolarEnergyYieldFormulaResult> {
  const result = evaluateSolarEnergyYieldFormula({
    ...inputs,
    gridElectricityPriceEurPerKwh: context.getParameterNumber(
      ParameterId.Solar_GridElectricityPriceEur,
    ),
    eegPartialFirst10KwpEur: context.getParameterNumber(
      ParameterId.Solar_EegPartialFeedInFirst10KwpEur,
    ),
    eegFullFirst10KwpEur: context.getParameterNumber(
      ParameterId.Solar_EegFullFeedInFirst10KwpEur,
    ),
    eegPartial10To40KwpEur: context.getParameterNumber(
      ParameterId.Solar_EegPartialFeedIn10To40KwpEur,
    ),
    eegFull10To40KwpEur: context.getParameterNumber(
      ParameterId.Solar_EegFullFeedIn10To40KwpEur,
    ),
    incomeTaxExemptMaxKwp: context.getParameterNumber(
      ParameterId.Solar_IncomeTaxExemptMaxKwp,
    ),
  });
  const descriptor = STATUTORY_FORMULA_DESCRIPTORS[FormulaId.SolarEnergyYieldAndTariff];
  return Object.freeze({
    value: result,
    audit: buildFormulaEvaluationAudit(
      FormulaId.SolarEnergyYieldAndTariff,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      descriptor.consumedParameterIds,
      descriptor.governingLawIds,
    ),
  });
}

export function evaluateHousingAcquisitionInContext(
  inputs: Readonly<{
    readonly purchasePriceEur: EuroAmount;
    readonly availableEquityEur: EuroAmount;
    readonly federalState: GermanFederalState;
    readonly includesBrokerCommission: boolean;
    readonly isOwnerOccupiedNewBuildOrKfw300Standard: boolean;
    readonly isQngPlusCertified: boolean;
    readonly dependentChildrenCount: number;
    readonly priorAverageHouseholdZvEEur: EuroAmount;
    readonly renovationLaborCostEur: EuroAmount;
    readonly marketMortgageAnnualInterestRate: PercentageRate;
    readonly initialAnnualRepaymentRate: PercentageRate;
  }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<HousingAcquisitionFormulaResult> {
  const result = evaluateHousingAcquisitionFormula({
    ...inputs,
    notaryLandRegistryRate: context.getParameterPercentageRate(
      ParameterId.Housing_DefaultNotaryLandRegistryRate,
    ),
    buyerBrokerCommissionRate: context.getParameterPercentageRate(
      ParameterId.Housing_DefaultAgentCommissionRate,
    ),
    kfw300BaseIncomeLimit: context.getParameterEuroAmount(
      ParameterId.Housing_KfW300BaseIncomeLimit,
    ),
    kfw300ExtraChildIncomeIncrement: context.getParameterEuroAmount(
      ParameterId.Housing_KfW300ExtraChildIncomeIncrement,
    ),
    kfw300BaseLoan1To2Children: context.getParameterEuroAmount(
      ParameterId.Housing_KfW300BaseLoan1To2Children,
    ),
    kfw300BaseLoan3To4Children: context.getParameterEuroAmount(
      ParameterId.Housing_KfW300BaseLoan3To4Children,
    ),
    kfw300BaseLoan5PlusChildren: context.getParameterEuroAmount(
      ParameterId.Housing_KfW300BaseLoan5PlusChildren,
    ),
    kfw300QngLoanBonus: context.getParameterEuroAmount(
      ParameterId.Housing_KfW300QngLoanBonus,
    ),
    craftsmanCreditRate: context.getParameterPercentageRate(
      ParameterId.Housing_CraftsmanCreditRate,
    ),
    craftsmanCreditMaxAnnualEur: context.getParameterEuroAmount(
      ParameterId.Housing_CraftsmanCreditMaxAnnualEur,
    ),
  });
  const descriptor = STATUTORY_FORMULA_DESCRIPTORS[FormulaId.HousingAcquisitionAndKfW300];
  return Object.freeze({
    value: result,
    audit: buildFormulaEvaluationAudit(
      FormulaId.HousingAcquisitionAndKfW300,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      descriptor.consumedParameterIds,
      descriptor.governingLawIds,
    ),
  });
}
