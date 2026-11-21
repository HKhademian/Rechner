import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  type ParentalBenefitEntitlementConstants,
  type SiblingBonusConstants,
  evaluateAllowanceVariantMonthConversionFormula,
  evaluateAllowanceVariantWeightFormula,
  evaluateChildAllowanceFavorabilityFormula,
  evaluateElterngeldHoursEligibilityFormula,
  evaluateMaternityProtectionBenefitFormula,
  evaluateOverlapCreditedPaymentFormula,
  evaluateParentalAllowanceBudgetFormula,
  evaluateParentalBenefitEntitlementFormula,
  evaluateParentalReplacementRateFormula,
  evaluatePartnershipBonusHoursEligibilityFormula,
  evaluateSiblingBonusFormula,
} from "#engine/formulas/pure/parentalBenefitFormulas";
import {
  ElterngeldVariant,
  toEuroAmount,
  toMonthDuration,
  toNetSalary,
  toPercentageRate,
  toWorkingHours,
} from "#engine/types";

const BEEG_STATUTORY_CONSTANTS: ParentalBenefitEntitlementConstants = Object.freeze({
  standardReplacementRate: toPercentageRate(0.67),
  minimumReplacementRate: toPercentageRate(0.65),
  maximumReplacementRate: toPercentageRate(1),
  lowIncomeThreshold: toEuroAmount(1000),
  rateDecreaseThreshold: toEuroAmount(1200),
  minimumRateThreshold: toEuroAmount(1240),
  rateChangePerEuro: 0.0005,
  maximumAssessablePreBirthNet: toNetSalary(2770),
  basisMinimumAmount: toEuroAmount(300),
  basisMaximumAmount: toEuroAmount(1800),
  elterngeldPlusFraction: 0.5,
  maximumWeeklyHoursLimit: toWorkingHours(32),
});

const SIBLING_STATUTORY_CONSTANTS: SiblingBonusConstants = Object.freeze({
  siblingBonusRate: toPercentageRate(0.1),
  siblingMinimumBasisAmount: toEuroAmount(75),
  basisMaximumAmount: toEuroAmount(1800),
  elterngeldPlusFraction: 0.5,
  singleOlderSiblingMaxAgeMonths: 35,
  multipleSiblingsMaxAgeMonths: 71,
  multipleSiblingsMinimumCount: 2,
});

describe("Tier 1 Pure Parental Benefit & Maternity Formulas (context-unaware)", () => {
  it("evaluates the § 2 BEEG sliding wage replacement scale cleanly across all bands", () => {
    assert.equal(
      evaluateParentalReplacementRateFormula({
        ...BEEG_STATUTORY_CONSTANTS,
        preBirthMonthlyNet: toNetSalary(900),
      }),
      0.72,
    );
    assert.equal(
      evaluateParentalReplacementRateFormula({
        ...BEEG_STATUTORY_CONSTANTS,
        preBirthMonthlyNet: toNetSalary(1100),
      }),
      0.67,
    );
    assert.equal(
      evaluateParentalReplacementRateFormula({
        ...BEEG_STATUTORY_CONSTANTS,
        preBirthMonthlyNet: toNetSalary(1220),
      }),
      0.66,
    );
    assert.equal(
      evaluateParentalReplacementRateFormula({
        ...BEEG_STATUTORY_CONSTANTS,
        preBirthMonthlyNet: toNetSalary(2500),
      }),
      0.65,
    );
  });

  it("evaluates Basiselterngeld, personal ElterngeldPlus ceiling, floors, and >32h disqualification", () => {
    const standardNoPartTime = evaluateParentalBenefitEntitlementFormula({
      ...BEEG_STATUTORY_CONSTANTS,
      preBirthMonthlyNet: toNetSalary(3500),
      partTimeMonthlyNet: toNetSalary(0),
      weeklyWorkingHours: toWorkingHours(0),
    });
    assert.equal(standardNoPartTime.assessablePreBirthNet, 2770);
    assert.equal(standardNoPartTime.basiselterngeld, 1800);
    assert.equal(standardNoPartTime.elterngeldPlus, 900);
    assert.equal(standardNoPartTime.isMaxCapped, true);

    const lowIncomeFloor = evaluateParentalBenefitEntitlementFormula({
      ...BEEG_STATUTORY_CONSTANTS,
      preBirthMonthlyNet: toNetSalary(100),
      partTimeMonthlyNet: toNetSalary(0),
    });
    assert.equal(lowIncomeFloor.basiselterngeld, 300);
    assert.equal(lowIncomeFloor.elterngeldPlus, 150);
    assert.equal(lowIncomeFloor.isMinFloorApplied, true);

    const disqualifiedByHours = evaluateParentalBenefitEntitlementFormula({
      ...BEEG_STATUTORY_CONSTANTS,
      preBirthMonthlyNet: toNetSalary(3000),
      partTimeMonthlyNet: toNetSalary(1500),
      weeklyWorkingHours: toWorkingHours(35),
    });
    assert.equal(disqualifiedByHours.isHoursDisqualified, true);
    assert.equal(disqualifiedByHours.basiselterngeld, 0);
    assert.equal(disqualifiedByHours.elterngeldPlus, 0);
  });

  it("evaluates § 1 Abs. 1 Nr. 4 and § 4b BEEG working-hours checks", () => {
    assert.equal(
      evaluateElterngeldHoursEligibilityFormula({
        weeklyWorkingHours: toWorkingHours(32),
        maximumWeeklyHoursLimit: toWorkingHours(32),
      }),
      true,
    );
    assert.equal(
      evaluatePartnershipBonusHoursEligibilityFormula({
        primaryParentWeeklyHours: toWorkingHours(24),
        secondaryParentWeeklyHours: toWorkingHours(32),
        minimumWeeklyHours: toWorkingHours(24),
        maximumWeeklyHours: toWorkingHours(32),
      }),
      true,
    );
  });

  it("evaluates § 2a BEEG sibling bonus minimum, percentage, multiple-children rule, and maximum cap", () => {
    const cappedAt990 = evaluateSiblingBonusFormula({
      ...SIBLING_STATUTORY_CONSTANTS,
      baseElterngeldPlus: toEuroAmount(900),
      siblingAgesInMonths: [20],
    });
    assert.equal(cappedAt990.isEligible, true);
    assert.equal(cappedAt990.siblingBonusAmount, 90);
    assert.equal(cappedAt990.totalElterngeldPlusWithBonus, 990);

    const minimumAddition = evaluateSiblingBonusFormula({
      ...SIBLING_STATUTORY_CONSTANTS,
      baseElterngeldPlus: toEuroAmount(150),
      siblingAgesInMonths: [50, 60],
    });
    assert.equal(minimumAddition.isEligible, true);
    assert.equal(minimumAddition.siblingBonusAmount, 37.5);
    assert.equal(minimumAddition.totalElterngeldPlusWithBonus, 187.5);
  });

  it("evaluates §§ 19, 20 MuSchG health share vs. employer supplement and § 31 EStG favorability", () => {
    const muSchG = evaluateMaternityProtectionBenefitFormula({
      preBirthMonthlyNet: toNetSalary(2800),
      statutoryDailyHealthInsuranceCap: toEuroAmount(13),
      statutoryDaysPerCalendarMonth: 30,
    });
    assert.equal(muSchG.healthInsuranceShare, 390);
    assert.equal(muSchG.employerSupplement, 2410);
    assert.equal(muSchG.totalMaternityBenefit, 2800);

    const favorable = evaluateChildAllowanceFavorabilityFormula({
      jointTaxWithoutAllowance: toEuroAmount(25000),
      jointTaxWithAllowance: toEuroAmount(21000),
      totalKindergeldReceived: toEuroAmount(3108),
    });
    assert.equal(favorable.taxSavingsFromAllowance, 4000);
    assert.equal(favorable.isKinderfreibetragFavorable, true);
    assert.equal(favorable.extraTaxRefund, 892);
  });

  it("evaluates Basis vs. Plus unit weights, 14-unit family budgets, month conversions, and § 3(2) overlap credit floors", () => {
    assert.equal(
      evaluateAllowanceVariantWeightFormula({
        variant: ElterngeldVariant.Basis,
        elterngeldPlusFraction: 0.5,
      }),
      1,
    );
    assert.equal(
      evaluateAllowanceVariantWeightFormula({
        variant: ElterngeldVariant.Plus,
        elterngeldPlusFraction: 0.5,
      }),
      0.5,
    );

    const budget = evaluateParentalAllowanceBudgetFormula({
      motherVariant: ElterngeldVariant.Basis,
      fatherVariant: ElterngeldVariant.Basis,
      motherOrdinaryMonths: toMonthDuration(10),
      fatherOrdinaryMonths: toMonthDuration(2),
      maternityPostBirthMonths: toMonthDuration(2),
      partnershipBonusMonths: toMonthDuration(4),
      familyBasisMonths: toMonthDuration(12),
      additionalPartnerBasisMonths: toMonthDuration(2),
      minimumParentClaimMonths: toMonthDuration(2),
      elterngeldPlusFraction: 0.5,
    });
    assert.equal(budget.maternityBasisUnits, 2);
    assert.equal(budget.motherBasisUnits, 12);
    assert.equal(budget.fatherBasisUnits, 2);
    assert.equal(budget.totalBasisUnits, 14);
    assert.equal(budget.maxFamilyBasisUnits, 14);
    assert.equal(budget.maxBasisLifeMonths, 14);
    assert.equal(budget.isWithinBudget, true);

    assert.equal(
      evaluateAllowanceVariantMonthConversionFormula({
        currentMonths: toMonthDuration(12),
        fromVariant: ElterngeldVariant.Plus,
        toVariant: ElterngeldVariant.Basis,
        maxMonthsInTargetVariant: 10,
        elterngeldPlusFraction: 0.5,
      }),
      6,
    );

    const basisOverlap = evaluateOverlapCreditedPaymentFormula({
      grossEntitlement: toEuroAmount(1800),
      overlappingBenefitAmount: toEuroAmount(2000),
      priorBenefitMonthsInWindow: 0,
      assessmentWindowMonths: toMonthDuration(12),
      basisMinimumAmount: toEuroAmount(300),
      elterngeldPlusFraction: 0.5,
      variant: ElterngeldVariant.Basis,
    });
    assert.equal(basisOverlap.protectedMinimum, 300);
    assert.equal(basisOverlap.payableAmount, 300);
    assert.equal(basisOverlap.appliedOffset, 1500);

    const plusOverlap = evaluateOverlapCreditedPaymentFormula({
      grossEntitlement: toEuroAmount(900),
      overlappingBenefitAmount: toEuroAmount(2000),
      priorBenefitMonthsInWindow: 0,
      assessmentWindowMonths: toMonthDuration(12),
      basisMinimumAmount: toEuroAmount(300),
      elterngeldPlusFraction: 0.5,
      variant: ElterngeldVariant.Plus,
    });
    assert.equal(plusOverlap.protectedMinimum, 150);
    assert.equal(plusOverlap.payableAmount, 150);
    assert.equal(plusOverlap.appliedOffset, 750);
  });
});
