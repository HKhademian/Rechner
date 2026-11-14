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
  FederalStateKitaPresetId,
  toEuroAmount,
  toFullCalendarYear,
} from "#engine/types";

describe("Municipal Daycare & § 10 Abs. 1 Nr. 5 EStG Childcare Module", () => {
  it("exposes illustrative presets and returns 0 when childcare plan is disabled", () => {
    const presets = getAllMunicipalDaycarePresets();
    assert.equal(presets.length, 5);
    assert.equal(presets.every((preset) => preset.isIllustrativeReferenceModel), true);

    const disabled = createDefaultChildcarePlanConfig();
    const res = computeMonthlyChildcarePlanCosts(disabled, toEuroAmount(95000), [
      { childKey: "child-1",
        ageMonths: 24 },
    ]);
    assert.equal(res.totalMonthlyFee, 0);
    assert.equal(res.perChildFees.length, 0);
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
