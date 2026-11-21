import {
  type EuroAmount,
  type MonthDuration,
  type NetSalary,
  type PercentageRate,
  type WorkingHours,
  AllowancePlanMode,
  ElterngeldVariant,
  toEuroAmount,
  toMonthDuration,
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

/**
 * Named inputs for mapping an `ElterngeldVariant` to its statutory Basis-month unit weight (§§ 4, 4a BEEG).
 */
export interface AllowanceVariantWeightFormulaInputs {
  readonly variant: ElterngeldVariant;
  readonly elterngeldPlusFraction: number;
}

/**
 * Explicit statutory constants for evaluating BEEG §§ 4, 4a, 4b Basis-unit allowance budgets.
 */
export interface ParentalAllowanceBudgetConstants {
  readonly familyBasisMonths: MonthDuration;
  readonly additionalPartnerBasisMonths: MonthDuration;
  readonly minimumParentClaimMonths: MonthDuration;
  readonly elterngeldPlusFraction: number;
}

/**
 * Named inputs for pure BEEG §§ 4, 4a, 4b Basis-unit budget utilization and per-parent capacity math.
 */
export interface ParentalAllowanceBudgetFormulaInputs extends ParentalAllowanceBudgetConstants {
  readonly motherVariant: ElterngeldVariant;
  readonly fatherVariant: ElterngeldVariant;
  readonly motherOrdinaryMonths: MonthDuration;
  readonly fatherOrdinaryMonths: MonthDuration;
  readonly maternityPostBirthMonths: MonthDuration;
  readonly partnershipBonusMonths: MonthDuration;
}

/**
 * Pure mathematical output of BEEG §§ 4, 4a, 4b Basis-unit allowance budget evaluation.
 */
export interface ParentalAllowanceBudgetFormulaResult {
  readonly motherVariant: ElterngeldVariant;
  readonly fatherVariant: ElterngeldVariant;
  readonly motherOrdinaryMonths: MonthDuration;
  readonly fatherOrdinaryMonths: MonthDuration;
  readonly motherUnitWeight: number;
  readonly fatherUnitWeight: number;
  readonly maternityBasisUnits: number;
  readonly motherBasisUnits: number;
  readonly fatherBasisUnits: number;
  readonly totalBasisUnits: number;
  readonly maxIndividualBasisUnits: number;
  readonly maxFamilyBasisUnits: number;
  readonly maxBasisLifeMonths: number;
  readonly maxMotherOrdinaryMonths: number;
  readonly maxFatherOrdinaryMonths: number;
  readonly isWithinBudget: boolean;
}

/**
 * Named inputs for pure Basiselterngeld <-> ElterngeldPlus month conversion clamped to a statutory cap.
 */
export interface AllowanceVariantMonthConversionFormulaInputs {
  readonly currentMonths: MonthDuration;
  readonly fromVariant: ElterngeldVariant;
  readonly toVariant: ElterngeldVariant;
  readonly maxMonthsInTargetVariant: number;
  readonly elterngeldPlusFraction: number;
}

/**
 * Named inputs for § 3 Abs. 2 BEEG overlapping benefit credit and variant-aware protected minimum floor.
 */
export interface OverlapCreditedPaymentFormulaInputs {
  readonly grossEntitlement: EuroAmount;
  readonly overlappingBenefitAmount: EuroAmount;
  readonly priorBenefitMonthsInWindow: number;
  readonly assessmentWindowMonths: MonthDuration;
  readonly basisMinimumAmount: EuroAmount;
  readonly elterngeldPlusFraction: number;
  readonly variant: ElterngeldVariant;
}

/**
 * Pure mathematical output of § 3 Abs. 2 BEEG overlap-credited monthly payment evaluation.
 */
export interface OverlapCreditedPaymentFormulaResult {
  readonly protectedMinimum: EuroAmount;
  readonly overlapCredit: EuroAmount;
  readonly payableAmount: EuroAmount;
  readonly appliedOffset: EuroAmount;
}

/**
 * Tier 1: Maps Basiselterngeld (1.0 Basis unit/month) vs. ElterngeldPlus (`elterngeldPlusFraction` Basis units/month).
 */
export function evaluateAllowanceVariantWeightFormula(
  inputs: Readonly<AllowanceVariantWeightFormulaInputs>,
): number {
  return inputs.variant === ElterngeldVariant.Basis ? 1 : inputs.elterngeldPlusFraction;
}

/**
 * Tier 1: Evaluates statutory BEEG §§ 4, 4a, 4b Basis-unit budget utilization and remaining per-parent month caps.
 */
export function evaluateParentalAllowanceBudgetFormula(
  inputs: Readonly<ParentalAllowanceBudgetFormulaInputs>,
): ParentalAllowanceBudgetFormulaResult {
  const motherUnitWeight = evaluateAllowanceVariantWeightFormula({
    variant: inputs.motherVariant,
    elterngeldPlusFraction: inputs.elterngeldPlusFraction,
  });
  const fatherUnitWeight = evaluateAllowanceVariantWeightFormula({
    variant: inputs.fatherVariant,
    elterngeldPlusFraction: inputs.elterngeldPlusFraction,
  });

  const maternityBasisUnits = inputs.maternityPostBirthMonths;
  const motherBasisUnits = maternityBasisUnits + inputs.motherOrdinaryMonths * motherUnitWeight;
  const fatherBasisUnits = inputs.fatherOrdinaryMonths * fatherUnitWeight;
  const totalBasisUnits = motherBasisUnits + fatherBasisUnits;

  const maxIndividualBasisUnits = inputs.familyBasisMonths;
  const maxBasisLifeMonths = inputs.familyBasisMonths + inputs.additionalPartnerBasisMonths;
  const hasPartnerClaim =
    inputs.fatherOrdinaryMonths + inputs.partnershipBonusMonths >= inputs.minimumParentClaimMonths;
  const maxFamilyBasisUnits =
    inputs.familyBasisMonths + (hasPartnerClaim ? inputs.additionalPartnerBasisMonths : 0);

  const remainingMotherBasisUnits = Math.max(
    0,
    Math.min(
      maxIndividualBasisUnits - maternityBasisUnits,
      maxFamilyBasisUnits - maternityBasisUnits - fatherBasisUnits,
    ),
  );
  const remainingFatherBasisUnits = Math.max(
    0,
    Math.min(maxIndividualBasisUnits, maxBasisLifeMonths - motherBasisUnits),
  );

  const maxMotherOrdinaryMonths = Math.floor(remainingMotherBasisUnits / motherUnitWeight);
  const maxFatherOrdinaryMonths = Math.floor(remainingFatherBasisUnits / fatherUnitWeight);
  const isWithinBudget =
    motherBasisUnits <= maxIndividualBasisUnits &&
    fatherBasisUnits <= maxIndividualBasisUnits &&
    totalBasisUnits <= maxFamilyBasisUnits;

  return Object.freeze({
    motherVariant: inputs.motherVariant,
    fatherVariant: inputs.fatherVariant,
    motherOrdinaryMonths: inputs.motherOrdinaryMonths,
    fatherOrdinaryMonths: inputs.fatherOrdinaryMonths,
    motherUnitWeight,
    fatherUnitWeight,
    maternityBasisUnits,
    motherBasisUnits,
    fatherBasisUnits,
    totalBasisUnits,
    maxIndividualBasisUnits,
    maxFamilyBasisUnits,
    maxBasisLifeMonths,
    maxMotherOrdinaryMonths,
    maxFatherOrdinaryMonths,
    isWithinBudget,
  });
}

/**
 * Tier 1: Converts an ordinary allowance month count when switching between Basiselterngeld
 * and ElterngeldPlus, clamped to the target variant's remaining statutory capacity.
 */
export function evaluateAllowanceVariantMonthConversionFormula(
  inputs: Readonly<AllowanceVariantMonthConversionFormulaInputs>,
): MonthDuration {
  if (inputs.fromVariant === inputs.toVariant) {
    return toMonthDuration(Math.max(0, Math.min(inputs.maxMonthsInTargetVariant, inputs.currentMonths)));
  }
  const converted = inputs.toVariant === ElterngeldVariant.Basis
    ? Math.round(inputs.currentMonths * inputs.elterngeldPlusFraction)
    : Math.round(inputs.currentMonths / inputs.elterngeldPlusFraction);
  return toMonthDuration(Math.max(0, Math.min(inputs.maxMonthsInTargetVariant, converted)));
}

/**
 * Tier 1: Evaluates § 3 Abs. 2 BEEG overlapping benefit credit and variant-aware protected minimum floor
 * (€300 for Basiselterngeld, €150 for ElterngeldPlus).
 */
export function evaluateOverlapCreditedPaymentFormula(
  inputs: Readonly<OverlapCreditedPaymentFormulaInputs>,
): OverlapCreditedPaymentFormulaResult {
  const unitWeight = evaluateAllowanceVariantWeightFormula({
    variant: inputs.variant,
    elterngeldPlusFraction: inputs.elterngeldPlusFraction,
  });
  const protectedMinimum = toEuroAmount(inputs.basisMinimumAmount * unitWeight);
  const uncreditedShare = Math.max(
    0,
    1 - inputs.priorBenefitMonthsInWindow / inputs.assessmentWindowMonths,
  );
  const overlapCredit = toEuroAmount(inputs.overlappingBenefitAmount * uncreditedShare);
  const payableAmount = toEuroAmount(
    Math.max(
      Math.min(protectedMinimum, inputs.grossEntitlement),
      inputs.grossEntitlement - overlapCredit,
    ),
  );
  const appliedOffset = toEuroAmount(inputs.grossEntitlement - payableAmount);

  return Object.freeze({
    protectedMinimum,
    overlapCredit,
    payableAmount,
    appliedOffset,
  });
}

/**
 * Named inputs for selecting the statutory parental allowance variant for a single life-month
 * under §§ 1, 4, 4a BEEG given working hours, life-month offset, and remaining Basis-unit budgets.
 */
export interface MonthlyVariantSelectionFormulaInputs {
  readonly planMode: AllowancePlanMode;
  readonly weeklyWorkingHours: WorkingHours;
  readonly maximumWeeklyHoursLimit: WorkingHours;
  readonly elapsedMonthsSinceBirth: number;
  readonly maxBasisLifeMonths: number;
  readonly remainingIndividualBasisUnits: number;
  readonly remainingFamilyBasisUnits: number;
  readonly elterngeldPlusFraction: number;
}

/**
 * Pure mathematical output of monthly parental allowance variant selection (§§ 1, 4, 4a BEEG).
 */
export interface MonthlyVariantSelectionFormulaResult {
  readonly selectedVariant: ElterngeldVariant | null;
  readonly basisUnitsConsumed: number;
  readonly isHoursEligible: boolean;
  readonly isWithinBasisWindow: boolean;
}

/**
 * Tier 1: Selects Basiselterngeld (1.0 Basis unit, LM 1–14) vs. ElterngeldPlus (`elterngeldPlusFraction`
 * Basis units) for a single life-month according to plan mode (`Auto`, `Basis`, or `Plus`),
 * § 1 Abs. 6 BEEG weekly hours cap, and remaining individual/family Basis-unit budgets.
 */
export function evaluateMonthlyVariantSelectionFormula(
  inputs: Readonly<MonthlyVariantSelectionFormulaInputs>,
): MonthlyVariantSelectionFormulaResult {
  const isHoursEligible = evaluateElterngeldHoursEligibilityFormula({
    weeklyWorkingHours: inputs.weeklyWorkingHours,
    maximumWeeklyHoursLimit: inputs.maximumWeeklyHoursLimit,
  });
  const isWithinBasisWindow =
    inputs.elapsedMonthsSinceBirth >= 0 &&
    inputs.elapsedMonthsSinceBirth < inputs.maxBasisLifeMonths;
  const availableUnits = Math.max(
    0,
    Math.min(inputs.remainingIndividualBasisUnits, inputs.remainingFamilyBasisUnits),
  );
  const epsilon = 1e-9;

  if (
    !isHoursEligible ||
    inputs.elapsedMonthsSinceBirth < 0 ||
    availableUnits + epsilon < inputs.elterngeldPlusFraction
  ) {
    return Object.freeze({
      selectedVariant: null,
      basisUnitsConsumed: 0,
      isHoursEligible,
      isWithinBasisWindow,
    });
  }

  if (inputs.planMode === AllowancePlanMode.Basis) {
    if (isWithinBasisWindow && availableUnits + epsilon >= 1) {
      return Object.freeze({
        selectedVariant: ElterngeldVariant.Basis,
        basisUnitsConsumed: 1,
        isHoursEligible,
        isWithinBasisWindow,
      });
    }
    return Object.freeze({
      selectedVariant: null,
      basisUnitsConsumed: 0,
      isHoursEligible,
      isWithinBasisWindow,
    });
  }

  if (inputs.planMode === AllowancePlanMode.Plus) {
    return Object.freeze({
      selectedVariant: ElterngeldVariant.Plus,
      basisUnitsConsumed: inputs.elterngeldPlusFraction,
      isHoursEligible,
      isWithinBasisWindow,
    });
  }

  // AllowancePlanMode.Auto: prefer Basiselterngeld on full parental leave (0h/wk) within LM 1–14,
  // falling back to ElterngeldPlus when past LM 14, on partial 0.5-unit remainder, or when working part-time.
  if (inputs.weeklyWorkingHours === 0 && isWithinBasisWindow && availableUnits + epsilon >= 1) {
    return Object.freeze({
      selectedVariant: ElterngeldVariant.Basis,
      basisUnitsConsumed: 1,
      isHoursEligible,
      isWithinBasisWindow,
    });
  }

  return Object.freeze({
    selectedVariant: ElterngeldVariant.Plus,
    basisUnitsConsumed: inputs.elterngeldPlusFraction,
    isHoursEligible,
    isWithinBasisWindow,
  });
}
