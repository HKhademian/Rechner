/**
 * German Elterngeld & Parental Leave 5-Year Financial Simulator - Parental Allowance Engine
 *
 * Implements statutory calculation formulas for Basiselterngeld, ElterngeldPlus,
 * sliding-scale wage replacement rates, and part-time hours eligibility under BEEG.
 */

import {
  type ParentalBenefitEntitlementConstants,
  evaluateElterngeldHoursEligibilityFormula,
  evaluateParentalBenefitEntitlementFormula,
  evaluateParentalReplacementRateFormula,
  evaluatePartnershipBonusHoursEligibilityFormula,
} from "#engine/formulas/pure/parentalBenefitFormulas";
import {
  type NetSalary,
  type EuroAmount,
  type PercentageRate,
  type WorkingHours,
  toNetSalary,
} from "#engine/types";
import {
  type BenefitRules,
  DEFAULT_BENEFIT_RULES,
} from "#engine/config/benefitRules";

function extractParentalBenefitConstants(
  rules: BenefitRules,
): ParentalBenefitEntitlementConstants {
  return {
    standardReplacementRate: rules.standardReplacementRate.value,
    minimumReplacementRate: rules.minimumReplacementRate.value,
    maximumReplacementRate: rules.maximumReplacementRate.value,
    lowIncomeThreshold: rules.lowIncomeThreshold.value,
    rateDecreaseThreshold: rules.rateDecreaseThreshold.value,
    minimumRateThreshold: rules.minimumRateThreshold.value,
    rateChangePerEuro: rules.rateChangePerEuro.value,
    maximumAssessablePreBirthNet: toNetSalary(rules.maximumAssessableNet.value),
    basisMinimumAmount: rules.basisMinimum.value,
    basisMaximumAmount: rules.basisMaximum.value,
    elterngeldPlusFraction: rules.plusFraction.value,
    maximumWeeklyHoursLimit: rules.maximumWeeklyHours.value,
  };
}

/**
 * Calculates the statutory wage replacement rate under § 2 Abs. 1 & 2 BEEG.
 *
 * @param preBirthNet - Monthly pre-birth average net income assessment baseline (§ 2b BEEG).
 * @returns Wage replacement ratio as a branded `PercentageRate` between 0.65 and 1.00.
 */
export function computeStatutoryReplacementRate(
  preBirthNet: NetSalary,
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
): PercentageRate {
  return evaluateParentalReplacementRateFormula({
    preBirthMonthlyNet: preBirthNet,
    ...extractParentalBenefitConstants(rules),
  });
}

/**
 * Statutory Parental Allowance Entitlement Determination Result (§§ 2, 4, 4a BEEG).
 * Contains computed monthly benefits for both Basiselterngeld and ElterngeldPlus.
 */
export interface ElterngeldEntitlement {
  /** Monthly pre-birth synthetic net income baseline (§ 2b, § 2c BEEG) in EUR. */
  readonly preBirthNet: NetSalary;
  /** Pre-birth net after applying the configured statutory assessment maximum. */
  readonly assessablePreBirthNet: NetSalary;
  /** Monthly part-time net take-home income earned during parental leave in EUR. */
  readonly partTimeNet: NetSalary;
  /** Net monthly income loss suffered due to parental leave in EUR (preBirthNet - partTimeNet). */
  readonly netIncomeLoss: EuroAmount;
  /** Statutory wage replacement rate applied (0.65..1.00) as a branded `PercentageRate`. */
  readonly replacementRate: PercentageRate;
  /** Monthly full Basiselterngeld entitlement in EUR (min €300, max €1.800 under § 2 Abs. 1 BEEG). */
  readonly basiselterngeld: EuroAmount;
  /** Monthly ElterngeldPlus entitlement in EUR (min €150, max €900 under § 4a BEEG). */
  readonly elterngeldPlus: EuroAmount;
  /** No-income Basis entitlement used to establish the personal Plus ceiling. */
  readonly noIncomeBasiselterngeld: EuroAmount;
  /** Personal Plus ceiling under § 4a(2), with statutory cent rounding. */
  readonly elterngeldPlusCeiling: EuroAmount;
  /** True when the personal Plus ceiling is reached. */
  readonly isMaxCapped: boolean;
  /** Boolean flag indicating whether the statutory minimum benefit floor was applied (€300/€150). */
  readonly isMinFloorApplied: boolean;
  /** Statutory legal citations governing the computation. */
  readonly statutoryCitation: string;
}

/**
 * Evaluates weekly working hours eligibility for parental allowance under § 1 Abs. 1 Nr. 4 BEEG.
 * Parental allowance is strictly restricted to parents working <= 32 hours per week.
 */
export function isElterngeldHoursEligible(
  weeklyHours: WorkingHours,
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
): boolean {
  return evaluateElterngeldHoursEligibilityFormula({
    weeklyWorkingHours: weeklyHours,
    maximumWeeklyHoursLimit: rules.maximumWeeklyHours.value,
  });
}

/**
 * Evaluates statutory Partnerschaftsbonus eligibility under § 4b BEEG.
 * Both parents must simultaneously work between 24 and 32 hours per week in consecutive months.
 */
export function isPartnerschaftsbonusEligible(
  motherHours: WorkingHours,
  fatherHours: WorkingHours,
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
): boolean {
  return evaluatePartnershipBonusHoursEligibilityFormula({
    primaryParentWeeklyHours: motherHours,
    secondaryParentWeeklyHours: fatherHours,
    minimumWeeklyHours: rules.partnershipMinimumHours.value,
    maximumWeeklyHours: rules.maximumWeeklyHours.value,
  });
}

/**
 * Computes monthly Basiselterngeld and ElterngeldPlus benefit amounts based on pre-birth net income,
 * post-birth part-time income, and weekly working hours under §§ 2, 4, 4a BEEG.
 */
export function computeElterngeldBenefits(
  preBirthNet: NetSalary,
  partTimeNetDuringLeave: NetSalary = toNetSalary(0),
  weeklyHours?: WorkingHours,
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
): ElterngeldEntitlement {
  const formulaResult = evaluateParentalBenefitEntitlementFormula({
    preBirthMonthlyNet: preBirthNet,
    partTimeMonthlyNet: partTimeNetDuringLeave,
    weeklyWorkingHours: weeklyHours,
    ...extractParentalBenefitConstants(rules),
  });

  return {
    preBirthNet: formulaResult.preBirthNet,
    assessablePreBirthNet: formulaResult.assessablePreBirthNet,
    partTimeNet: formulaResult.partTimeNet,
    netIncomeLoss: formulaResult.netIncomeLoss,
    replacementRate: formulaResult.replacementRate,
    basiselterngeld: formulaResult.basiselterngeld,
    elterngeldPlus: formulaResult.elterngeldPlus,
    noIncomeBasiselterngeld: formulaResult.noIncomeBasiselterngeld,
    elterngeldPlusCeiling: formulaResult.elterngeldPlusCeiling,
    isMaxCapped: formulaResult.isMaxCapped,
    isMinFloorApplied: formulaResult.isMinFloorApplied,
    statutoryCitation: formulaResult.isHoursDisqualified
      ? `BEEG § 1 Abs. 6 (Ausschluss bei Erwerbstätigkeit > ${rules.maximumWeeklyHours.value} Wochenstunden)`
      : "BEEG § 2 (Ersatzrate), § 4 (Basiselterngeld), § 4a (ElterngeldPlus)",
  };
}
