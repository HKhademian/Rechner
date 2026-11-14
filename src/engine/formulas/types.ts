import {
  type LawId,
} from "#engine/laws/types";
import {
  type ParameterId,
  type ResolvedParameterValue,
} from "#engine/parameters/types";
import {
  type EuroAmount,
  type FullCalendarYear,
  type PercentageRate,
} from "#engine/types";

/**
 * Architectural tier of a calculation unit in the three-tier formula system:
 * 1. `PureMathematicalFormula`: Immutable, context-unaware pure mathematical function receiving all inputs and statutory constants explicitly as named parameters.
 * 2. `ContextAwareStatutoryEvaluator`: Immutable evaluator extracting required constants from a `StatutoryCalculationContext` and invoking Tier 1 formulas.
 * 3. `ScenarioAndUserCalculation`: User-facing calculation combining `StatutoryCalculationContext` with user salary history, household structure, and hypothetical scenario overrides.
 */
export const CalculationTier = {
  PureMathematicalFormula: "pure_mathematical_formula",
  ContextAwareStatutoryEvaluator: "context_aware_statutory_evaluator",
  ScenarioAndUserCalculation: "scenario_and_user_calculation",
} as const;
export type CalculationTier = (typeof CalculationTier)[keyof typeof CalculationTier];

/**
 * Calculation domain classification aligned with the statutory Law & Parameter Registries.
 */
export const FormulaDomain = {
  IncomeTax: "income_tax",
  SocialSecurity: "social_security",
  ParentalAllowance: "parental_allowance",
  MaternityProtection: "maternity_protection",
  FamilyBenefits: "family_benefits",
} as const;
export type FormulaDomain = (typeof FormulaDomain)[keyof typeof FormulaDomain];

/**
 * Strongly-typed identifier for every statutory calculation formula in the platform.
 */
export const FormulaId = {
  IncomeTaxTariffZone: "formula.incomeTax.tariffZone",
  AnnualIncomeTaxTariff: "formula.incomeTax.annualTariff",
  SpousalSplittingIncomeTax: "formula.incomeTax.spousalSplitting",
  JointProgressionRateTax: "formula.incomeTax.jointProgression",
  SolidaritySurcharge: "formula.incomeTax.solidaritySurcharge",
  MonthlySwapWithholdingVariance: "formula.incomeTax.swapWithholdingVariance",
  ChildAllowanceFavorabilityCheck: "formula.familyBenefits.childAllowanceFavorability",
  TransitionZoneFactor: "formula.socialSecurity.transitionZoneFactor",
  TransitionZoneAssessmentBases: "formula.socialSecurity.transitionZoneBases",
  HealthInsuranceContribution: "formula.socialSecurity.healthInsuranceContribution",
  CareInsuranceContribution: "formula.socialSecurity.careInsuranceContribution",
  BenefitTransitionContributionBase: "formula.parentalAllowance.benefitTransitionContributionBase",
  ParentalWageReplacementRate: "formula.parentalAllowance.wageReplacementRate",
  ParentalWeeklyHoursEligibility: "formula.parentalAllowance.weeklyHoursEligibility",
  PartnershipBonusHoursEligibility: "formula.parentalAllowance.partnershipBonusHoursEligibility",
  ParentalAllowanceEntitlement: "formula.parentalAllowance.entitlement",
  ParentalSiblingBonus: "formula.parentalAllowance.siblingBonus",
  MaternityProtectionBenefit: "formula.maternityProtection.monthlyBenefit",
  ChildcareTaxDeduction: "formula.familyBenefits.childcareTaxDeduction",
  MunicipalDaycareFee: "formula.familyBenefits.municipalDaycareFee",
  PurchasingPowerDiscount: "formula.planning.purchasingPowerDiscount",
  CompoundedWageGrowth: "formula.planning.compoundedWageGrowth",
  TaxBracketInflationIndex: "formula.incomeTax.bracketInflationIndex",
} as const;
export type FormulaId = (typeof FormulaId)[keyof typeof FormulaId];

/**
 * Declarative descriptor mapping a calculation formula to its governing laws and parameter IDs.
 */
export interface StatutoryFormulaDescriptor {
  readonly id: FormulaId;
  readonly label: string;
  readonly domain: FormulaDomain;
  readonly description: string;
  readonly governingLawIds: readonly LawId[];
  readonly consumedParameterIds: readonly ParameterId[];
}

/**
 * Immutable audit trail emitted alongside Tier 2 and Tier 3 formula evaluations.
 */
export interface FormulaEvaluationAudit {
  readonly formulaId: FormulaId;
  readonly tier: CalculationTier;
  readonly calendarYear: FullCalendarYear;
  readonly governingLawIds: readonly LawId[];
  readonly consumedParameterIds: readonly ParameterId[];
  readonly customOverrideApplied: boolean;
  readonly projectedFromYears: readonly FullCalendarYear[];
}

/**
 * Standard auditable result envelope returned by Tier 2 context-aware evaluators
 * and Tier 3 scenario calculators.
 */
export interface FormulaEvaluationResult<TResult> {
  readonly value: TResult;
  readonly audit: FormulaEvaluationAudit;
}

/**
 * Construction options for building an immutable `StatutoryCalculationContext`.
 */
export interface StatutoryContextOptions {
  readonly calendarYear?: FullCalendarYear;
  readonly customParameterOverrides?: Readonly<Partial<Record<ParameterId, number>>>;
}

/**
 * Immutable environment snapshot bridging the Unified Law-Linked Parameter Value Storage
 * into Tier 2 context-aware evaluators and Tier 3 user/scenario calculations.
 */
export interface StatutoryCalculationContext {
  readonly calendarYear: FullCalendarYear;
  readonly customParameterOverrides: Readonly<Partial<Record<ParameterId, number>>>;
  readonly overriddenParameterIds: readonly ParameterId[];
  resolveParameter(id: ParameterId): ResolvedParameterValue;
  getParameterNumber(id: ParameterId): number;
  getParameterEuroAmount(id: ParameterId): EuroAmount;
  getParameterPercentageRate(id: ParameterId): PercentageRate;
}
