import {
  createStatutoryCalculationContext,
} from "#engine/formulas/context/statutoryContext";
import {
  type SocialContributionsContextBreakdown,
  evaluateChildAllowanceFavorabilityInContext,
  evaluateJointProgressionTaxInContext,
  evaluateJointSplittingTaxInContext,
  evaluateMaternityProtectionInContext,
  evaluateParentalBenefitEntitlementInContext,
  evaluatePartnershipBonusHoursInContext,
  evaluateSiblingBonusInContext,
  evaluateSocialContributionsInContext,
  evaluateSolidaritySurchargeInContext,
} from "#engine/formulas/context/statutoryEvaluators";
import {
  type ProgressionRateTaxFormulaResult,
} from "#engine/formulas/pure/incomeTaxFormulas";
import {
  type ChildAllowanceFavorabilityFormulaResult,
  type MaternityProtectionBenefitFormulaResult,
  type ParentalBenefitEntitlementFormulaResult,
  type SiblingBonusFormulaResult,
} from "#engine/formulas/pure/parentalBenefitFormulas";
import {
  type FormulaEvaluationAudit,
  type StatutoryCalculationContext,
  type StatutoryContextOptions,
  CalculationTier,
} from "#engine/formulas/types";
import {
  type LawId,
} from "#engine/laws/types";
import {
  type ParameterId,
} from "#engine/parameters/types";
import {
  type EuroAmount,
  type FullCalendarYear,
  type GrossSalary,
  type NetSalary,
  type WorkingHours,
  ElterngeldVariant,
  toEuroAmount,
} from "#engine/types";

/**
 * Tier 3 User & Scenario Calculation Evaluators.
 *
 * Combines immutable `StatutoryCalculationContext` snapshots (statutory defaults + validated
 * parameter overrides) with user household income/family history and hypothetical scenario overrides,
 * emitting consolidated legal and parameter audit trails across every evaluated domain.
 */

/**
 * Strongly-typed user household income, working-hours, and family profile input
 * evaluated by Tier 3 scenario calculators.
 */
export interface UserHouseholdStatutoryProfile {
  readonly primaryParentPreBirthMonthlyNet: NetSalary;
  readonly primaryParentPartTimeMonthlyGross: GrossSalary;
  readonly primaryParentPartTimeMonthlyNet: NetSalary;
  readonly primaryParentWeeklyHours: WorkingHours;
  readonly secondaryParentWeeklyHours: WorkingHours;
  readonly primarySpouseAnnualTaxableIncome: EuroAmount;
  readonly secondarySpouseAnnualTaxableIncome: EuroAmount;
  readonly annualParentalBenefitProgressionIncome: EuroAmount;
  readonly olderSiblingAgesInMonths: readonly number[];
  readonly qualifyingCareDiscountChildCount: number;
  readonly appliesSaxonyCareRate: boolean;
  readonly appliesChildlessCareSurcharge: boolean;
  readonly isDuringMaternityProtection: boolean;
  readonly qualifyingChildAllowanceMonthsCount: number;
  readonly parentalAllowanceVariant?: ElterngeldVariant;
}

/**
 * Consolidated legal and parameter audit provenance across a Tier 3 profile evaluation.
 */
export interface ScenarioAuditSummary {
  readonly tier: typeof CalculationTier.ScenarioAndUserCalculation;
  readonly calendarYear: FullCalendarYear;
  readonly customOverrideApplied: boolean;
  readonly appliedLawIds: readonly LawId[];
  readonly consumedParameterIds: readonly ParameterId[];
  readonly evaluationAudits: readonly FormulaEvaluationAudit[];
}

/**
 * Complete Tier 3 statutory profile evaluation tying monthly benefits, social contributions,
 * annual joint taxation, child-allowance favorability, and audit provenance together.
 */
export interface HouseholdStatutoryProfileEvaluation {
  readonly profile: UserHouseholdStatutoryProfile;
  readonly context: StatutoryCalculationContext;
  readonly maternityProtection: MaternityProtectionBenefitFormulaResult;
  readonly activeMonthlyMaternityBenefit: EuroAmount;
  readonly parentalBenefitEntitlement: ParentalBenefitEntitlementFormulaResult;
  readonly siblingBonus: SiblingBonusFormulaResult;
  readonly partnershipBonusHoursEligible: boolean;
  readonly partTimeSocialContributions: SocialContributionsContextBreakdown;
  readonly annualJointIncomeTaxWithoutProgression: EuroAmount;
  readonly annualJointIncomeTaxWithProgression: ProgressionRateTaxFormulaResult;
  readonly annualSolidaritySurcharge: EuroAmount;
  readonly childAllowanceFavorability: ChildAllowanceFavorabilityFormulaResult;
  readonly totalMonthlyParentalAllowanceWithBonus: EuroAmount;
  readonly auditSummary: ScenarioAuditSummary;
}

/**
 * Hypothetical override descriptor applied to produce an alternative scenario branch.
 */
export interface ScenarioOverrideInput {
  readonly label: string;
  readonly contextOptions?: StatutoryContextOptions;
  readonly profileOverrides?: Partial<UserHouseholdStatutoryProfile>;
}

/**
 * Quantitative side-by-side comparison between baseline and hypothetical scenarios.
 */
export interface HouseholdScenarioComparisonResult {
  readonly baselineLabel: string;
  readonly alternativeLabel: string;
  readonly baseline: HouseholdStatutoryProfileEvaluation;
  readonly alternative: HouseholdStatutoryProfileEvaluation;
  readonly deltas: {
    readonly monthlyElterngeldPlusDelta: EuroAmount;
    readonly monthlySiblingBonusDelta: EuroAmount;
    readonly monthlyTotalParentalAllowanceDelta: EuroAmount;
    readonly monthlySocialContributionsDelta: EuroAmount;
    readonly annualJointIncomeTaxDelta: EuroAmount;
    readonly annualSolidaritySurchargeDelta: EuroAmount;
    readonly childAllowanceExtraRefundDelta: EuroAmount;
  };
  readonly combinedAppliedLawIds: readonly LawId[];
  readonly combinedConsumedParameterIds: readonly ParameterId[];
}

function summarizeScenarioAudits(
  context: StatutoryCalculationContext,
  sourceAudits: readonly FormulaEvaluationAudit[],
): ScenarioAuditSummary {
  const lawIdSet = new Set<LawId>();
  const parameterIdSet = new Set<ParameterId>();
  let customOverrideApplied = false;

  const tier3Audits = sourceAudits.map((audit) => {
    for (const lawId of audit.governingLawIds) {
      lawIdSet.add(lawId);
    }
    for (const parameterId of audit.consumedParameterIds) {
      parameterIdSet.add(parameterId);
    }
    if (audit.customOverrideApplied) {
      customOverrideApplied = true;
    }
    return Object.freeze({
      ...audit,
      tier: CalculationTier.ScenarioAndUserCalculation,
    });
  });

  return Object.freeze({
    tier: CalculationTier.ScenarioAndUserCalculation,
    calendarYear: context.calendarYear,
    customOverrideApplied,
    appliedLawIds: Object.freeze([...lawIdSet]),
    consumedParameterIds: Object.freeze([...parameterIdSet]),
    evaluationAudits: Object.freeze(tier3Audits),
  });
}

/**
 * Tier 3: Evaluates a complete user household profile against an immutable
 * `StatutoryCalculationContext`, uniting Tier 2 statutory evaluators into one auditable result.
 */
export function evaluateHouseholdStatutoryProfile(
  profile: Readonly<UserHouseholdStatutoryProfile>,
  context: StatutoryCalculationContext,
): HouseholdStatutoryProfileEvaluation {
  const frozenProfile: UserHouseholdStatutoryProfile = Object.freeze({
    ...profile,
    olderSiblingAgesInMonths: Object.freeze([...profile.olderSiblingAgesInMonths]),
  });

  const maternityResult = evaluateMaternityProtectionInContext(
    { preBirthMonthlyNet: frozenProfile.primaryParentPreBirthMonthlyNet },
    context,
  );
  const activeMonthlyMaternityBenefit = frozenProfile.isDuringMaternityProtection
    ? maternityResult.value.totalMaternityBenefit
    : toEuroAmount(0);

  const parentalResult = evaluateParentalBenefitEntitlementInContext(
    {
      preBirthMonthlyNet: frozenProfile.primaryParentPreBirthMonthlyNet,
      partTimeMonthlyNet: frozenProfile.primaryParentPartTimeMonthlyNet,
      weeklyWorkingHours: frozenProfile.primaryParentWeeklyHours,
    },
    context,
  );

  const allowanceVariant = frozenProfile.parentalAllowanceVariant ?? ElterngeldVariant.Plus;
  const baseAllowanceForVariant = allowanceVariant === ElterngeldVariant.Basis
    ? parentalResult.value.basiselterngeld
    : parentalResult.value.elterngeldPlus;

  const siblingResult = evaluateSiblingBonusInContext(
    {
      baseElterngeldPlus: baseAllowanceForVariant,
      siblingAgesInMonths: frozenProfile.olderSiblingAgesInMonths,
      variant: allowanceVariant,
    },
    context,
  );

  const partnershipHoursResult = evaluatePartnershipBonusHoursInContext(
    {
      primaryParentWeeklyHours: frozenProfile.primaryParentWeeklyHours,
      secondaryParentWeeklyHours: frozenProfile.secondaryParentWeeklyHours,
    },
    context,
  );

  const socialResult = evaluateSocialContributionsInContext(
    {
      actualMonthlyGross: frozenProfile.primaryParentPartTimeMonthlyGross,
      expectedMonthlyGross: frozenProfile.primaryParentPartTimeMonthlyGross,
      appliesSaxonyRate: frozenProfile.appliesSaxonyCareRate,
      appliesChildlessSurcharge: frozenProfile.appliesChildlessCareSurcharge,
      qualifyingDiscountChildCount: frozenProfile.qualifyingCareDiscountChildCount,
    },
    context,
  );

  const combinedTaxableIncome = toEuroAmount(
    Math.max(
      0,
      frozenProfile.primarySpouseAnnualTaxableIncome +
        frozenProfile.secondarySpouseAnnualTaxableIncome,
    ),
  );

  const jointSplittingResult = evaluateJointSplittingTaxInContext(
    {
      primarySpouseTaxableIncome: frozenProfile.primarySpouseAnnualTaxableIncome,
      secondarySpouseTaxableIncome: frozenProfile.secondarySpouseAnnualTaxableIncome,
    },
    context,
  );

  const jointProgressionResult = evaluateJointProgressionTaxInContext(
    {
      taxableIncome: combinedTaxableIncome,
      progressionIncome: frozenProfile.annualParentalBenefitProgressionIncome,
    },
    context,
  );

  const solidarityResult = evaluateSolidaritySurchargeInContext(
    {
      annualIncomeTax: jointProgressionResult.value.incomeTax,
      isJointAssessment: true,
    },
    context,
  );

  const childAllowanceResult = evaluateChildAllowanceFavorabilityInContext(
    {
      jointAnnualTaxableIncome: combinedTaxableIncome,
      annualProgressionIncome: frozenProfile.annualParentalBenefitProgressionIncome,
      qualifyingChildMonthsCount: frozenProfile.qualifyingChildAllowanceMonthsCount,
    },
    context,
  );

  const auditSummary = summarizeScenarioAudits(context, [
    maternityResult.audit,
    parentalResult.audit,
    siblingResult.audit,
    partnershipHoursResult.audit,
    socialResult.audit,
    jointSplittingResult.audit,
    jointProgressionResult.audit,
    solidarityResult.audit,
    childAllowanceResult.audit,
  ]);

  return Object.freeze({
    profile: frozenProfile,
    context,
    maternityProtection: maternityResult.value,
    activeMonthlyMaternityBenefit,
    parentalBenefitEntitlement: parentalResult.value,
    siblingBonus: siblingResult.value,
    partnershipBonusHoursEligible: partnershipHoursResult.value,
    partTimeSocialContributions: socialResult.value,
    annualJointIncomeTaxWithoutProgression: jointSplittingResult.value,
    annualJointIncomeTaxWithProgression: jointProgressionResult.value,
    annualSolidaritySurcharge: solidarityResult.value,
    childAllowanceFavorability: Object.freeze({
      taxSavingsFromAllowance: childAllowanceResult.value.taxSavingsFromAllowance,
      isKinderfreibetragFavorable: childAllowanceResult.value.isKinderfreibetragFavorable,
      extraTaxRefund: childAllowanceResult.value.extraTaxRefund,
    }),
    totalMonthlyParentalAllowanceWithBonus: siblingResult.value.totalElterngeldPlusWithBonus,
    auditSummary,
  });
}

/**
 * Tier 3: Compares a baseline household profile & statutory context against an alternative
 * scenario overriding user parameters and/or statutory customizable context parameters.
 */
export function compareHouseholdStatutoryScenarios(
  baselineLabel: string,
  baselineProfile: Readonly<UserHouseholdStatutoryProfile>,
  baselineContextOptions: StatutoryContextOptions,
  alternativeScenario: Readonly<ScenarioOverrideInput>,
): HouseholdScenarioComparisonResult {
  const baselineContext = createStatutoryCalculationContext(baselineContextOptions);
  const mergedContextOptions: StatutoryContextOptions = {
    calendarYear:
      alternativeScenario.contextOptions?.calendarYear ?? baselineContextOptions.calendarYear,
    customParameterOverrides: {
      ...(baselineContextOptions.customParameterOverrides ?? {}),
      ...(alternativeScenario.contextOptions?.customParameterOverrides ?? {}),
    },
  };
  const alternativeContext = createStatutoryCalculationContext(mergedContextOptions);
  const alternativeProfile: UserHouseholdStatutoryProfile = {
    ...baselineProfile,
    ...(alternativeScenario.profileOverrides ?? {}),
  };

  const baseline = evaluateHouseholdStatutoryProfile(baselineProfile, baselineContext);
  const alternative = evaluateHouseholdStatutoryProfile(alternativeProfile, alternativeContext);

  const combinedLawIds = new Set<LawId>([
    ...baseline.auditSummary.appliedLawIds,
    ...alternative.auditSummary.appliedLawIds,
  ]);
  const combinedParamIds = new Set<ParameterId>([
    ...baseline.auditSummary.consumedParameterIds,
    ...alternative.auditSummary.consumedParameterIds,
  ]);

  return Object.freeze({
    baselineLabel,
    alternativeLabel: alternativeScenario.label,
    baseline,
    alternative,
    deltas: Object.freeze({
      monthlyElterngeldPlusDelta: toEuroAmount(
        alternative.parentalBenefitEntitlement.elterngeldPlus -
          baseline.parentalBenefitEntitlement.elterngeldPlus,
      ),
      monthlySiblingBonusDelta: toEuroAmount(
        alternative.siblingBonus.siblingBonusAmount -
          baseline.siblingBonus.siblingBonusAmount,
      ),
      monthlyTotalParentalAllowanceDelta: toEuroAmount(
        alternative.totalMonthlyParentalAllowanceWithBonus -
          baseline.totalMonthlyParentalAllowanceWithBonus,
      ),
      monthlySocialContributionsDelta: toEuroAmount(
        alternative.partTimeSocialContributions.totalSocialContributions -
          baseline.partTimeSocialContributions.totalSocialContributions,
      ),
      annualJointIncomeTaxDelta: toEuroAmount(
        alternative.annualJointIncomeTaxWithProgression.incomeTax -
          baseline.annualJointIncomeTaxWithProgression.incomeTax,
      ),
      annualSolidaritySurchargeDelta: toEuroAmount(
        alternative.annualSolidaritySurcharge - baseline.annualSolidaritySurcharge,
      ),
      childAllowanceExtraRefundDelta: toEuroAmount(
        alternative.childAllowanceFavorability.extraTaxRefund -
          baseline.childAllowanceFavorability.extraTaxRefund,
      ),
    }),
    combinedAppliedLawIds: Object.freeze([...combinedLawIds]),
    combinedConsumedParameterIds: Object.freeze([...combinedParamIds]),
  });
}
