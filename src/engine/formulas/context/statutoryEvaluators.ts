import {
  buildFormulaEvaluationAudit,
} from "#engine/formulas/context/statutoryContext";
import {
  type ChildPaidFeeEntry,
  type ChildcareTaxDeductionFormulaResult,
  type MunicipalDaycareFeeFormulaResult,
  type MunicipalDaycareIncomeBracket,
  evaluateChildcareTaxDeductionFormula,
  evaluateMunicipalDaycareFeeFormula,
} from "#engine/formulas/pure/childcareFormulas";
import {
  type IncomeTaxTariffConstants,
  type ProgressionRateTaxFormulaResult,
  evaluateIncomeTaxTariffFormula,
  evaluateIncomeTaxZoneFormula,
  evaluateProgressionRateTaxFormula,
  evaluateSolidaritySurchargeFormula,
  evaluateSplittingTaxTariffFormula,
} from "#engine/formulas/pure/incomeTaxFormulas";
import {
  type PurchasingPowerDiscountFormulaResult,
  evaluateCompoundedWageGrowthFormula,
  evaluateIndexedTaxBracketsFormula,
  evaluatePurchasingPowerDiscountFormula,
} from "#engine/formulas/pure/inflationFormulas";
import {
  type ChildAllowanceFavorabilityFormulaResult,
  type MaternityProtectionBenefitFormulaResult,
  type MonthlyVariantSelectionFormulaResult,
  type OverlapCreditedPaymentFormulaResult,
  type ParentalAllowanceBudgetFormulaResult,
  type ParentalBenefitEntitlementFormulaResult,
  type SiblingBonusFormulaResult,
  evaluateAllowanceVariantMonthConversionFormula,
  evaluateAllowanceVariantWeightFormula,
  evaluateChildAllowanceFavorabilityFormula,
  evaluateMaternityProtectionBenefitFormula,
  evaluateMonthlyVariantSelectionFormula,
  evaluateOverlapCreditedPaymentFormula,
  evaluateParentalAllowanceBudgetFormula,
  evaluateParentalBenefitEntitlementFormula,
  evaluateParentalReplacementRateFormula,
  evaluatePartnershipBonusHoursEligibilityFormula,
  evaluateSiblingBonusFormula,
} from "#engine/formulas/pure/parentalBenefitFormulas";
import {
  type CareInsuranceContributionResult,
  type TransitionZoneAssessmentBasesResult,
  evaluateBenefitTransitionContributionBaseFormula,
  evaluateCareInsuranceContributionFormula,
  evaluateHealthInsuranceContributionFormula,
  evaluateTransitionZoneAssessmentBasesFormula,
  evaluateTransitionZoneFactorFormula,
} from "#engine/formulas/pure/socialContributionFormulas";
import {
  type FormulaEvaluationResult,
  type StatutoryCalculationContext,
  type StatutoryFormulaDescriptor,
  CalculationTier,
  FormulaDomain,
  FormulaId,
} from "#engine/formulas/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  type EuroAmount,
  type GrossSalary,
  type MonthDuration,
  type NetSalary,
  type PercentageRate,
  type WageTaxZone,
  type WorkingHours,
  type AllowancePlanMode,
  ElterngeldVariant,
  toEuroAmount,
  toMonthDuration,
  toNetSalary,
  toWorkingHours,
} from "#engine/types";

/**
 * Tier 2 Immutable, Context-Aware Statutory Evaluators.
 *
 * Each evaluator accepts domain inputs alongside an immutable `StatutoryCalculationContext`,
 * extracts all required statutory constants from the Unified Law-Linked Parameter Value Storage,
 * delegates computation to Tier 1 pure mathematical formulas, and emits a `FormulaEvaluationResult`
 * carrying full legal (`LawId[]`) and parameter (`ParameterId[]`) audit provenance.
 */

const STATUTORY_DAILY_MATERNITY_HEALTH_INSURANCE_CAP = toEuroAmount(13);
const STATUTORY_DAYS_PER_CALENDAR_MONTH = 30;

const INCOME_TAX_TARIFF_PARAMETER_IDS: readonly ParameterId[] = Object.freeze([
  ParameterId.Tax_BasicAllowance,
  ParameterId.Tax_Progression1Ceiling,
  ParameterId.Tax_Progression2Ceiling,
  ParameterId.Tax_TopRateCeiling,
  ParameterId.Tax_TariffDivisor,
  ParameterId.Tax_Progression1Quadratic,
  ParameterId.Tax_Progression1Linear,
  ParameterId.Tax_Progression2Quadratic,
  ParameterId.Tax_Progression2Linear,
  ParameterId.Tax_Progression2Constant,
  ParameterId.Tax_TopRate,
  ParameterId.Tax_TopOffset,
  ParameterId.Tax_HighestRate,
  ParameterId.Tax_HighestOffset,
]);

const PARENTAL_REPLACEMENT_PARAMETER_IDS: readonly ParameterId[] = Object.freeze([
  ParameterId.Benefit_StandardReplacementRate,
  ParameterId.Benefit_MinimumReplacementRate,
  ParameterId.Benefit_MaximumReplacementRate,
  ParameterId.Benefit_LowIncomeThreshold,
  ParameterId.Benefit_RateDecreaseThreshold,
  ParameterId.Benefit_MinimumRateThreshold,
  ParameterId.Benefit_RateChangePerEuro,
]);

const PARENTAL_ENTITLEMENT_PARAMETER_IDS: readonly ParameterId[] = Object.freeze([
  ...PARENTAL_REPLACEMENT_PARAMETER_IDS,
  ParameterId.Benefit_MaximumAssessableNet,
  ParameterId.Benefit_BasisMinimum,
  ParameterId.Benefit_BasisMaximum,
  ParameterId.Benefit_PlusFraction,
  ParameterId.Benefit_MaximumWeeklyHours,
]);

const TRANSITION_FACTOR_PARAMETER_IDS: readonly ParameterId[] = Object.freeze([
  ParameterId.Tax_TransitionFlatRate,
  ParameterId.Tax_HealthEmployeeRate,
  ParameterId.Tax_HealthSupplementTotalRate,
  ParameterId.Tax_PensionEmployeeRate,
  ParameterId.Tax_UnemploymentEmployeeRate,
  ParameterId.Tax_CareEmployeeBaseRate,
]);

const TRANSITION_BASES_PARAMETER_IDS: readonly ParameterId[] = Object.freeze([
  ...TRANSITION_FACTOR_PARAMETER_IDS,
  ParameterId.Employment_MarginalLimitMonthly,
  ParameterId.Employment_TransitionCeilingMonthly,
]);

/**
 * Central catalog mapping every `FormulaId` to its governing laws and consumed parameter keys.
 */
export const STATUTORY_FORMULA_DESCRIPTORS: Readonly<Record<FormulaId, StatutoryFormulaDescriptor>> = Object.freeze({
  [FormulaId.IncomeTaxTariffZone]: Object.freeze({
    id: FormulaId.IncomeTaxTariffZone,
    label: "Income Tax Tariff Zone",
    domain: FormulaDomain.IncomeTax,
    description: "Classifies annual taxable income (ZvE) into § 32a Abs. 1 EStG tariff zones.",
    governingLawIds: Object.freeze([LawId.EStG_32a]),
    consumedParameterIds: Object.freeze([
      ParameterId.Tax_BasicAllowance,
      ParameterId.Tax_Progression1Ceiling,
      ParameterId.Tax_Progression2Ceiling,
      ParameterId.Tax_TopRateCeiling,
    ]),
  }),
  [FormulaId.AnnualIncomeTaxTariff]: Object.freeze({
    id: FormulaId.AnnualIncomeTaxTariff,
    label: "Annual Income Tax Tariff (§ 32a EStG)",
    domain: FormulaDomain.IncomeTax,
    description: "Evaluates statutory progressive German income tax from floored taxable income.",
    governingLawIds: Object.freeze([LawId.EStG_32a]),
    consumedParameterIds: INCOME_TAX_TARIFF_PARAMETER_IDS,
  }),
  [FormulaId.SpousalSplittingIncomeTax]: Object.freeze({
    id: FormulaId.SpousalSplittingIncomeTax,
    label: "Spousal Splitting Tariff (§ 32a Abs. 5 EStG)",
    domain: FormulaDomain.IncomeTax,
    description: "Doubles the individual tariff applied to half of combined spousal taxable income.",
    governingLawIds: Object.freeze([LawId.EStG_26b, LawId.EStG_32a]),
    consumedParameterIds: INCOME_TAX_TARIFF_PARAMETER_IDS,
  }),
  [FormulaId.JointProgressionRateTax]: Object.freeze({
    id: FormulaId.JointProgressionRateTax,
    label: "Joint Progression-Clause Tax (§ 32b EStG)",
    domain: FormulaDomain.IncomeTax,
    description: "Applies special tax rate derived from taxable income plus tax-exempt progression benefits.",
    governingLawIds: Object.freeze([LawId.EStG_32b, LawId.EStG_32a, LawId.EStG_26b]),
    consumedParameterIds: Object.freeze([
      ...INCOME_TAX_TARIFF_PARAMETER_IDS,
      ParameterId.Tax_ProgressionRatePercentDecimalPlaces,
    ]),
  }),
  [FormulaId.SolidaritySurcharge]: Object.freeze({
    id: FormulaId.SolidaritySurcharge,
    label: "Solidarity Surcharge (SolzG)",
    domain: FormulaDomain.IncomeTax,
    description: "Computes SolzG § 4 exemption threshold, mitigation slope, and 5.5% ceiling.",
    governingLawIds: Object.freeze([LawId.SolzG_3, LawId.SolzG_4]),
    consumedParameterIds: Object.freeze([
      ParameterId.Tax_SolidarityExemptionSingle,
      ParameterId.Tax_SolidarityRate,
      ParameterId.Tax_SolidarityMitigationRate,
    ]),
  }),
  [FormulaId.MonthlySwapWithholdingVariance]: Object.freeze({
    id: FormulaId.MonthlySwapWithholdingVariance,
    label: "Tax Class III/V Swap Withholding Variance",
    domain: FormulaDomain.IncomeTax,
    description: "Measures temporary monthly household withholding cashflow variance under § 38b EStG.",
    governingLawIds: Object.freeze([LawId.EStG_38b, LawId.BEEG_2e]),
    consumedParameterIds: Object.freeze([]),
  }),
  [FormulaId.ChildAllowanceFavorabilityCheck]: Object.freeze({
    id: FormulaId.ChildAllowanceFavorabilityCheck,
    label: "Child Allowance Favorability (§ 31 EStG)",
    domain: FormulaDomain.FamilyBenefits,
    description: "Compares Kinderfreibetrag + BEA income tax savings against Kindergeld payments.",
    governingLawIds: Object.freeze([LawId.EStG_31, LawId.EStG_32, LawId.EStG_66, LawId.EStG_32a, LawId.EStG_32b]),
    consumedParameterIds: Object.freeze([
      ...INCOME_TAX_TARIFF_PARAMETER_IDS,
      ParameterId.Tax_ProgressionRatePercentDecimalPlaces,
      ParameterId.Tax_ChildAllowanceAnnual,
      ParameterId.Tax_ChildBenefitMonthly,
    ]),
  }),
  [FormulaId.TransitionZoneFactor]: Object.freeze({
    id: FormulaId.TransitionZoneFactor,
    label: "Midijob Transition Factor F (§ 20 SGB IV)",
    domain: FormulaDomain.SocialSecurity,
    description: "Computes transition-zone factor F from statutory employer/employee contribution sums.",
    governingLawIds: Object.freeze([LawId.SGB4_20]),
    consumedParameterIds: TRANSITION_FACTOR_PARAMETER_IDS,
  }),
  [FormulaId.TransitionZoneAssessmentBases]: Object.freeze({
    id: FormulaId.TransitionZoneAssessmentBases,
    label: "Midijob Assessment Bases (§ 20 Abs. 2a SGB IV)",
    domain: FormulaDomain.SocialSecurity,
    description: "Derives reduced employee and total assessment bases inside the €603–€2,000 transition zone.",
    governingLawIds: Object.freeze([LawId.SGB4_20]),
    consumedParameterIds: TRANSITION_BASES_PARAMETER_IDS,
  }),
  [FormulaId.HealthInsuranceContribution]: Object.freeze({
    id: FormulaId.HealthInsuranceContribution,
    label: "Employee Health Insurance Contribution (§ 241 SGB V)",
    domain: FormulaDomain.SocialSecurity,
    description: "Rounds general health contribution and insurer half-supplement separately per § 2 BVV.",
    governingLawIds: Object.freeze([LawId.SGB5_241, LawId.BVV_2]),
    consumedParameterIds: Object.freeze([
      ParameterId.Tax_HealthEmployeeRate,
      ParameterId.Tax_HealthSupplementTotalRate,
    ]),
  }),
  [FormulaId.CareInsuranceContribution]: Object.freeze({
    id: FormulaId.CareInsuranceContribution,
    label: "Employee Nursing Care Contribution (§ 55 SGB XI)",
    domain: FormulaDomain.SocialSecurity,
    description: "Computes base rate, childless surcharge, child discounts, and Saxony adjustment.",
    governingLawIds: Object.freeze([LawId.SGB11_55, LawId.SGB11_58]),
    consumedParameterIds: Object.freeze([
      ParameterId.Tax_CareEmployeeBaseRate,
      ParameterId.Tax_CareSaxonyExtraEmployeeRate,
      ParameterId.Tax_CareChildlessSurcharge,
      ParameterId.Tax_CareChildDiscount,
    ]),
  }),
  [FormulaId.BenefitTransitionContributionBase]: Object.freeze({
    id: FormulaId.BenefitTransitionContributionBase,
    label: "BEEG Midijob Standardized Contribution Base (§ 2f BEEG)",
    domain: FormulaDomain.ParentalAllowance,
    description: "Evaluates BEEG synthetic-net contribution base using flat 9%/10%/2% social deductions.",
    governingLawIds: Object.freeze([LawId.BEEG_2f, LawId.SGB4_20]),
    consumedParameterIds: Object.freeze([
      ParameterId.Employment_MarginalLimitMonthly,
      ParameterId.Employment_TransitionCeilingMonthly,
      ParameterId.Benefit_TransitionFlatRate,
      ParameterId.Benefit_StandardHealthCareDeduction,
      ParameterId.Benefit_StandardPensionDeduction,
      ParameterId.Benefit_StandardUnemploymentDeduction,
    ]),
  }),
  [FormulaId.ParentalWageReplacementRate]: Object.freeze({
    id: FormulaId.ParentalWageReplacementRate,
    label: "Elterngeld Replacement Rate (§ 2 BEEG)",
    domain: FormulaDomain.ParentalAllowance,
    description: "Evaluates sliding wage replacement scale between 65%, 67%, and 100%.",
    governingLawIds: Object.freeze([LawId.BEEG_2]),
    consumedParameterIds: PARENTAL_REPLACEMENT_PARAMETER_IDS,
  }),
  [FormulaId.ParentalWeeklyHoursEligibility]: Object.freeze({
    id: FormulaId.ParentalWeeklyHoursEligibility,
    label: "Elterngeld Hours Cap Eligibility (§ 1 Abs. 6 BEEG)",
    domain: FormulaDomain.ParentalAllowance,
    description: "Verifies that weekly working hours do not exceed the statutory 32h limit.",
    governingLawIds: Object.freeze([LawId.BEEG_1]),
    consumedParameterIds: Object.freeze([ParameterId.Benefit_MaximumWeeklyHours]),
  }),
  [FormulaId.PartnershipBonusHoursEligibility]: Object.freeze({
    id: FormulaId.PartnershipBonusHoursEligibility,
    label: "Partnership Bonus Hours Eligibility (§ 4b BEEG)",
    domain: FormulaDomain.ParentalAllowance,
    description: "Verifies both parents work 24–32 hours/week simultaneously for § 4b BEEG.",
    governingLawIds: Object.freeze([LawId.BEEG_4b, LawId.BEEG_1]),
    consumedParameterIds: Object.freeze([
      ParameterId.Benefit_PartnershipMinimumHours,
      ParameterId.Benefit_MaximumWeeklyHours,
    ]),
  }),
  [FormulaId.ParentalAllowanceEntitlement]: Object.freeze({
    id: FormulaId.ParentalAllowanceEntitlement,
    label: "Parental Allowance Entitlement (§§ 2, 4, 4a BEEG)",
    domain: FormulaDomain.ParentalAllowance,
    description: "Computes Basiselterngeld and ElterngeldPlus floors, personal ceilings, and caps.",
    governingLawIds: Object.freeze([LawId.BEEG_1, LawId.BEEG_2, LawId.BEEG_4, LawId.BEEG_4a]),
    consumedParameterIds: PARENTAL_ENTITLEMENT_PARAMETER_IDS,
  }),
  [FormulaId.ParentalAllowanceBudget]: Object.freeze({
    id: FormulaId.ParentalAllowanceBudget,
    label: "Parental Allowance Basis-Unit Budget (§§ 4, 4a, 4b BEEG)",
    domain: FormulaDomain.ParentalAllowance,
    description: "Evaluates statutory individual (12 Basis units) and family (12/14 Basis units) allowance budgets across Mutterschutz, Basiselterngeld, and ElterngeldPlus.",
    governingLawIds: Object.freeze([LawId.BEEG_4, LawId.BEEG_4a, LawId.BEEG_4b, LawId.MuSchG_3]),
    consumedParameterIds: Object.freeze([
      ParameterId.Benefit_FamilyBasisMonths,
      ParameterId.Benefit_AdditionalPartnerBasisMonths,
      ParameterId.Benefit_MinimumParentClaimMonths,
      ParameterId.Benefit_PlusFraction,
      ParameterId.Convention_MaternityPostBirthMonths,
      ParameterId.Convention_PartnershipBonusMonths,
    ]),
  }),
  [FormulaId.ParentalAllowanceVariantConversion]: Object.freeze({
    id: FormulaId.ParentalAllowanceVariantConversion,
    label: "Basiselterngeld / ElterngeldPlus Month Conversion (§§ 4, 4a BEEG)",
    domain: FormulaDomain.ParentalAllowance,
    description: "Converts ordinary allowance month counts between Basiselterngeld and ElterngeldPlus within remaining statutory capacity.",
    governingLawIds: Object.freeze([LawId.BEEG_4, LawId.BEEG_4a]),
    consumedParameterIds: Object.freeze([ParameterId.Benefit_PlusFraction]),
  }),
  [FormulaId.ParentalMonthlyVariantSelection]: Object.freeze({
    id: FormulaId.ParentalMonthlyVariantSelection,
    label: "Monthly Basiselterngeld vs. ElterngeldPlus Selection (§§ 1, 4, 4a BEEG)",
    domain: FormulaDomain.ParentalAllowance,
    description: "Selects Basiselterngeld (0h full leave within LM 1–14) or ElterngeldPlus (part-time or post-LM 14) per life-month within statutory Basis-unit budgets.",
    governingLawIds: Object.freeze([LawId.BEEG_1, LawId.BEEG_4, LawId.BEEG_4a]),
    consumedParameterIds: Object.freeze([
      ParameterId.Benefit_FamilyBasisMonths,
      ParameterId.Benefit_AdditionalPartnerBasisMonths,
      ParameterId.Benefit_PlusFraction,
      ParameterId.Benefit_MaximumWeeklyHours,
    ]),
  }),
  [FormulaId.ParentalOverlapCreditedPayment]: Object.freeze({
    id: FormulaId.ParentalOverlapCreditedPayment,
    label: "Overlapping Benefit Credit & Protected Floor (§ 3 Abs. 2 BEEG)",
    domain: FormulaDomain.ParentalAllowance,
    description: "Applies § 3 Abs. 2 BEEG overlap credit while preserving the statutory protected minimum (€300 Basis / €150 Plus).",
    governingLawIds: Object.freeze([LawId.BEEG_3, LawId.BEEG_4, LawId.BEEG_4a]),
    consumedParameterIds: Object.freeze([
      ParameterId.Benefit_AssessmentMonths,
      ParameterId.Benefit_BasisMinimum,
      ParameterId.Benefit_PlusFraction,
    ]),
  }),
  [FormulaId.ParentalSiblingBonus]: Object.freeze({
    id: FormulaId.ParentalSiblingBonus,
    label: "Sibling Bonus / Geschwisterbonus (§ 2a BEEG)",
    domain: FormulaDomain.ParentalAllowance,
    description: "Evaluates 10% sibling bonus (€75 min / €1,980 max Basis; €37.50 min / €990 max Plus) subject to age thresholds.",
    governingLawIds: Object.freeze([LawId.BEEG_2a, LawId.BEEG_4, LawId.BEEG_4a]),
    consumedParameterIds: Object.freeze([
      ParameterId.Benefit_SiblingRate,
      ParameterId.Benefit_SiblingMinimumBasis,
      ParameterId.Benefit_BasisMaximum,
      ParameterId.Benefit_PlusFraction,
      ParameterId.Benefit_SiblingAgeLimitMonths,
      ParameterId.Benefit_SiblingMultipleAgeLimitMonths,
      ParameterId.Benefit_SiblingMultipleMinimumCount,
    ]),
  }),
  [FormulaId.MaternityProtectionBenefit]: Object.freeze({
    id: FormulaId.MaternityProtectionBenefit,
    label: "Maternity Protection Benefit (§§ 19, 20 MuSchG)",
    domain: FormulaDomain.MaternityProtection,
    description: "Splits 100% net maternity replacement into €13/day GKV share and employer supplement.",
    governingLawIds: Object.freeze([LawId.MuSchG_19, LawId.MuSchG_20]),
    consumedParameterIds: Object.freeze([]),
  }),
  [FormulaId.ChildcareTaxDeduction]: Object.freeze({
    id: FormulaId.ChildcareTaxDeduction,
    label: "Childcare Expenses Deduction (§ 10 Abs. 1 Nr. 5 EStG)",
    domain: FormulaDomain.FamilyBenefits,
    description: "Computes annual deductible share of verified daycare fees (2/3 through 2024 up to €4,000; 80% from 2025 up to €4,800 per child under 14).",
    governingLawIds: Object.freeze([LawId.EStG_10_1_5, LawId.EStG_2]),
    consumedParameterIds: Object.freeze([
      ParameterId.Tax_ChildcareDeductibleFraction,
      ParameterId.Tax_ChildcareMaxDeductionPerChild,
      ParameterId.Tax_ChildcareMaxAgeYears,
    ]),
  }),
  [FormulaId.MunicipalDaycareFee]: Object.freeze({
    id: FormulaId.MunicipalDaycareFee,
    label: "Municipal Daycare Contribution (Elternbeitrag)",
    domain: FormulaDomain.FamilyBenefits,
    description: "Looks up illustrative municipal Kita bracket fee with sibling care discount and age fee-exemption.",
    governingLawIds: Object.freeze([LawId.EStG_10_1_5]),
    consumedParameterIds: Object.freeze([]),
  }),
  [FormulaId.PurchasingPowerDiscount]: Object.freeze({
    id: FormulaId.PurchasingPowerDiscount,
    label: "Real Purchasing Power Discounting",
    domain: FormulaDomain.IncomeTax,
    description: "Discounts future nominal euro flows into Month-1 real EUR using annual CPI inflation.",
    governingLawIds: Object.freeze([LawId.InflG]),
    consumedParameterIds: Object.freeze([ParameterId.Planning_AnnualInflationRate]),
  }),
  [FormulaId.CompoundedWageGrowth]: Object.freeze({
    id: FormulaId.CompoundedWageGrowth,
    label: "Compounded Nominal Wage Growth",
    domain: FormulaDomain.IncomeTax,
    description: "Projects nominal monthly salary progression using customizable annual growth assumptions.",
    governingLawIds: Object.freeze([LawId.EStG_19, LawId.InflG]),
    consumedParameterIds: Object.freeze([ParameterId.Planning_AnnualWageGrowthRate]),
  }),
  [FormulaId.TaxBracketInflationIndex]: Object.freeze({
    id: FormulaId.TaxBracketInflationIndex,
    label: "Tax Tariff Bracket Indexing (Inflationsausgleich)",
    domain: FormulaDomain.IncomeTax,
    description: "Shifts § 32a EStG Grundfreibetrag and zone ceilings upward for unverified future years while preserving marginal-rate continuity.",
    governingLawIds: Object.freeze([LawId.InflG, LawId.EStG_32a]),
    consumedParameterIds: Object.freeze([
      ...INCOME_TAX_TARIFF_PARAMETER_IDS,
      ParameterId.Planning_AnnualBracketIndexRate,
    ]),
  }),
  [FormulaId.VisaBlueCardEligibility]: Object.freeze({
    id: FormulaId.VisaBlueCardEligibility,
    label: "EU Blue Card & Permanent Settlement (§§ 18g, 18c AufenthG)",
    domain: FormulaDomain.VisaResidence,
    description: "Tests annual gross salary against § 18g standard/shortage ceilings, § 18 Abs. 2 Nr. 5 age-45 floor, and § 18c A1/B1 permanent settlement duration.",
    governingLawIds: Object.freeze([
      LawId.AufenthG_18g,
      LawId.AufenthG_18_2_5,
      LawId.AufenthG_18c,
      LawId.AufenthG_20a,
    ]),
    consumedParameterIds: Object.freeze([
      ParameterId.Visa_BlueCardStandardSalary,
      ParameterId.Visa_BlueCardShortageSalary,
      ParameterId.Visa_Age45MinimumSalary,
      ParameterId.Visa_SettlementMonthsA1,
      ParameterId.Visa_SettlementMonthsB1,
      ParameterId.Visa_OpportunityCardMonthlyFunds,
    ]),
  }),
  [FormulaId.VisaOpportunityCardPoints]: Object.freeze({
    id: FormulaId.VisaOpportunityCardPoints,
    label: "Opportunity Card Points & Subsistence (§ 20a AufenthG)",
    domain: FormulaDomain.VisaResidence,
    description: "Computes Chancenkarte qualification points and required blocked-account subsistence coverage.",
    governingLawIds: Object.freeze([LawId.AufenthG_20a]),
    consumedParameterIds: Object.freeze([
      ParameterId.Visa_OpportunityCardMonthlyFunds,
    ]),
  }),
  [FormulaId.CompanyCarBenefitValuation]: Object.freeze({
    id: FormulaId.CompanyCarBenefitValuation,
    label: "Company Car Benefit-in-Kind & EV Tax Shield (§§ 6, 8 EStG)",
    domain: FormulaDomain.CompanyCar,
    description: "Evaluates 1.0% / 0.5% / 0.25% monthly private-use uplift, BEV list-price cap, 0.03% vs. 0.002% commute valuation, and ICE tax savings.",
    governingLawIds: Object.freeze([
      LawId.EStG_6_1_4,
      LawId.EStG_8_2,
      LawId.EStG_19,
    ]),
    consumedParameterIds: Object.freeze([
      ParameterId.Car_IceMonthlyRate,
      ParameterId.Car_PhevMonthlyRate,
      ParameterId.Car_EvMonthlyRate,
      ParameterId.Car_EvGrossListPriceCap,
      ParameterId.Car_CommuteMonthlyKmRate,
      ParameterId.Car_CommuteDailyTripRate,
    ]),
  }),
  [FormulaId.SolarEnergyYieldAndTariff]: Object.freeze({
    id: FormulaId.SolarEnergyYieldAndTariff,
    label: "Residential Solar PV & EEG Feed-In Valuation (§ 48 EEG, § 3 Nr. 72 EStG, § 12 Abs. 3 UStG)",
    domain: FormulaDomain.SolarEnergy,
    description: "Computes blended capacity-tiered EEG tariffs, avoided grid electricity savings, 0% VAT savings, and § 3 Nr. 72 income-tax exemption.",
    governingLawIds: Object.freeze([
      LawId.EEG_48,
      LawId.EStG_3_72,
      LawId.UStG_12_3,
    ]),
    consumedParameterIds: Object.freeze([
      ParameterId.Solar_EegPartialFeedInFirst10KwpEur,
      ParameterId.Solar_EegFullFeedInFirst10KwpEur,
      ParameterId.Solar_EegPartialFeedIn10To40KwpEur,
      ParameterId.Solar_EegFullFeedIn10To40KwpEur,
      ParameterId.Solar_IncomeTaxExemptMaxKwp,
      ParameterId.Solar_GridElectricityPriceEur,
    ]),
  }),
  [FormulaId.HousingAcquisitionAndKfW300]: Object.freeze({
    id: FormulaId.HousingAcquisitionAndKfW300,
    label: "Home Closing Costs, KfW 300 Family Loan & § 35a Craftsmanship Credit",
    domain: FormulaDomain.HousingProperty,
    description: "Computes state-specific § 11 GrEStG transfer tax, notary/broker closing fees, KfW 300 family eligibility & loan caps, and § 35a EStG tax credit.",
    governingLawIds: Object.freeze([
      LawId.GrEStG_11,
      LawId.KfW_300,
      LawId.EStG_35a,
      LawId.EStG_2,
    ]),
    consumedParameterIds: Object.freeze([
      ParameterId.Housing_DefaultNotaryLandRegistryRate,
      ParameterId.Housing_DefaultAgentCommissionRate,
      ParameterId.Housing_KfW300BaseIncomeLimit,
      ParameterId.Housing_KfW300ExtraChildIncomeIncrement,
      ParameterId.Housing_KfW300BaseLoan1To2Children,
      ParameterId.Housing_KfW300BaseLoan3To4Children,
      ParameterId.Housing_KfW300BaseLoan5PlusChildren,
      ParameterId.Housing_KfW300QngLoanBonus,
      ParameterId.Housing_CraftsmanCreditRate,
      ParameterId.Housing_CraftsmanCreditMaxAnnualEur,
    ]),
  }),
});

/**
 * Extracts all § 32a Abs. 1 EStG income tax tariff constants from a `StatutoryCalculationContext`.
 */
export function extractIncomeTaxTariffConstantsFromContext(
  context: StatutoryCalculationContext,
): IncomeTaxTariffConstants {
  return {
    basicAllowance: context.getParameterEuroAmount(ParameterId.Tax_BasicAllowance),
    progressionZone1Ceiling: context.getParameterEuroAmount(ParameterId.Tax_Progression1Ceiling),
    progressionZone2Ceiling: context.getParameterEuroAmount(ParameterId.Tax_Progression2Ceiling),
    topRateCeiling: context.getParameterEuroAmount(ParameterId.Tax_TopRateCeiling),
    tariffDivisor: context.getParameterEuroAmount(ParameterId.Tax_TariffDivisor),
    progressionZone1QuadraticCoefficient: context.getParameterNumber(ParameterId.Tax_Progression1Quadratic),
    progressionZone1LinearCoefficient: context.getParameterNumber(ParameterId.Tax_Progression1Linear),
    progressionZone2QuadraticCoefficient: context.getParameterNumber(ParameterId.Tax_Progression2Quadratic),
    progressionZone2LinearCoefficient: context.getParameterNumber(ParameterId.Tax_Progression2Linear),
    progressionZone2ConstantOffset: context.getParameterEuroAmount(ParameterId.Tax_Progression2Constant),
    topMarginalRate: context.getParameterPercentageRate(ParameterId.Tax_TopRate),
    topMarginalOffset: context.getParameterEuroAmount(ParameterId.Tax_TopOffset),
    highestMarginalRate: context.getParameterPercentageRate(ParameterId.Tax_HighestRate),
    highestMarginalOffset: context.getParameterEuroAmount(ParameterId.Tax_HighestOffset),
  };
}

/**
 * Tier 2: Evaluates § 32a Abs. 1 EStG tariff zone using year-resolved constants from context.
 */
export function evaluateIncomeTaxZoneInContext(
  inputs: Readonly<{ readonly annualTaxableIncome: number }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<WageTaxZone> {
  const zone = evaluateIncomeTaxZoneFormula({
    annualTaxableIncome: inputs.annualTaxableIncome,
    ...extractIncomeTaxTariffConstantsFromContext(context),
  });
  return Object.freeze({
    value: zone,
    audit: buildFormulaEvaluationAudit(
      FormulaId.IncomeTaxTariffZone,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.IncomeTaxTariffZone].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.IncomeTaxTariffZone].governingLawIds,
    ),
  });
}

/**
 * Tier 2: Evaluates annual German income tax under § 32a Abs. 1 EStG from context.
 */
export function evaluateAnnualIncomeTaxInContext(
  inputs: Readonly<{ readonly annualTaxableIncome: number }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<EuroAmount> {
  const annualTax = evaluateIncomeTaxTariffFormula({
    annualTaxableIncome: inputs.annualTaxableIncome,
    ...extractIncomeTaxTariffConstantsFromContext(context),
  });
  return Object.freeze({
    value: annualTax,
    audit: buildFormulaEvaluationAudit(
      FormulaId.AnnualIncomeTaxTariff,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.AnnualIncomeTaxTariff].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.AnnualIncomeTaxTariff].governingLawIds,
    ),
  });
}

/**
 * Tier 2: Evaluates spousal splitting income tax (§§ 26b, 32a Abs. 5 EStG) from context.
 */
export function evaluateJointSplittingTaxInContext(
  inputs: Readonly<{
    readonly primarySpouseTaxableIncome: number;
    readonly secondarySpouseTaxableIncome: number;
  }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<EuroAmount> {
  const jointTax = evaluateSplittingTaxTariffFormula({
    primarySpouseTaxableIncome: inputs.primarySpouseTaxableIncome,
    secondarySpouseTaxableIncome: inputs.secondarySpouseTaxableIncome,
    ...extractIncomeTaxTariffConstantsFromContext(context),
  });
  return Object.freeze({
    value: jointTax,
    audit: buildFormulaEvaluationAudit(
      FormulaId.SpousalSplittingIncomeTax,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.SpousalSplittingIncomeTax].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.SpousalSplittingIncomeTax].governingLawIds,
    ),
  });
}

/**
 * Tier 2: Evaluates joint splitting tax with § 32b EStG progression-clause benefits from context.
 */
export function evaluateJointProgressionTaxInContext(
  inputs: Readonly<{
    readonly taxableIncome: EuroAmount;
    readonly progressionIncome: EuroAmount;
  }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<ProgressionRateTaxFormulaResult> {
  const result = evaluateProgressionRateTaxFormula({
    taxableIncome: inputs.taxableIncome,
    progressionIncome: inputs.progressionIncome,
    ratePrecisionDecimalPlaces: context.getParameterNumber(ParameterId.Tax_ProgressionRatePercentDecimalPlaces),
    ...extractIncomeTaxTariffConstantsFromContext(context),
  });
  return Object.freeze({
    value: result,
    audit: buildFormulaEvaluationAudit(
      FormulaId.JointProgressionRateTax,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.JointProgressionRateTax].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.JointProgressionRateTax].governingLawIds,
    ),
  });
}

/**
 * Tier 2: Evaluates § 4 SolzG solidarity surcharge from context.
 */
export function evaluateSolidaritySurchargeInContext(
  inputs: Readonly<{
    readonly annualIncomeTax: EuroAmount;
    readonly isJointAssessment: boolean;
  }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<EuroAmount> {
  const surcharge = evaluateSolidaritySurchargeFormula({
    annualIncomeTax: inputs.annualIncomeTax,
    singleAssessmentExemptionThreshold: context.getParameterEuroAmount(ParameterId.Tax_SolidarityExemptionSingle),
    isJointAssessment: inputs.isJointAssessment,
    solidarityRate: context.getParameterPercentageRate(ParameterId.Tax_SolidarityRate),
    mitigationZoneRate: context.getParameterPercentageRate(ParameterId.Tax_SolidarityMitigationRate),
  });
  return Object.freeze({
    value: surcharge,
    audit: buildFormulaEvaluationAudit(
      FormulaId.SolidaritySurcharge,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.SolidaritySurcharge].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.SolidaritySurcharge].governingLawIds,
    ),
  });
}

/**
 * Tier 2: Evaluates § 20 Abs. 2 SGB IV transition-zone (Midijob) factor `F` from context.
 */
export function evaluateTransitionZoneFactorInContext(
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<PercentageRate> {
  const factor = evaluateTransitionZoneFactorFormula({
    transitionFlatRate: context.getParameterPercentageRate(ParameterId.Tax_TransitionFlatRate),
    healthEmployeeRate: context.getParameterPercentageRate(ParameterId.Tax_HealthEmployeeRate),
    healthSupplementTotalRate: context.getParameterPercentageRate(ParameterId.Tax_HealthSupplementTotalRate),
    pensionEmployeeRate: context.getParameterPercentageRate(ParameterId.Tax_PensionEmployeeRate),
    unemploymentEmployeeRate: context.getParameterPercentageRate(ParameterId.Tax_UnemploymentEmployeeRate),
    careEmployeeBaseRate: context.getParameterPercentageRate(ParameterId.Tax_CareEmployeeBaseRate),
  });
  return Object.freeze({
    value: factor,
    audit: buildFormulaEvaluationAudit(
      FormulaId.TransitionZoneFactor,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.TransitionZoneFactor].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.TransitionZoneFactor].governingLawIds,
    ),
  });
}

/**
 * Tier 2: Evaluates § 20 Abs. 2a SGB IV Midijob employee and total assessment bases from context.
 */
export function evaluateTransitionZoneBasesInContext(
  inputs: Readonly<{
    readonly actualMonthlyGross: GrossSalary;
    readonly expectedMonthlyGross: GrossSalary;
  }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<TransitionZoneAssessmentBasesResult> {
  const factorResult = evaluateTransitionZoneFactorInContext(context);
  const bases = evaluateTransitionZoneAssessmentBasesFormula({
    actualMonthlyGross: inputs.actualMonthlyGross,
    expectedMonthlyGross: inputs.expectedMonthlyGross,
    marginalEarningsLimitMonthly: context.getParameterEuroAmount(ParameterId.Employment_MarginalLimitMonthly),
    transitionZoneCeilingMonthly: context.getParameterEuroAmount(ParameterId.Employment_TransitionCeilingMonthly),
    transitionZoneFactor: factorResult.value,
  });
  return Object.freeze({
    value: bases,
    audit: buildFormulaEvaluationAudit(
      FormulaId.TransitionZoneAssessmentBases,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.TransitionZoneAssessmentBases].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.TransitionZoneAssessmentBases].governingLawIds,
    ),
  });
}

/**
 * Aggregated monthly employee social insurance breakdown evaluated in a `StatutoryCalculationContext`.
 */
export interface SocialContributionsContextBreakdown {
  readonly transitionBases: TransitionZoneAssessmentBasesResult;
  readonly healthAssessmentBase: EuroAmount;
  readonly pensionAssessmentBase: EuroAmount;
  readonly healthInsuranceContribution: EuroAmount;
  readonly careInsuranceContribution: CareInsuranceContributionResult;
  readonly pensionInsuranceContribution: EuroAmount;
  readonly unemploymentInsuranceContribution: EuroAmount;
  readonly totalSocialContributions: EuroAmount;
}

/**
 * Tier 2: Evaluates employee health, nursing care, pension, and unemployment contributions
 * under SGB IV, V, VI, XI and § 2 BVV from context.
 */
export function evaluateSocialContributionsInContext(
  inputs: Readonly<{
    readonly actualMonthlyGross: GrossSalary;
    readonly expectedMonthlyGross: GrossSalary;
    readonly appliesSaxonyRate: boolean;
    readonly appliesChildlessSurcharge: boolean;
    readonly qualifyingDiscountChildCount: number;
  }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<SocialContributionsContextBreakdown> {
  const basesResult = evaluateTransitionZoneBasesInContext(
    {
      actualMonthlyGross: inputs.actualMonthlyGross,
      expectedMonthlyGross: inputs.expectedMonthlyGross,
    },
    context,
  );
  const transitionBases = basesResult.value;
  const healthCap = context.getParameterEuroAmount(ParameterId.Tax_HealthCapMonthly);
  const pensionCap = context.getParameterEuroAmount(ParameterId.Tax_PensionCapMonthly);

  const healthAssessmentBase = toEuroAmount(
    Math.min(transitionBases.employeeAssessmentBase, healthCap),
  );
  const pensionAssessmentBase = toEuroAmount(
    Math.min(transitionBases.employeeAssessmentBase, pensionCap),
  );

  const healthInsuranceContribution = evaluateHealthInsuranceContributionFormula({
    assessmentBase: healthAssessmentBase,
    baseHealthEmployeeRate: context.getParameterPercentageRate(ParameterId.Tax_HealthEmployeeRate),
    insurerSupplementTotalRate: context.getParameterPercentageRate(ParameterId.Tax_HealthSupplementTotalRate),
  });

  const careInsuranceContribution = evaluateCareInsuranceContributionFormula({
    healthAssessmentBase,
    totalTransitionAssessmentBase: transitionBases.totalAssessmentBase,
    isReducedTransitionZone: transitionBases.isReducedTransitionZone,
    careBaseEmployeeRate: context.getParameterPercentageRate(ParameterId.Tax_CareEmployeeBaseRate),
    saxonyExtraEmployeeRate: context.getParameterPercentageRate(ParameterId.Tax_CareSaxonyExtraEmployeeRate),
    childlessSurchargeRate: context.getParameterPercentageRate(ParameterId.Tax_CareChildlessSurcharge),
    childDiscountRatePerChild: context.getParameterPercentageRate(ParameterId.Tax_CareChildDiscount),
    appliesSaxonyRate: inputs.appliesSaxonyRate,
    appliesChildlessSurcharge: inputs.appliesChildlessSurcharge,
    qualifyingDiscountChildCount: inputs.qualifyingDiscountChildCount,
  });

  const pensionInsuranceContribution = toEuroAmount(
    pensionAssessmentBase * context.getParameterPercentageRate(ParameterId.Tax_PensionEmployeeRate),
  );
  const unemploymentInsuranceContribution = toEuroAmount(
    pensionAssessmentBase * context.getParameterPercentageRate(ParameterId.Tax_UnemploymentEmployeeRate),
  );

  const totalSocialContributions = toEuroAmount(
    healthInsuranceContribution +
      careInsuranceContribution.careContribution +
      pensionInsuranceContribution +
      unemploymentInsuranceContribution,
  );

  const consumedParameters: readonly ParameterId[] = [
    ...STATUTORY_FORMULA_DESCRIPTORS[FormulaId.TransitionZoneAssessmentBases].consumedParameterIds,
    ParameterId.Tax_HealthCapMonthly,
    ParameterId.Tax_PensionCapMonthly,
    ...STATUTORY_FORMULA_DESCRIPTORS[FormulaId.CareInsuranceContribution].consumedParameterIds,
  ];

  return Object.freeze({
    value: Object.freeze({
      transitionBases,
      healthAssessmentBase,
      pensionAssessmentBase,
      healthInsuranceContribution,
      careInsuranceContribution,
      pensionInsuranceContribution,
      unemploymentInsuranceContribution,
      totalSocialContributions,
    }),
    audit: buildFormulaEvaluationAudit(
      FormulaId.HealthInsuranceContribution,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      consumedParameters,
      [
        LawId.SGB4_20,
        LawId.SGB5_241,
        LawId.BVV_2,
        LawId.SGB6_158,
        LawId.SGB3_341,
        LawId.SGB11_55,
        LawId.SGB11_58,
      ],
    ),
  });
}

/**
 * Tier 2: Evaluates § 2f BEEG standardized benefit social-contribution base from context.
 */
export function evaluateBenefitTransitionContributionBaseInContext(
  inputs: Readonly<{ readonly monthlyGross: GrossSalary }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<GrossSalary> {
  const contributionBase = evaluateBenefitTransitionContributionBaseFormula({
    monthlyGross: inputs.monthlyGross,
    marginalEarningsLimitMonthly: context.getParameterEuroAmount(ParameterId.Employment_MarginalLimitMonthly),
    transitionZoneCeilingMonthly: context.getParameterEuroAmount(ParameterId.Employment_TransitionCeilingMonthly),
    benefitTransitionFlatRate: context.getParameterPercentageRate(ParameterId.Benefit_TransitionFlatRate),
    standardHealthCareDeductionRate: context.getParameterPercentageRate(ParameterId.Benefit_StandardHealthCareDeduction),
    standardPensionDeductionRate: context.getParameterPercentageRate(ParameterId.Benefit_StandardPensionDeduction),
    standardUnemploymentDeductionRate: context.getParameterPercentageRate(ParameterId.Benefit_StandardUnemploymentDeduction),
  });
  return Object.freeze({
    value: contributionBase,
    audit: buildFormulaEvaluationAudit(
      FormulaId.BenefitTransitionContributionBase,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.BenefitTransitionContributionBase].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.BenefitTransitionContributionBase].governingLawIds,
    ),
  });
}

/**
 * Tier 2: Evaluates BEEG § 2 Abs. 1 & 2 wage replacement rate from context.
 */
export function evaluateParentalReplacementRateInContext(
  inputs: Readonly<{ readonly preBirthMonthlyNet: NetSalary }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<PercentageRate> {
  const replacementRate = evaluateParentalReplacementRateFormula({
    preBirthMonthlyNet: inputs.preBirthMonthlyNet,
    standardReplacementRate: context.getParameterPercentageRate(ParameterId.Benefit_StandardReplacementRate),
    minimumReplacementRate: context.getParameterPercentageRate(ParameterId.Benefit_MinimumReplacementRate),
    maximumReplacementRate: context.getParameterPercentageRate(ParameterId.Benefit_MaximumReplacementRate),
    lowIncomeThreshold: context.getParameterEuroAmount(ParameterId.Benefit_LowIncomeThreshold),
    rateDecreaseThreshold: context.getParameterEuroAmount(ParameterId.Benefit_RateDecreaseThreshold),
    minimumRateThreshold: context.getParameterEuroAmount(ParameterId.Benefit_MinimumRateThreshold),
    rateChangePerEuro: context.getParameterNumber(ParameterId.Benefit_RateChangePerEuro),
  });
  return Object.freeze({
    value: replacementRate,
    audit: buildFormulaEvaluationAudit(
      FormulaId.ParentalWageReplacementRate,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.ParentalWageReplacementRate].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.ParentalWageReplacementRate].governingLawIds,
    ),
  });
}

/**
 * Tier 2: Evaluates simultaneous § 4b BEEG Partnership Bonus hours eligibility from context.
 */
export function evaluatePartnershipBonusHoursInContext(
  inputs: Readonly<{
    readonly primaryParentWeeklyHours: WorkingHours;
    readonly secondaryParentWeeklyHours: WorkingHours;
  }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<boolean> {
  const eligible = evaluatePartnershipBonusHoursEligibilityFormula({
    primaryParentWeeklyHours: inputs.primaryParentWeeklyHours,
    secondaryParentWeeklyHours: inputs.secondaryParentWeeklyHours,
    minimumWeeklyHours: toWorkingHours(context.getParameterNumber(ParameterId.Benefit_PartnershipMinimumHours)),
    maximumWeeklyHours: toWorkingHours(context.getParameterNumber(ParameterId.Benefit_MaximumWeeklyHours)),
  });
  return Object.freeze({
    value: eligible,
    audit: buildFormulaEvaluationAudit(
      FormulaId.PartnershipBonusHoursEligibility,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.PartnershipBonusHoursEligibility].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.PartnershipBonusHoursEligibility].governingLawIds,
    ),
  });
}

/**
 * Tier 2: Evaluates Basiselterngeld & ElterngeldPlus monthly entitlement (§§ 1, 2, 4, 4a BEEG) from context.
 */
export function evaluateParentalBenefitEntitlementInContext(
  inputs: Readonly<{
    readonly preBirthMonthlyNet: NetSalary;
    readonly partTimeMonthlyNet: NetSalary;
    readonly weeklyWorkingHours?: WorkingHours;
  }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<ParentalBenefitEntitlementFormulaResult> {
  const entitlement = evaluateParentalBenefitEntitlementFormula({
    preBirthMonthlyNet: inputs.preBirthMonthlyNet,
    partTimeMonthlyNet: inputs.partTimeMonthlyNet,
    weeklyWorkingHours: inputs.weeklyWorkingHours,
    standardReplacementRate: context.getParameterPercentageRate(ParameterId.Benefit_StandardReplacementRate),
    minimumReplacementRate: context.getParameterPercentageRate(ParameterId.Benefit_MinimumReplacementRate),
    maximumReplacementRate: context.getParameterPercentageRate(ParameterId.Benefit_MaximumReplacementRate),
    lowIncomeThreshold: context.getParameterEuroAmount(ParameterId.Benefit_LowIncomeThreshold),
    rateDecreaseThreshold: context.getParameterEuroAmount(ParameterId.Benefit_RateDecreaseThreshold),
    minimumRateThreshold: context.getParameterEuroAmount(ParameterId.Benefit_MinimumRateThreshold),
    rateChangePerEuro: context.getParameterNumber(ParameterId.Benefit_RateChangePerEuro),
    maximumAssessablePreBirthNet: toNetSalary(
      context.getParameterEuroAmount(ParameterId.Benefit_MaximumAssessableNet),
    ),
    basisMinimumAmount: context.getParameterEuroAmount(ParameterId.Benefit_BasisMinimum),
    basisMaximumAmount: context.getParameterEuroAmount(ParameterId.Benefit_BasisMaximum),
    elterngeldPlusFraction: context.getParameterNumber(ParameterId.Benefit_PlusFraction),
    maximumWeeklyHoursLimit: toWorkingHours(
      context.getParameterNumber(ParameterId.Benefit_MaximumWeeklyHours),
    ),
  });
  return Object.freeze({
    value: entitlement,
    audit: buildFormulaEvaluationAudit(
      FormulaId.ParentalAllowanceEntitlement,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.ParentalAllowanceEntitlement].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.ParentalAllowanceEntitlement].governingLawIds,
    ),
  });
}

/**
 * Tier 2: Evaluates § 2a BEEG Geschwisterbonus (Basiselterngeld or ElterngeldPlus) from context.
 */
export function evaluateSiblingBonusInContext(
  inputs: Readonly<{
    readonly baseElterngeldPlus: EuroAmount;
    readonly siblingAgesInMonths: readonly number[];
    readonly variant?: ElterngeldVariant;
  }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<SiblingBonusFormulaResult> {
  const variantFraction = evaluateAllowanceVariantWeightFormula({
    variant: inputs.variant ?? ElterngeldVariant.Plus,
    elterngeldPlusFraction: context.getParameterNumber(ParameterId.Benefit_PlusFraction),
  });
  const result = evaluateSiblingBonusFormula({
    baseElterngeldPlus: inputs.baseElterngeldPlus,
    siblingAgesInMonths: inputs.siblingAgesInMonths,
    siblingBonusRate: context.getParameterPercentageRate(ParameterId.Benefit_SiblingRate),
    siblingMinimumBasisAmount: context.getParameterEuroAmount(ParameterId.Benefit_SiblingMinimumBasis),
    basisMaximumAmount: context.getParameterEuroAmount(ParameterId.Benefit_BasisMaximum),
    elterngeldPlusFraction: variantFraction,
    singleOlderSiblingMaxAgeMonths: context.getParameterNumber(ParameterId.Benefit_SiblingAgeLimitMonths),
    multipleSiblingsMaxAgeMonths: context.getParameterNumber(ParameterId.Benefit_SiblingMultipleAgeLimitMonths),
    multipleSiblingsMinimumCount: context.getParameterNumber(ParameterId.Benefit_SiblingMultipleMinimumCount),
  });
  return Object.freeze({
    value: result,
    audit: buildFormulaEvaluationAudit(
      FormulaId.ParentalSiblingBonus,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.ParentalSiblingBonus].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.ParentalSiblingBonus].governingLawIds,
    ),
  });
}

/**
 * Tier 2: Evaluates statutory BEEG §§ 4, 4a, 4b Basis-unit allowance budget utilization and caps from context.
 */
export function evaluateParentalAllowanceBudgetInContext(
  inputs: Readonly<{
    readonly motherVariant: ElterngeldVariant;
    readonly fatherVariant: ElterngeldVariant;
    readonly motherOrdinaryMonths: MonthDuration;
    readonly fatherOrdinaryMonths: MonthDuration;
    readonly maternityPostBirthMonths?: MonthDuration;
    readonly partnershipBonusMonths?: MonthDuration;
  }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<ParentalAllowanceBudgetFormulaResult> {
  const result = evaluateParentalAllowanceBudgetFormula({
    motherVariant: inputs.motherVariant,
    fatherVariant: inputs.fatherVariant,
    motherOrdinaryMonths: inputs.motherOrdinaryMonths,
    fatherOrdinaryMonths: inputs.fatherOrdinaryMonths,
    maternityPostBirthMonths:
      inputs.maternityPostBirthMonths ??
      toMonthDuration(context.getParameterNumber(ParameterId.Convention_MaternityPostBirthMonths)),
    partnershipBonusMonths:
      inputs.partnershipBonusMonths ??
      toMonthDuration(context.getParameterNumber(ParameterId.Convention_PartnershipBonusMonths)),
    familyBasisMonths: toMonthDuration(context.getParameterNumber(ParameterId.Benefit_FamilyBasisMonths)),
    additionalPartnerBasisMonths: toMonthDuration(
      context.getParameterNumber(ParameterId.Benefit_AdditionalPartnerBasisMonths),
    ),
    minimumParentClaimMonths: toMonthDuration(
      context.getParameterNumber(ParameterId.Benefit_MinimumParentClaimMonths),
    ),
    elterngeldPlusFraction: context.getParameterNumber(ParameterId.Benefit_PlusFraction),
  });
  return Object.freeze({
    value: result,
    audit: buildFormulaEvaluationAudit(
      FormulaId.ParentalAllowanceBudget,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.ParentalAllowanceBudget].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.ParentalAllowanceBudget].governingLawIds,
    ),
  });
}

/**
 * Tier 2: Converts an ordinary allowance month count across Basiselterngeld / ElterngeldPlus using context.
 */
export function evaluateAllowanceVariantConversionInContext(
  inputs: Readonly<{
    readonly currentMonths: MonthDuration;
    readonly fromVariant: ElterngeldVariant;
    readonly toVariant: ElterngeldVariant;
    readonly maxMonthsInTargetVariant: number;
  }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<MonthDuration> {
  const result = evaluateAllowanceVariantMonthConversionFormula({
    currentMonths: inputs.currentMonths,
    fromVariant: inputs.fromVariant,
    toVariant: inputs.toVariant,
    maxMonthsInTargetVariant: inputs.maxMonthsInTargetVariant,
    elterngeldPlusFraction: context.getParameterNumber(ParameterId.Benefit_PlusFraction),
  });
  return Object.freeze({
    value: result,
    audit: buildFormulaEvaluationAudit(
      FormulaId.ParentalAllowanceVariantConversion,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.ParentalAllowanceVariantConversion].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.ParentalAllowanceVariantConversion].governingLawIds,
    ),
  });
}

/**
 * Tier 2: Selects Basiselterngeld vs. ElterngeldPlus for a single life-month in context
 * using statutory hours limit, LM 1–14 Basis window, and remaining Basis-unit budgets.
 */
export function evaluateMonthlyVariantSelectionInContext(
  inputs: Readonly<{
    readonly planMode: AllowancePlanMode;
    readonly weeklyWorkingHours: WorkingHours;
    readonly elapsedMonthsSinceBirth: number;
    readonly remainingIndividualBasisUnits: number;
    readonly remainingFamilyBasisUnits: number;
  }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<MonthlyVariantSelectionFormulaResult> {
  const maxBasisLifeMonths =
    context.getParameterNumber(ParameterId.Benefit_FamilyBasisMonths) +
    context.getParameterNumber(ParameterId.Benefit_AdditionalPartnerBasisMonths);
  const result = evaluateMonthlyVariantSelectionFormula({
    planMode: inputs.planMode,
    weeklyWorkingHours: inputs.weeklyWorkingHours,
    maximumWeeklyHoursLimit: toWorkingHours(
      context.getParameterNumber(ParameterId.Benefit_MaximumWeeklyHours),
    ),
    elapsedMonthsSinceBirth: inputs.elapsedMonthsSinceBirth,
    maxBasisLifeMonths,
    remainingIndividualBasisUnits: inputs.remainingIndividualBasisUnits,
    remainingFamilyBasisUnits: inputs.remainingFamilyBasisUnits,
    elterngeldPlusFraction: context.getParameterNumber(ParameterId.Benefit_PlusFraction),
  });
  return Object.freeze({
    value: result,
    audit: buildFormulaEvaluationAudit(
      FormulaId.ParentalMonthlyVariantSelection,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.ParentalMonthlyVariantSelection].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.ParentalMonthlyVariantSelection].governingLawIds,
    ),
  });
}

/**
 * Tier 2: Evaluates § 3 Abs. 2 BEEG overlapping benefit credit and variant-aware protected floor from context.
 */
export function evaluateOverlapCreditedPaymentInContext(
  inputs: Readonly<{
    readonly grossEntitlement: EuroAmount;
    readonly overlappingBenefitAmount: EuroAmount;
    readonly priorBenefitMonthsInWindow: number;
    readonly variant: ElterngeldVariant;
  }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<OverlapCreditedPaymentFormulaResult> {
  const result = evaluateOverlapCreditedPaymentFormula({
    grossEntitlement: inputs.grossEntitlement,
    overlappingBenefitAmount: inputs.overlappingBenefitAmount,
    priorBenefitMonthsInWindow: inputs.priorBenefitMonthsInWindow,
    assessmentWindowMonths: toMonthDuration(context.getParameterNumber(ParameterId.Benefit_AssessmentMonths)),
    basisMinimumAmount: context.getParameterEuroAmount(ParameterId.Benefit_BasisMinimum),
    elterngeldPlusFraction: context.getParameterNumber(ParameterId.Benefit_PlusFraction),
    variant: inputs.variant,
  });
  return Object.freeze({
    value: result,
    audit: buildFormulaEvaluationAudit(
      FormulaId.ParentalOverlapCreditedPayment,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.ParentalOverlapCreditedPayment].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.ParentalOverlapCreditedPayment].governingLawIds,
    ),
  });
}

/**
 * Tier 2: Evaluates §§ 19, 20 MuSchG maternity protection GKV share vs. employer supplement from context.
 */
export function evaluateMaternityProtectionInContext(
  inputs: Readonly<{ readonly preBirthMonthlyNet: NetSalary }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<MaternityProtectionBenefitFormulaResult> {
  const result = evaluateMaternityProtectionBenefitFormula({
    preBirthMonthlyNet: inputs.preBirthMonthlyNet,
    statutoryDailyHealthInsuranceCap: STATUTORY_DAILY_MATERNITY_HEALTH_INSURANCE_CAP,
    statutoryDaysPerCalendarMonth: STATUTORY_DAYS_PER_CALENDAR_MONTH,
  });
  return Object.freeze({
    value: result,
    audit: buildFormulaEvaluationAudit(
      FormulaId.MaternityProtectionBenefit,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.MaternityProtectionBenefit].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.MaternityProtectionBenefit].governingLawIds,
    ),
  });
}

/**
 * Tier 2: Evaluates § 31 EStG Kinderfreibetrag vs. Kindergeld favorability under § 32b progression from context.
 */
export function evaluateChildAllowanceFavorabilityInContext(
  inputs: Readonly<{
    readonly jointAnnualTaxableIncome: EuroAmount;
    readonly annualProgressionIncome: EuroAmount;
    readonly qualifyingChildMonthsCount: number;
  }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<
  ChildAllowanceFavorabilityFormulaResult & {
    readonly totalChildAllowanceApplied: EuroAmount;
    readonly totalKindergeldReceived: EuroAmount;
    readonly jointTaxWithoutAllowance: EuroAmount;
    readonly jointTaxWithAllowance: EuroAmount;
  }
> {
  if (!Number.isInteger(inputs.qualifyingChildMonthsCount) || inputs.qualifyingChildMonthsCount < 0) {
    throw new TypeError("Qualifying child-months count must be a non-negative integer.");
  }

  const annualAllowancePerChild = context.getParameterEuroAmount(ParameterId.Tax_ChildAllowanceAnnual);
  const monthlyChildBenefit = context.getParameterEuroAmount(ParameterId.Tax_ChildBenefitMonthly);

  const totalChildAllowanceApplied = toEuroAmount(
    (inputs.qualifyingChildMonthsCount / 12) * annualAllowancePerChild,
  );
  const totalKindergeldReceived = toEuroAmount(
    inputs.qualifyingChildMonthsCount * monthlyChildBenefit,
  );

  const taxWithout = evaluateJointProgressionTaxInContext(
    {
      taxableIncome: toEuroAmount(Math.max(0, inputs.jointAnnualTaxableIncome)),
      progressionIncome: inputs.annualProgressionIncome,
    },
    context,
  ).value.incomeTax;

  const reducedTaxableIncome = toEuroAmount(
    Math.max(0, inputs.jointAnnualTaxableIncome - totalChildAllowanceApplied),
  );
  const taxWith = evaluateJointProgressionTaxInContext(
    {
      taxableIncome: reducedTaxableIncome,
      progressionIncome: inputs.annualProgressionIncome,
    },
    context,
  ).value.incomeTax;

  const favorability = evaluateChildAllowanceFavorabilityFormula({
    jointTaxWithoutAllowance: taxWithout,
    jointTaxWithAllowance: taxWith,
    totalKindergeldReceived,
  });

  return Object.freeze({
    value: Object.freeze({
      ...favorability,
      totalChildAllowanceApplied,
      totalKindergeldReceived,
      jointTaxWithoutAllowance: taxWithout,
      jointTaxWithAllowance: taxWith,
    }),
    audit: buildFormulaEvaluationAudit(
      FormulaId.ChildAllowanceFavorabilityCheck,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.ChildAllowanceFavorabilityCheck].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.ChildAllowanceFavorabilityCheck].governingLawIds,
    ),
  });
}

/**
 * Tier 2: Evaluates § 10 Abs. 1 Nr. 5 EStG childcare special deduction using year-resolved
 * limits (`2/3` up to €4,000 through 2024; `80%` up to €4,800 from 2025) from `context`.
 */
export function evaluateChildcareTaxDeductionInContext(
  inputs: Readonly<{ readonly paidFeesPerChild: readonly ChildPaidFeeEntry[] }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<ChildcareTaxDeductionFormulaResult> {
  const result = evaluateChildcareTaxDeductionFormula({
    paidFeesPerChild: inputs.paidFeesPerChild,
    deductibleFraction: context.getParameterPercentageRate(ParameterId.Tax_ChildcareDeductibleFraction),
    maxAnnualDeductionPerChild: context.getParameterEuroAmount(ParameterId.Tax_ChildcareMaxDeductionPerChild),
    maxChildAgeYears: context.getParameterNumber(ParameterId.Tax_ChildcareMaxAgeYears),
  });
  return Object.freeze({
    value: result,
    audit: buildFormulaEvaluationAudit(
      FormulaId.ChildcareTaxDeduction,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.ChildcareTaxDeduction].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.ChildcareTaxDeduction].governingLawIds,
    ),
  });
}

/**
 * Tier 2: Evaluates an illustrative municipal daycare fee schedule in `context`.
 */
export function evaluateMunicipalDaycareFeeInContext(
  inputs: Readonly<{
    readonly householdAnnualGrossIncome: EuroAmount;
    readonly childAgeMonths: number;
    readonly siblingCareRank: number;
    readonly feeFreeFromAgeMonths: number | null;
    readonly siblingDiscountRateSecondChild: PercentageRate;
    readonly siblingDiscountRateThirdPlusChild: PercentageRate;
    readonly incomeBrackets: readonly MunicipalDaycareIncomeBracket[];
  }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<MunicipalDaycareFeeFormulaResult> {
  const result = evaluateMunicipalDaycareFeeFormula(inputs);
  return Object.freeze({
    value: result,
    audit: buildFormulaEvaluationAudit(
      FormulaId.MunicipalDaycareFee,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.MunicipalDaycareFee].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.MunicipalDaycareFee].governingLawIds,
    ),
  });
}

/**
 * Tier 2: Discounts a nominal cash flow into today's Month-1 real purchasing power using
 * `ParameterId.Planning_AnnualInflationRate` from `context`.
 */
export function evaluatePurchasingPowerDiscountInContext(
  inputs: Readonly<{
    readonly nominalAmount: EuroAmount;
    readonly elapsedMonths: number;
  }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<PurchasingPowerDiscountFormulaResult> {
  const result = evaluatePurchasingPowerDiscountFormula({
    nominalAmount: inputs.nominalAmount,
    annualInflationRate: context.getParameterPercentageRate(ParameterId.Planning_AnnualInflationRate),
    elapsedMonths: inputs.elapsedMonths,
  });
  return Object.freeze({
    value: result,
    audit: buildFormulaEvaluationAudit(
      FormulaId.PurchasingPowerDiscount,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.PurchasingPowerDiscount].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.PurchasingPowerDiscount].governingLawIds,
    ),
  });
}

/**
 * Tier 2: Evaluates compounded nominal wage growth using `ParameterId.Planning_AnnualWageGrowthRate`.
 */
export function evaluateCompoundedWageGrowthInContext(
  inputs: Readonly<{
    readonly baseAmount: EuroAmount;
    readonly yearsElapsed: number;
  }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<EuroAmount> {
  const result = evaluateCompoundedWageGrowthFormula({
    baseAmount: inputs.baseAmount,
    annualGrowthRate: context.getParameterPercentageRate(ParameterId.Planning_AnnualWageGrowthRate),
    yearsElapsed: inputs.yearsElapsed,
  });
  return Object.freeze({
    value: result,
    audit: buildFormulaEvaluationAudit(
      FormulaId.CompoundedWageGrowth,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.CompoundedWageGrowth].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.CompoundedWageGrowth].governingLawIds,
    ),
  });
}

/**
 * Tier 2: Projects § 32a EStG tax tariff brackets forward using `ParameterId.Planning_AnnualBracketIndexRate`.
 */
export function evaluateIndexedTaxBracketsInContext(
  inputs: Readonly<{ readonly yearsElapsed: number }>,
  context: StatutoryCalculationContext,
): FormulaEvaluationResult<IncomeTaxTariffConstants> {
  const baseTariff = extractIncomeTaxTariffConstantsFromContext(context);
  const indexed = evaluateIndexedTaxBracketsFormula({
    baseTariff,
    annualIndexRate: context.getParameterPercentageRate(ParameterId.Planning_AnnualBracketIndexRate),
    yearsElapsed: inputs.yearsElapsed,
  });
  return Object.freeze({
    value: indexed,
    audit: buildFormulaEvaluationAudit(
      FormulaId.TaxBracketInflationIndex,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.TaxBracketInflationIndex].consumedParameterIds,
      STATUTORY_FORMULA_DESCRIPTORS[FormulaId.TaxBracketInflationIndex].governingLawIds,
    ),
  });
}
