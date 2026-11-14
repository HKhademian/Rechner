import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  computeMonthlyMutterschutz,
} from "#engine/benefits/mutterschutz";
import {
  computeElterngeldBenefits,
} from "#engine/benefits/elterngeldPlus";
import {
  computeHouseholdSiblingBonus,
} from "#engine/benefits/siblingBonus";
import {
  createStatutoryCalculationContext,
} from "#engine/formulas/context/statutoryContext";
import {
  STATUTORY_FORMULA_DESCRIPTORS,
  evaluateAnnualIncomeTaxInContext,
  evaluateBenefitTransitionContributionBaseInContext,
  evaluateChildAllowanceFavorabilityInContext,
  evaluateIncomeTaxZoneInContext,
  evaluateJointProgressionTaxInContext,
  evaluateJointSplittingTaxInContext,
  evaluateMaternityProtectionInContext,
  evaluateParentalBenefitEntitlementInContext,
  evaluateParentalReplacementRateInContext,
  evaluatePartnershipBonusHoursInContext,
  evaluateSiblingBonusInContext,
  evaluateSocialContributionsInContext,
  evaluateSolidaritySurchargeInContext,
  evaluateTransitionZoneBasesInContext,
  evaluateTransitionZoneFactorInContext,
} from "#engine/formulas/context/statutoryEvaluators";
import {
  CalculationTier,
  FormulaId,
} from "#engine/formulas/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  computeKinderfreibetragGuenstigerpruefung,
} from "#engine/tax/jointAssessment";
import {
  computeJointProgressionTax,
} from "#engine/tax/progressionTax";
import {
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  computeAnnualIncomeTax,
  computeSolidaritySurcharge,
} from "#engine/tax/wageTax";
import {
  WageTaxZone,
  toCalendarMonth,
  toChildIndex,
  toEuroAmount,
  toFullCalendarYear,
  toGrossSalary,
  toNetSalary,
  toSimulationMonth,
  toWorkingHours,
} from "#engine/types";

describe("Tier 2 Context-Aware Statutory Evaluators", () => {
  it("resolves year-indexed income tax tariffs identically to existing tax engine for 2025 and 2026", () => {
    for (const rawYear of [2025, 2026]) {
      const year = toFullCalendarYear(rawYear);
      const context = createStatutoryCalculationContext({ calendarYear: year });
      const rules = createTaxRules(year);

      const zoneResult = evaluateIncomeTaxZoneInContext(
        { annualTaxableIncome: 55000 },
        context,
      );
      assert.equal(zoneResult.value, WageTaxZone.Zone3Progression2);
      assert.equal(zoneResult.audit.tier, CalculationTier.ContextAwareStatutoryEvaluator);
      assert.equal(zoneResult.audit.calendarYear, year);
      assert.equal(zoneResult.audit.governingLawIds.includes(LawId.EStG_32a), true);

      const annualTax = evaluateAnnualIncomeTaxInContext(
        { annualTaxableIncome: 55000 },
        context,
      );
      assert.equal(annualTax.value, computeAnnualIncomeTax(55000, rules));

      const splittingTax = evaluateJointSplittingTaxInContext(
        {
          primarySpouseTaxableIncome: 70000,
          secondarySpouseTaxableIncome: 30000,
        },
        context,
      );
      assert.equal(splittingTax.value, computeAnnualIncomeTax(50000, rules) * 2);

      const progression = evaluateJointProgressionTaxInContext(
        {
          taxableIncome: toEuroAmount(80000),
          progressionIncome: toEuroAmount(12000),
        },
        context,
      );
      const expectedProgression = computeJointProgressionTax(
        toEuroAmount(80000),
        toEuroAmount(12000),
        rules,
      );
      assert.equal(progression.value.incomeTax, expectedProgression.incomeTax);
      assert.equal(progression.value.specialRate, expectedProgression.specialRate);

      const solz = evaluateSolidaritySurchargeInContext(
        {
          annualIncomeTax: toEuroAmount(45000),
          isJointAssessment: true,
        },
        context,
      );
      assert.equal(solz.value, computeSolidaritySurcharge(toEuroAmount(45000), true, rules));
    }
  });

  it("propagates validated customizable overrides (insurer health supplement) into social contribution outputs and audit", () => {
    const baselineContext = createStatutoryCalculationContext({
      calendarYear: toFullCalendarYear(2026),
    });
    const higherInsurerContext = createStatutoryCalculationContext({
      calendarYear: toFullCalendarYear(2026),
      customParameterOverrides: {
        [ParameterId.Tax_HealthSupplementTotalRate]: 0.036,
      },
    });

    const baseContributions = evaluateSocialContributionsInContext(
      {
        actualMonthlyGross: toGrossSalary(4500),
        expectedMonthlyGross: toGrossSalary(4500),
        appliesSaxonyRate: false,
        appliesChildlessSurcharge: false,
        qualifyingDiscountChildCount: 1,
      },
      baselineContext,
    );
    const higherContributions = evaluateSocialContributionsInContext(
      {
        actualMonthlyGross: toGrossSalary(4500),
        expectedMonthlyGross: toGrossSalary(4500),
        appliesSaxonyRate: false,
        appliesChildlessSurcharge: false,
        qualifyingDiscountChildCount: 1,
      },
      higherInsurerContext,
    );

    assert.equal(baseContributions.audit.customOverrideApplied, false);
    assert.equal(higherContributions.audit.customOverrideApplied, true);
    assert.ok(
      higherContributions.value.healthInsuranceContribution >
        baseContributions.value.healthInsuranceContribution,
    );
    assert.equal(higherContributions.audit.governingLawIds.includes(LawId.SGB5_241), true);
    assert.equal(higherContributions.audit.governingLawIds.includes(LawId.BVV_2), true);

    const transitionFactor = evaluateTransitionZoneFactorInContext(baselineContext);
    assert.ok(transitionFactor.value > 0 && transitionFactor.value < 1);

    const midijobBases = evaluateTransitionZoneBasesInContext(
      {
        actualMonthlyGross: toGrossSalary(1200),
        expectedMonthlyGross: toGrossSalary(1200),
      },
      baselineContext,
    );
    assert.equal(midijobBases.value.isReducedTransitionZone, true);
    assert.ok(midijobBases.value.employeeAssessmentBase < 1200);

    const benefitTransitionBase = evaluateBenefitTransitionContributionBaseInContext(
      { monthlyGross: toGrossSalary(1200) },
      baselineContext,
    );
    assert.ok(benefitTransitionBase.value > 0 && benefitTransitionBase.value < 1200);
  });

  it("matches existing BEEG, MuSchG, and § 31 EStG engines and populates every formula descriptor", () => {
    const context = createStatutoryCalculationContext({
      calendarYear: toFullCalendarYear(2026),
    });

    const rate = evaluateParentalReplacementRateInContext(
      { preBirthMonthlyNet: toNetSalary(1100) },
      context,
    );
    assert.equal(rate.value, 0.67);

    const partnershipEligible = evaluatePartnershipBonusHoursInContext(
      {
        primaryParentWeeklyHours: toWorkingHours(28),
        secondaryParentWeeklyHours: toWorkingHours(30),
      },
      context,
    );
    assert.equal(partnershipEligible.value, true);

    const entitlement = evaluateParentalBenefitEntitlementInContext(
      {
        preBirthMonthlyNet: toNetSalary(2800),
        partTimeMonthlyNet: toNetSalary(900),
        weeklyWorkingHours: toWorkingHours(20),
      },
      context,
    );
    const legacyEntitlement = computeElterngeldBenefits(
      toNetSalary(2800),
      toNetSalary(900),
      toWorkingHours(20),
    );
    assert.equal(entitlement.value.basiselterngeld, legacyEntitlement.basiselterngeld);
    assert.equal(entitlement.value.elterngeldPlus, legacyEntitlement.elterngeldPlus);

    const siblingBonus = evaluateSiblingBonusInContext(
      {
        baseElterngeldPlus: entitlement.value.elterngeldPlus,
        siblingAgesInMonths: [24],
      },
      context,
    );
    const legacySibling = computeHouseholdSiblingBonus(
      legacyEntitlement.elterngeldPlus,
      [toSimulationMonth(1)],
      toSimulationMonth(25),
    );
    assert.equal(siblingBonus.value.siblingBonusAmount, legacySibling.siblingBonusAmount);

    const maternity = evaluateMaternityProtectionInContext(
      { preBirthMonthlyNet: toNetSalary(2600) },
      context,
    );
    const legacyMaternity = computeMonthlyMutterschutz(toNetSalary(2600));
    assert.equal(maternity.value.healthInsuranceShare, legacyMaternity.healthInsuranceShare);
    assert.equal(maternity.value.employerSupplement, legacyMaternity.employerSupplement);

    const favorability = evaluateChildAllowanceFavorabilityInContext(
      {
        jointAnnualTaxableIncome: toEuroAmount(160000),
        annualProgressionIncome: toEuroAmount(7200),
        qualifyingChildMonthsCount: 12,
      },
      context,
    );
    const legacyFavorability = computeKinderfreibetragGuenstigerpruefung(
      160000,
      [
        {
          childIndex: toChildIndex(1),
          birthCalendarYear: toFullCalendarYear(2025),
          birthCalendarMonth: toCalendarMonth(1),
        },
      ],
      2026,
      undefined,
      toEuroAmount(7200),
    );
    assert.equal(favorability.value.extraTaxRefund, legacyFavorability.extraTaxRefund);
    assert.equal(favorability.value.isKinderfreibetragFavorable, legacyFavorability.isKinderfreibetragFavorable);

    for (const formulaId of Object.values(FormulaId)) {
      const descriptor = STATUTORY_FORMULA_DESCRIPTORS[formulaId];
      assert.equal(descriptor.id, formulaId);
      assert.ok(descriptor.governingLawIds.length > 0);
    }
  });
});
