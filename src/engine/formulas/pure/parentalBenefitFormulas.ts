import {
  type EuroAmount,
  type NetSalary,
  type PercentageRate,
  type WorkingHours,
  toEuroAmount,
  toNetSalary,
  toPercentageRate,
} from "#engine/types";

/**
 * Tier 1 Pure Mathematical Parental Benefit, Maternity Protection & Family Relief Formulas (Context-Unaware).
 *
 * Every function receives all thresholds, floors, caps, rates, and hour limits explicitly
 * inside named parameter structs with zero external state or global configuration dependencies.
 */

/**
 * Explicit statutory constants for the BEEG § 2 wage-replacement sliding scale.
 */
export interface ParentalReplacementRateConstants {
  readonly standardReplacementRate: PercentageRate;
  readonly minimumReplacementRate: PercentageRate;
  readonly maximumReplacementRate: PercentageRate;
  readonly lowIncomeThreshold: EuroAmount;
  readonly rateDecreaseThreshold: EuroAmount;
  readonly minimumRateThreshold: EuroAmount;
  readonly rateChangePerEuro: number;
}

/**
 * Named inputs for BEEG § 2 Abs. 1 & 2 wage replacement ratio formula.
 */
export interface ParentalReplacementRateFormulaInputs extends ParentalReplacementRateConstants {
  readonly preBirthMonthlyNet: NetSalary;
}

/**
 * Named inputs for weekly working-hours eligibility check (§ 1 Abs. 1 Nr. 4 BEEG).
 */
export interface ElterngeldHoursEligibilityFormulaInputs {
  readonly weeklyWorkingHours: WorkingHours;
  readonly maximumWeeklyHoursLimit: WorkingHours;
}

/**
 * Named inputs for Partnerschaftsbonus working-hours eligibility check (§ 4b BEEG).
 */
export interface PartnershipBonusHoursEligibilityFormulaInputs {
  readonly primaryParentWeeklyHours: WorkingHours;
  readonly secondaryParentWeeklyHours: WorkingHours;
  readonly minimumWeeklyHours: WorkingHours;
  readonly maximumWeeklyHours: WorkingHours;
}

/**
 * Explicit statutory constants for Basiselterngeld and ElterngeldPlus entitlement calculation (§§ 1, 2, 4, 4a BEEG).
 */
export interface ParentalBenefitEntitlementConstants extends ParentalReplacementRateConstants {
  readonly maximumAssessablePreBirthNet: NetSalary;
  readonly basisMinimumAmount: EuroAmount;
  readonly basisMaximumAmount: EuroAmount;
  readonly elterngeldPlusFraction: number;
  readonly maximumWeeklyHoursLimit: WorkingHours;
}

/**
 * Named inputs for evaluating Basiselterngeld & ElterngeldPlus monthly entitlement.
 */
export interface ParentalBenefitEntitlementFormulaInputs extends ParentalBenefitEntitlementConstants {
  readonly preBirthMonthlyNet: NetSalary;
  readonly partTimeMonthlyNet: NetSalary;
  readonly weeklyWorkingHours?: WorkingHours;
}

/**
 * Pure mathematical output of parental benefit entitlement formula.
 */
export interface ParentalBenefitEntitlementFormulaResult {
  readonly preBirthNet: NetSalary;
  readonly assessablePreBirthNet: NetSalary;
  readonly partTimeNet: NetSalary;
  readonly netIncomeLoss: EuroAmount;
  readonly replacementRate: PercentageRate;
  readonly basiselterngeld: EuroAmount;
  readonly elterngeldPlus: EuroAmount;
  readonly noIncomeBasiselterngeld: EuroAmount;
  readonly elterngeldPlusCeiling: EuroAmount;
  readonly isMaxCapped: boolean;
  readonly isMinFloorApplied: boolean;
  readonly isHoursDisqualified: boolean;
}

/**
 * Explicit statutory constants for BEEG § 2a sibling bonus calculation.
 */
export interface SiblingBonusConstants {
  readonly siblingBonusRate: PercentageRate;
  readonly siblingMinimumBasisAmount: EuroAmount;
  readonly basisMaximumAmount: EuroAmount;
  readonly elterngeldPlusFraction: number;
  readonly singleOlderSiblingMaxAgeMonths: number;
  readonly multipleSiblingsMaxAgeMonths: number;
  readonly multipleSiblingsMinimumCount: number;
}

/**
 * Named inputs for evaluating statutory Geschwisterbonus (§ 2a BEEG).
 */
export interface SiblingBonusFormulaInputs extends SiblingBonusConstants {
  readonly baseElterngeldPlus: EuroAmount;
  readonly siblingAgesInMonths: readonly number[];
}

/**
 * Pure mathematical output of § 2a BEEG sibling bonus formula.
 */
export interface SiblingBonusFormulaResult {
  readonly isEligible: boolean;
  readonly baseElterngeldPlus: EuroAmount;
  readonly siblingBonusAmount: EuroAmount;
  readonly totalElterngeldPlusWithBonus: EuroAmount;
  readonly youngestQualifyingAgeInMonths: number;
}

/**
 * Named inputs for maternity protection wage replacement breakdown (§§ 19, 20 MuSchG).
 */
export interface MaternityProtectionBenefitFormulaInputs {
  readonly preBirthMonthlyNet: NetSalary;
  readonly statutoryDailyHealthInsuranceCap: EuroAmount;
  readonly statutoryDaysPerCalendarMonth: number;
}

/**
 * Pure mathematical output of §§ 19, 20 MuSchG maternity protection formula.
 */
export interface MaternityProtectionBenefitFormulaResult {
  readonly healthInsuranceShare: EuroAmount;
  readonly employerSupplement: EuroAmount;
  readonly totalMaternityBenefit: EuroAmount;
}

/**
 * Named inputs for child tax allowance vs. child benefit favorability comparison (§ 31 EStG).
 */
export interface ChildAllowanceFavorabilityFormulaInputs {
  readonly jointTaxWithoutAllowance: EuroAmount;
  readonly jointTaxWithAllowance: EuroAmount;
  readonly totalKindergeldReceived: EuroAmount;
}

/**
 * Pure mathematical output of Günstigerprüfung (§ 31 EStG).
 */
export interface ChildAllowanceFavorabilityFormulaResult {
  readonly taxSavingsFromAllowance: EuroAmount;
  readonly isKinderfreibetragFavorable: boolean;
  readonly extraTaxRefund: EuroAmount;
}

/**
 * Evaluates the BEEG § 2 Abs. 1 & 2 wage-replacement sliding scale from explicit constants.
 */
export function evaluateParentalReplacementRateFormula(
  inputs: Readonly<ParentalReplacementRateFormulaInputs>,
): PercentageRate {
  if (inputs.preBirthMonthlyNet <= 0) {
    return inputs.standardReplacementRate;
  }

  if (inputs.preBirthMonthlyNet < inputs.lowIncomeThreshold) {
    const increase = (inputs.lowIncomeThreshold - inputs.preBirthMonthlyNet) * inputs.rateChangePerEuro;
    return toPercentageRate(
      Math.min(inputs.maximumReplacementRate, inputs.standardReplacementRate + increase),
    );
  }

  if (inputs.preBirthMonthlyNet <= inputs.rateDecreaseThreshold) {
    return inputs.standardReplacementRate;
  }

  if (inputs.preBirthMonthlyNet < inputs.minimumRateThreshold) {
    const decrease = (inputs.preBirthMonthlyNet - inputs.rateDecreaseThreshold) * inputs.rateChangePerEuro;
    return toPercentageRate(
      Math.max(inputs.minimumReplacementRate, inputs.standardReplacementRate - decrease),
    );
  }

  return inputs.minimumReplacementRate;
}

/**
 * Evaluates whether weekly employment hours meet the § 1 Abs. 1 Nr. 4 BEEG maximum limit.
 */
export function evaluateElterngeldHoursEligibilityFormula(
  inputs: Readonly<ElterngeldHoursEligibilityFormulaInputs>,
): boolean {
  return inputs.weeklyWorkingHours >= 0 && inputs.weeklyWorkingHours <= inputs.maximumWeeklyHoursLimit;
}

/**
 * Evaluates simultaneous parent weekly working hours for Partnerschaftsbonus eligibility (§ 4b BEEG).
 */
export function evaluatePartnershipBonusHoursEligibilityFormula(
  inputs: Readonly<PartnershipBonusHoursEligibilityFormulaInputs>,
): boolean {
  return (
    inputs.primaryParentWeeklyHours >= inputs.minimumWeeklyHours &&
    inputs.primaryParentWeeklyHours <= inputs.maximumWeeklyHours &&
    inputs.secondaryParentWeeklyHours >= inputs.minimumWeeklyHours &&
    inputs.secondaryParentWeeklyHours <= inputs.maximumWeeklyHours
  );
}

/**
 * Evaluates monthly Basiselterngeld and ElterngeldPlus entitlement from explicit statutory constants.
 */
export function evaluateParentalBenefitEntitlementFormula(
  inputs: Readonly<ParentalBenefitEntitlementFormulaInputs>,
): ParentalBenefitEntitlementFormulaResult {
  const assessablePreBirthNet = toNetSalary(
    Math.min(inputs.preBirthMonthlyNet, inputs.maximumAssessablePreBirthNet),
  );

  if (
    inputs.weeklyWorkingHours !== undefined &&
    !evaluateElterngeldHoursEligibilityFormula({
      weeklyWorkingHours: inputs.weeklyWorkingHours,
      maximumWeeklyHoursLimit: inputs.maximumWeeklyHoursLimit,
    })
  ) {
    return Object.freeze({
      preBirthNet: inputs.preBirthMonthlyNet,
      assessablePreBirthNet,
      partTimeNet: inputs.partTimeMonthlyNet,
      netIncomeLoss: toEuroAmount(0),
      replacementRate: toPercentageRate(0),
      basiselterngeld: toEuroAmount(0),
      elterngeldPlus: toEuroAmount(0),
      noIncomeBasiselterngeld: toEuroAmount(0),
      elterngeldPlusCeiling: toEuroAmount(0),
      isMaxCapped: false,
      isMinFloorApplied: false,
      isHoursDisqualified: true,
    });
  }

  const netIncomeLoss = Math.max(0, assessablePreBirthNet - inputs.partTimeMonthlyNet);
  const replacementRate = evaluateParentalReplacementRateFormula(inputs);
  const rawBenefit = toEuroAmount(netIncomeLoss * replacementRate);

  const basiselterngeld = toEuroAmount(
    Math.min(inputs.basisMaximumAmount, Math.max(inputs.basisMinimumAmount, rawBenefit)),
  );

  const noIncomeBasiselterngeld = toEuroAmount(
    Math.min(
      inputs.basisMaximumAmount,
      Math.max(inputs.basisMinimumAmount, toEuroAmount(assessablePreBirthNet * replacementRate)),
    ),
  );
  const elterngeldPlusCeiling = toEuroAmount(noIncomeBasiselterngeld * inputs.elterngeldPlusFraction);
  const plusMinimum = toEuroAmount(inputs.basisMinimumAmount * inputs.elterngeldPlusFraction);
  const elterngeldPlus = toEuroAmount(
    Math.min(elterngeldPlusCeiling, Math.max(plusMinimum, rawBenefit)),
  );

  return Object.freeze({
    preBirthNet: inputs.preBirthMonthlyNet,
    assessablePreBirthNet,
    partTimeNet: inputs.partTimeMonthlyNet,
    netIncomeLoss: toEuroAmount(netIncomeLoss),
    replacementRate,
    basiselterngeld,
    elterngeldPlus,
    noIncomeBasiselterngeld,
    elterngeldPlusCeiling,
    isMaxCapped: elterngeldPlus === elterngeldPlusCeiling,
    isMinFloorApplied: elterngeldPlus === plusMinimum,
    isHoursDisqualified: false,
  });
}

/**
 * Evaluates the BEEG § 2a sibling bonus (10% addition, minimum floor, personal maximum cap).
 */
export function evaluateSiblingBonusFormula(
  inputs: Readonly<SiblingBonusFormulaInputs>,
): SiblingBonusFormulaResult {
  const qualifyingBySingleOlder = inputs.siblingAgesInMonths.some(
    (age) => age >= 0 && age <= inputs.singleOlderSiblingMaxAgeMonths,
  );
  const qualifyingByMultipleYounger =
    inputs.siblingAgesInMonths.filter(
      (age) => age >= 0 && age <= inputs.multipleSiblingsMaxAgeMonths,
    ).length >= inputs.multipleSiblingsMinimumCount;
  const isEligible =
    inputs.baseElterngeldPlus > 0 && (qualifyingBySingleOlder || qualifyingByMultipleYounger);
  const youngestQualifyingAgeInMonths =
    inputs.siblingAgesInMonths.length > 0 ? Math.min(...inputs.siblingAgesInMonths) : -1;

  if (!isEligible) {
    return Object.freeze({
      isEligible: false,
      baseElterngeldPlus: inputs.baseElterngeldPlus,
      siblingBonusAmount: toEuroAmount(0),
      totalElterngeldPlusWithBonus: inputs.baseElterngeldPlus,
      youngestQualifyingAgeInMonths,
    });
  }

  const plusMinimumAddition = toEuroAmount(
    inputs.siblingMinimumBasisAmount * inputs.elterngeldPlusFraction,
  );
  const percentageAddition = toEuroAmount(inputs.baseElterngeldPlus * inputs.siblingBonusRate);
  const bonusAddition = Math.max(plusMinimumAddition, percentageAddition);
  const absoluteMaximumWithBonus = toEuroAmount(
    inputs.basisMaximumAmount * inputs.elterngeldPlusFraction * (1 + inputs.siblingBonusRate),
  );
  const totalWithBonus = toEuroAmount(
    Math.min(absoluteMaximumWithBonus, inputs.baseElterngeldPlus + bonusAddition),
  );

  return Object.freeze({
    isEligible: true,
    baseElterngeldPlus: inputs.baseElterngeldPlus,
    siblingBonusAmount: toEuroAmount(totalWithBonus - inputs.baseElterngeldPlus),
    totalElterngeldPlusWithBonus: totalWithBonus,
    youngestQualifyingAgeInMonths,
  });
}

/**
 * Evaluates statutory maternity protection split between GKV daily Mutterschaftsgeld
 * and employer top-up supplement (§§ 19, 20 MuSchG).
 */
export function evaluateMaternityProtectionBenefitFormula(
  inputs: Readonly<MaternityProtectionBenefitFormulaInputs>,
): MaternityProtectionBenefitFormulaResult {
  if (inputs.preBirthMonthlyNet <= 0) {
    return Object.freeze({
      healthInsuranceShare: toEuroAmount(0),
      employerSupplement: toEuroAmount(0),
      totalMaternityBenefit: toEuroAmount(0),
    });
  }

  const monthlyStatutoryHealthCeiling =
    inputs.statutoryDailyHealthInsuranceCap * inputs.statutoryDaysPerCalendarMonth;
  const healthInsuranceShare = toEuroAmount(
    Math.min(inputs.preBirthMonthlyNet, monthlyStatutoryHealthCeiling),
  );
  const employerSupplement = toEuroAmount(
    Math.max(0, inputs.preBirthMonthlyNet - healthInsuranceShare),
  );

  return Object.freeze({
    healthInsuranceShare,
    employerSupplement,
    totalMaternityBenefit: toEuroAmount(inputs.preBirthMonthlyNet),
  });
}

/**
 * Evaluates § 31 Satz 4 EStG child-allowance vs. child-benefit favorability comparison.
 */
export function evaluateChildAllowanceFavorabilityFormula(
  inputs: Readonly<ChildAllowanceFavorabilityFormulaInputs>,
): ChildAllowanceFavorabilityFormulaResult {
  const taxSavingsFromAllowance = toEuroAmount(
    Math.max(0, inputs.jointTaxWithoutAllowance - inputs.jointTaxWithAllowance),
  );
  const isKinderfreibetragFavorable = taxSavingsFromAllowance > inputs.totalKindergeldReceived;
  const extraTaxRefund = toEuroAmount(
    isKinderfreibetragFavorable
      ? Math.max(0, taxSavingsFromAllowance - inputs.totalKindergeldReceived)
      : 0,
  );

  return Object.freeze({
    taxSavingsFromAllowance,
    isKinderfreibetragFavorable,
    extraTaxRefund,
  });
}
