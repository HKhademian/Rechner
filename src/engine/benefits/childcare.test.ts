import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  computeAnnualChildcareTaxDeduction,
  computeMonthlyChildcarePlanCosts,
  createDefaultChildcarePlanConfig,
  getAllMunicipalDaycarePresets,
  getMunicipalDaycarePreset,
  resolveChildcareTaxRulesForYear,
} from "#engine/benefits/childcare";
import {
  DaycareBookingHoursTier,
  FederalStateKitaPresetId,
  toEuroAmount,
  toFullCalendarYear,
} from "#engine/types";

describe("Municipal Daycare & § 10 Abs. 1 Nr. 5 EStG Childcare Module", () => {
  it("exposes presets (defaulting to Munich S580) and returns 0 when childcare plan is disabled", () => {
    const presets = getAllMunicipalDaycarePresets();
    assert.equal(presets.length, 5);
    assert.equal(presets.every((preset) => preset.isIllustrativeReferenceModel), true);

    const disabled = createDefaultChildcarePlanConfig();
    assert.equal(disabled.presetId, FederalStateKitaPresetId.BavariaMunich);
    const res = computeMonthlyChildcarePlanCosts(disabled, toEuroAmount(95000), [
      { childKey: "child-1",
        ageMonths: 24 },
    ]);
    assert.equal(res.totalMonthlyFee, 0);
    assert.equal(res.totalMonthlyCareFee, 0);
    assert.equal(res.totalMonthlyMealFee, 0);
    assert.equal(res.perChildFees.length, 0);
  });

  it("evaluates official Munich S580 Krippe (0–3) income brackets, booking-hour tiers, Kindergarten (3–6) fee exemption, sibling step-down, and €105 Verpflegungsgeld", () => {
    const munich = getMunicipalDaycarePreset(FederalStateKitaPresetId.BavariaMunich);
    assert.equal(munich.federalState, "Bayern");
    assert.equal(munich.siblingStepDownBrackets, 1);
    assert.equal(munich.feeFreeFromAgeMonths, 36);
    assert.equal(munich.defaultMonthlyMealFee, 105);
    assert.ok(munich.bookingHourTiers);

    const basePlan = {
      ...createDefaultChildcarePlanConfig(),
      enabled: true,
      presetId: FederalStateKitaPresetId.BavariaMunich,
    };

    // Official Anlage 1 S580 Krippe brackets at default 8–9h tier
    const krippeChild = [{ childKey: "child-1",
      ageMonths: 18 }];
    assert.equal(computeMonthlyChildcarePlanCosts(basePlan, toEuroAmount(50000), krippeChild).totalMonthlyCareFee, 0);
    assert.equal(computeMonthlyChildcarePlanCosts(basePlan, toEuroAmount(60000), krippeChild).totalMonthlyCareFee, 100);
    assert.equal(computeMonthlyChildcarePlanCosts(basePlan, toEuroAmount(70000), krippeChild).totalMonthlyCareFee, 190);
    assert.equal(computeMonthlyChildcarePlanCosts(basePlan, toEuroAmount(80000), krippeChild).totalMonthlyCareFee, 215);
    assert.equal(computeMonthlyChildcarePlanCosts(basePlan, toEuroAmount(120000), krippeChild).totalMonthlyCareFee, 230);

    // Booking-hour tiers: 3–4h (>80k -> €145) and >9h (>80k -> €250)
    const shortTier = computeMonthlyChildcarePlanCosts(
      { ...basePlan,
        bookingHoursTier: DaycareBookingHoursTier.H3_4 },
      toEuroAmount(120000),
      krippeChild,
    );
    assert.equal(shortTier.totalMonthlyCareFee, 145);

    const longTier = computeMonthlyChildcarePlanCosts(
      { ...basePlan,
        bookingHoursTier: DaycareBookingHoursTier.Over9 },
      toEuroAmount(120000),
      krippeChild,
    );
    assert.equal(longTier.totalMonthlyCareFee, 250);

    // Kindergarten (age >= 36mo): €0 net core care fee after €100 BayKiBiG subsidy,
    // while optional €105 Verpflegungsgeld still applies as non-deductible meal outflow
    const kitaWithMeals = computeMonthlyChildcarePlanCosts(
      { ...basePlan,
        includeMealFees: true },
      toEuroAmount(120000),
      [{ childKey: "child-1",
        ageMonths: 40 }],
    );
    assert.equal(kitaWithMeals.perChildFees[0].isFeeFreeByAge, true);
    assert.equal(kitaWithMeals.totalMonthlyCareFee, 0);
    assert.equal(kitaWithMeals.totalMonthlyMealFee, 105);
    assert.equal(kitaWithMeals.totalMonthlyFee, 105);

    // § 7 Abs. 3 S580 Geschwisterermäßigung:
    // Child 1 (age 40mo, Kindergarten -> €0), Child 2 (age 18mo, Krippe rank 2 -> drops 1 bracket: €230 -> €215),
    // Child 3 (age 12mo, Krippe rank 3 -> €0) + €105/mo meal fee per child when enabled
    const threeSiblings = computeMonthlyChildcarePlanCosts(
      { ...basePlan,
        includeMealFees: true },
      toEuroAmount(120000),
      [
        { childKey: "child-1",
          ageMonths: 40 },
        { childKey: "child-2",
          ageMonths: 18 },
        { childKey: "child-3",
          ageMonths: 12 },
      ],
    );
    assert.equal(threeSiblings.perChildFees[0].netMonthlyFee, 0);
    assert.equal(threeSiblings.perChildFees[1].siblingCareRank, 2);
    assert.equal(threeSiblings.perChildFees[1].netMonthlyFee, 215);
    assert.equal(threeSiblings.perChildFees[2].siblingCareRank, 3);
    assert.equal(threeSiblings.perChildFees[2].netMonthlyFee, 0);
    assert.equal(threeSiblings.totalMonthlyCareFee, 215);
    assert.equal(threeSiblings.totalMonthlyMealFee, 315);
    assert.equal(threeSiblings.totalMonthlyFee, 530);

    // Existing simultaneous sibling count shifts rank cleanly (1 existing sibling -> new child is rank 2)
    const withExistingSibling = computeMonthlyChildcarePlanCosts(
      basePlan,
      toEuroAmount(70000),
      [{ childKey: "child-2",
        ageMonths: 18 }],
      1,
    );
    assert.equal(withExistingSibling.perChildFees[0].siblingCareRank, 2);
    assert.equal(withExistingSibling.totalMonthlyCareFee, 100);
  });

  it("applies municipal brackets, sibling care discounts, and fee-free age ceiling", () => {
    const munich = getMunicipalDaycarePreset(FederalStateKitaPresetId.BavariaMunich);
    assert.equal(munich.federalState, "Bayern");

    const nrwPlan = {
      ...createDefaultChildcarePlanConfig(),
      enabled: true,
      presetId: FederalStateKitaPresetId.NrwDuesseldorf,
      startAgeMonths: 12,
      endAgeMonths: 72,
    };

    // Two children aged 20 months and 40 months -> NRW sibling exemption 100% for rank 2
    const twoKids = computeMonthlyChildcarePlanCosts(nrwPlan, toEuroAmount(90000), [
      { childKey: "child-2",
        ageMonths: 20 },
      { childKey: "child-1",
        ageMonths: 40 },
    ]);
    assert.equal(twoKids.totalMonthlyFee, 370);
    assert.equal(twoKids.perChildFees[0].childKey, "child-1");
    assert.equal(twoKids.perChildFees[0].netMonthlyFee, 370);
    assert.equal(twoKids.perChildFees[1].siblingCareRank, 2);
    assert.equal(twoKids.perChildFees[1].netMonthlyFee, 0);

    // Older child reaches NRW feeFreeFromAgeMonths (48), younger child still ranks 2 (0 in NRW)
    const olderFeeFree = computeMonthlyChildcarePlanCosts(nrwPlan, toEuroAmount(90000), [
      { childKey: "child-1",
        ageMonths: 48 },
      { childKey: "child-2",
        ageMonths: 20 },
    ]);
    assert.equal(olderFeeFree.perChildFees[0].isFeeFreeByAge, true);
    assert.equal(olderFeeFree.perChildFees[0].netMonthlyFee, 0);
  });

  it("supports flat custom monthly fees per child inside [startAgeMonths, endAgeMonths)", () => {
    const customPlan = {
      ...createDefaultChildcarePlanConfig(),
      enabled: true,
      presetId: FederalStateKitaPresetId.Custom,
      customMonthlyFeePerChild: toEuroAmount(320),
      startAgeMonths: 12,
      endAgeMonths: 60,
    };
    const res = computeMonthlyChildcarePlanCosts(customPlan, toEuroAmount(120000), [
      { childKey: "child-1",
        ageMonths: 30 },
      { childKey: "child-2",
        ageMonths: 18 },
      { childKey: "baby-3",
        ageMonths: 6 },
      { childKey: "school-0",
        ageMonths: 60 },
    ]);
    assert.equal(res.perChildFees.length, 2);
    assert.equal(res.totalMonthlyFee, 640);
  });

  it("transitions § 10 Abs. 1 Nr. 5 EStG deduction rules from 2024 (2/3, 4000) to 2025+ (80%, 4800)", () => {
    const rules2024 = resolveChildcareTaxRulesForYear(toFullCalendarYear(2024));
    assert.equal(rules2024.maxAnnualDeductionPerChild, 4000);
    assert.equal(rules2024.projected, false);

    const rules2025 = resolveChildcareTaxRulesForYear(toFullCalendarYear(2025));
    assert.equal(rules2025.deductibleFraction, 0.8);
    assert.equal(rules2025.maxAnnualDeductionPerChild, 4800);

    const rules2029 = resolveChildcareTaxRulesForYear(toFullCalendarYear(2029));
    assert.equal(rules2029.sourceYear, 2026);
    assert.equal(rules2029.projected, true);

    const deduction2024 = computeAnnualChildcareTaxDeduction(toFullCalendarYear(2024), [
      { annualPaidFee: toEuroAmount(6000),
        childAgeYears: 3 },
    ]);
    assert.equal(deduction2024.deductibleAmount, 4000);

    const deduction2025 = computeAnnualChildcareTaxDeduction(toFullCalendarYear(2025), [
      { annualPaidFee: toEuroAmount(6000),
        childAgeYears: 3 },
    ]);
    assert.equal(deduction2025.deductibleAmount, 4800);
  });
});
