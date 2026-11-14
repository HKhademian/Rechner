import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  evaluateBenefitTransitionContributionBaseFormula,
  evaluateCareInsuranceContributionFormula,
  evaluateHealthInsuranceContributionFormula,
  evaluateTransitionZoneAssessmentBasesFormula,
  evaluateTransitionZoneFactorFormula,
} from "#engine/formulas/pure/socialContributionFormulas";
import {
  toEuroAmount,
  toGrossSalary,
  toPercentageRate,
} from "#engine/types";

describe("Tier 1 Pure Social Contribution Formulas (context-unaware)", () => {
  it("evaluates SGB IV § 20 Midijob factor F and reduced employee/total assessment bases", () => {
    const factor = evaluateTransitionZoneFactorFormula({
      transitionFlatRate: toPercentageRate(0.28),
      healthEmployeeRate: toPercentageRate(0.073),
      healthSupplementTotalRate: toPercentageRate(0.029),
      pensionEmployeeRate: toPercentageRate(0.093),
      unemploymentEmployeeRate: toPercentageRate(0.013),
      careEmployeeBaseRate: toPercentageRate(0.018),
    });
    assert.equal(factor, 0.6619);

    const bases = evaluateTransitionZoneAssessmentBasesFormula({
      actualMonthlyGross: toGrossSalary(1200),
      expectedMonthlyGross: toGrossSalary(1200),
      marginalEarningsLimitMonthly: toEuroAmount(603),
      transitionZoneCeilingMonthly: toEuroAmount(2000),
      transitionZoneFactor: factor,
    });
    assert.equal(bases.isReducedTransitionZone, true);
    assert.equal(bases.isMarginalEmployment, false);
    assert.ok(bases.employeeAssessmentBase < 1200);
    assert.ok(bases.totalAssessmentBase < 1200);
    assert.ok(bases.employeeAssessmentBase < bases.totalAssessmentBase);
  });

  it("applies § 2 BVV separate rounding for health general share and supplement share", () => {
    const contribution = evaluateHealthInsuranceContributionFormula({
      assessmentBase: toEuroAmount(5000),
      baseHealthEmployeeRate: toPercentageRate(0.073),
      insurerSupplementTotalRate: toPercentageRate(0.025),
    });
    assert.equal(contribution, 427.5);
  });

  it("evaluates standard and transition-zone care insurance contributions under § 55 SGB XI", () => {
    const childless = evaluateCareInsuranceContributionFormula({
      healthAssessmentBase: toEuroAmount(4000),
      totalTransitionAssessmentBase: toEuroAmount(4000),
      isReducedTransitionZone: false,
      careBaseEmployeeRate: toPercentageRate(0.018),
      saxonyExtraEmployeeRate: toPercentageRate(0.005),
      childlessSurchargeRate: toPercentageRate(0.006),
      childDiscountRatePerChild: toPercentageRate(0.0025),
      appliesSaxonyRate: false,
      appliesChildlessSurcharge: true,
      qualifyingDiscountChildCount: 0,
    });
    assert.equal(childless.effectiveCareRate, 0.024);
    assert.equal(childless.careContribution, 96);

    const twoChildrenDiscount = evaluateCareInsuranceContributionFormula({
      healthAssessmentBase: toEuroAmount(4000),
      totalTransitionAssessmentBase: toEuroAmount(4000),
      isReducedTransitionZone: false,
      careBaseEmployeeRate: toPercentageRate(0.018),
      saxonyExtraEmployeeRate: toPercentageRate(0.005),
      childlessSurchargeRate: toPercentageRate(0.006),
      childDiscountRatePerChild: toPercentageRate(0.0025),
      appliesSaxonyRate: false,
      appliesChildlessSurcharge: false,
      qualifyingDiscountChildCount: 2,
    });
    assert.equal(twoChildrenDiscount.effectiveCareRate, 0.013);
    assert.equal(twoChildrenDiscount.careContribution, 52);
  });

  it("evaluates BEEG § 2f standardized benefit contribution bases for Minijob, Midijob, and regular pay", () => {
    const sharedConstants = {
      marginalEarningsLimitMonthly: toEuroAmount(603),
      transitionZoneCeilingMonthly: toEuroAmount(2000),
      benefitTransitionFlatRate: toPercentageRate(0.28),
      standardHealthCareDeductionRate: toPercentageRate(0.09),
      standardPensionDeductionRate: toPercentageRate(0.1),
      standardUnemploymentDeductionRate: toPercentageRate(0.02),
    };

    assert.equal(
      evaluateBenefitTransitionContributionBaseFormula({
        ...sharedConstants,
        monthlyGross: toGrossSalary(550),
      }),
      0,
    );

    const midijob = evaluateBenefitTransitionContributionBaseFormula({
      ...sharedConstants,
      monthlyGross: toGrossSalary(1200),
    });
    assert.ok(midijob > 0 && midijob < 1200);

    assert.equal(
      evaluateBenefitTransitionContributionBaseFormula({
        ...sharedConstants,
        monthlyGross: toGrossSalary(3500),
      }),
      3500,
    );
  });
});
