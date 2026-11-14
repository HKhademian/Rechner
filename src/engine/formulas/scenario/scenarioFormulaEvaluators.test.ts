import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  createStatutoryCalculationContext,
} from "#engine/formulas/context/statutoryContext";
import {
  type UserHouseholdStatutoryProfile,
  compareHouseholdStatutoryScenarios,
  evaluateHouseholdStatutoryProfile,
} from "#engine/formulas/scenario/scenarioFormulaEvaluators";
import {
  CalculationTier,
} from "#engine/formulas/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  toEuroAmount,
  toFullCalendarYear,
  toGrossSalary,
  toNetSalary,
  toWorkingHours,
} from "#engine/types";

const BASELINE_HOUSEHOLD_PROFILE: UserHouseholdStatutoryProfile = {
  primaryParentPreBirthMonthlyNet: toNetSalary(2800),
  primaryParentPartTimeMonthlyGross: toGrossSalary(1400),
  primaryParentPartTimeMonthlyNet: toNetSalary(1080),
  primaryParentWeeklyHours: toWorkingHours(24),
  secondaryParentWeeklyHours: toWorkingHours(28),
  primarySpouseAnnualTaxableIncome: toEuroAmount(82000),
  secondarySpouseAnnualTaxableIncome: toEuroAmount(16800),
  annualParentalBenefitProgressionIncome: toEuroAmount(10800),
  olderSiblingAgesInMonths: [18],
  qualifyingCareDiscountChildCount: 2,
  appliesSaxonyCareRate: false,
  appliesChildlessCareSurcharge: false,
  isDuringMaternityProtection: false,
  qualifyingChildAllowanceMonthsCount: 24,
};

describe("Tier 3 User & Scenario Formula Evaluators", () => {
  it("evaluates an integrated household profile and emits consolidated LawId and ParameterId audit provenance", () => {
    const context = createStatutoryCalculationContext({
      calendarYear: toFullCalendarYear(2026),
    });

    const evaluation = evaluateHouseholdStatutoryProfile(
      BASELINE_HOUSEHOLD_PROFILE,
      context,
    );

    assert.equal(evaluation.activeMonthlyMaternityBenefit, 0);
    assert.ok(evaluation.maternityProtection.totalMaternityBenefit === 2800);
    assert.ok(evaluation.parentalBenefitEntitlement.elterngeldPlus > 0);
    assert.equal(evaluation.siblingBonus.isEligible, true);
    assert.ok(evaluation.siblingBonus.siblingBonusAmount > 0);
    assert.equal(evaluation.partnershipBonusHoursEligible, true);
    assert.equal(evaluation.partTimeSocialContributions.transitionBases.isReducedTransitionZone, true);
    assert.ok(
      evaluation.annualJointIncomeTaxWithProgression.incomeTax >=
        evaluation.annualJointIncomeTaxWithoutProgression,
    );
    assert.equal(evaluation.auditSummary.tier, CalculationTier.ScenarioAndUserCalculation);
    assert.equal(evaluation.auditSummary.customOverrideApplied, false);
    assert.equal(evaluation.auditSummary.appliedLawIds.includes(LawId.BEEG_2), true);
    assert.equal(evaluation.auditSummary.appliedLawIds.includes(LawId.BEEG_2a), true);
    assert.equal(evaluation.auditSummary.appliedLawIds.includes(LawId.EStG_32b), true);
    assert.equal(evaluation.auditSummary.appliedLawIds.includes(LawId.SGB4_20), true);
    assert.equal(
      evaluation.auditSummary.consumedParameterIds.includes(ParameterId.Benefit_PlusFraction),
      true,
    );
    assert.equal(
      evaluation.auditSummary.consumedParameterIds.includes(ParameterId.Tax_BasicAllowance),
      true,
    );
  });

  it("compares baseline vs hypothetical scenario combining context overrides and user profile changes", () => {
    const comparison = compareHouseholdStatutoryScenarios(
      "2026 Part-Time + Bonus",
      BASELINE_HOUSEHOLD_PROFILE,
      { calendarYear: toFullCalendarYear(2026) },
      {
        label: "Higher Health Supplement + Full-Time Hours (>32h)",
        contextOptions: {
          customParameterOverrides: {
            [ParameterId.Tax_HealthSupplementTotalRate]: 0.036,
          },
        },
        profileOverrides: {
          primaryParentWeeklyHours: toWorkingHours(38),
          primaryParentPartTimeMonthlyGross: toGrossSalary(4200),
          primaryParentPartTimeMonthlyNet: toNetSalary(2750),
          isDuringMaternityProtection: true,
        },
      },
    );

    assert.equal(comparison.baseline.parentalBenefitEntitlement.isHoursDisqualified, false);
    assert.equal(comparison.alternative.parentalBenefitEntitlement.isHoursDisqualified, true);
    assert.equal(comparison.alternative.parentalBenefitEntitlement.elterngeldPlus, 0);
    assert.equal(comparison.alternative.partnershipBonusHoursEligible, false);
    assert.equal(comparison.alternative.activeMonthlyMaternityBenefit, 2800);
    assert.ok(comparison.deltas.monthlyElterngeldPlusDelta < 0);
    assert.ok(comparison.deltas.monthlySiblingBonusDelta < 0);
    assert.ok(comparison.deltas.monthlySocialContributionsDelta > 0);
    assert.equal(comparison.alternative.auditSummary.customOverrideApplied, true);
    assert.equal(comparison.combinedAppliedLawIds.includes(LawId.BEEG_4b), true);
    assert.equal(comparison.combinedAppliedLawIds.includes(LawId.MuSchG_19), true);
  });

  it("compares statutory year profiles cleanly while rejecting locked statutory overrides", () => {
    const yearComparison = compareHouseholdStatutoryScenarios(
      "2025 Statute",
      BASELINE_HOUSEHOLD_PROFILE,
      { calendarYear: toFullCalendarYear(2025) },
      {
        label: "2026 Statute",
        contextOptions: {
          calendarYear: toFullCalendarYear(2026),
        },
      },
    );

    assert.equal(yearComparison.baseline.context.calendarYear, 2025);
    assert.equal(yearComparison.alternative.context.calendarYear, 2026);
    assert.ok(yearComparison.deltas.annualJointIncomeTaxDelta < 0);

    assert.throws(
      () =>
        compareHouseholdStatutoryScenarios(
          "Baseline",
          BASELINE_HOUSEHOLD_PROFILE,
          { calendarYear: toFullCalendarYear(2026) },
          {
            label: "Illegal Statutory Override",
            contextOptions: {
              customParameterOverrides: {
                [ParameterId.Benefit_BasisMaximum]: 2400,
              },
            },
          },
        ),
      /fixed by federal statute/i,
    );
  });
});
