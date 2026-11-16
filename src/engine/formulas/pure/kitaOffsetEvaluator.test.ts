import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  evaluateKitaFeeAndTaxOffset,
} from "#engine/formulas/pure/kitaOffsetEvaluator";
import {
  FederalStateKitaPresetId,
  toEuroAmount,
  toFullCalendarYear,
  toGrossSalary,
} from "#engine/types";

describe("Kita Fee & § 10 Abs. 1 Nr. 5 EStG Tax Offset Evaluator", () => {
  it("applies 2/3 up to €4,000 in 2024 vs 80% up to €4,800 from 2025 onward under JStG 2024", () => {
    const baseInputs = {
      presetId: FederalStateKitaPresetId.Custom,
      customMonthlyCareFeePerChildEur: toEuroAmount(550),
      monthlyMealFeePerChildEur: toEuroAmount(80),
      childAgesMonths: [24],
      careMonthsPerYear: 12,
      householdAnnualGrossEur: toGrossSalary(110000),
      householdTaxableIncomeZvEEur: toEuroAmount(92000),
      isMarriedJointAssessment: true,
      hasChurchTax: false,
      isBavariaOrBadenWuerttemberg: false,
    } as const;

    const result2024 = evaluateKitaFeeAndTaxOffset({
      ...baseInputs,
      calendarYear: toFullCalendarYear(2024),
    });
    const result2026 = evaluateKitaFeeAndTaxOffset({
      ...baseInputs,
      calendarYear: toFullCalendarYear(2026),
    });

    // 12 * €550 = €6,600 care fee (plus €960 meals excluded from § 10 EStG)
    assert.equal(result2024.annualCareFeeTotalEur, 6600);
    assert.equal(result2024.annualMealFeeTotalEur, 960);
    assert.equal(result2024.annualGrossOutflowEur, 7560);
    // 2024: 2/3 of 6,600 = 4,400 -> capped at €4,000
    assert.equal(result2024.annualDeductibleSonderausgabenEur, 4000);

    // 2026: 80% of 6,600 = 5,280 -> capped at €4,800
    assert.equal(result2026.annualDeductibleSonderausgabenEur, 4800);
    assert.ok(result2026.annualTaxSavingsEur > result2024.annualTaxSavingsEur);
    assert.ok(result2026.netMonthlyHouseholdCostEur < result2026.monthlyGrossOutflowEur);
  });

  it("keeps Verpflegungsgeld (meals) non-deductible and evaluates municipal sibling discounts", () => {
    const result = evaluateKitaFeeAndTaxOffset({
      calendarYear: toFullCalendarYear(2026),
      presetId: FederalStateKitaPresetId.NrwDuesseldorf,
      customMonthlyCareFeePerChildEur: toEuroAmount(300),
      monthlyMealFeePerChildEur: toEuroAmount(95),
      childAgesMonths: [20, 42], // second child receives 100% NRW sibling exemption while first (<48m) pays €370
      careMonthsPerYear: 12,
      householdAnnualGrossEur: toGrossSalary(95000),
      householdTaxableIncomeZvEEur: toEuroAmount(80000),
      isMarriedJointAssessment: true,
      hasChurchTax: true,
      isBavariaOrBadenWuerttemberg: false,
    });

    assert.equal(result.childrenCount, 2);
    // Child 1 pays €370, Child 2 gets 100% sibling discount -> €370 total care + 2*€95 meals
    assert.equal(result.monthlyCareFeeTotalEur, 370);
    assert.equal(result.monthlyMealFeeTotalEur, 190);
    assert.equal(result.monthlyGrossOutflowEur, 560);
    // Care fee alone = 370 * 12 = 4,440; 80% = 3,552 (unchanged by €190*12 = €2,280 meal fee)
    assert.equal(result.annualDeductibleSonderausgabenEur, 3552);
    assert.ok(result.annualTaxSavingsEur > 0);
  });

  it("returns zero tax savings when taxable income is below the basic tax-free allowance", () => {
    const lowIncome = evaluateKitaFeeAndTaxOffset({
      calendarYear: toFullCalendarYear(2026),
      presetId: FederalStateKitaPresetId.Custom,
      customMonthlyCareFeePerChildEur: toEuroAmount(200),
      monthlyMealFeePerChildEur: toEuroAmount(0),
      childAgesMonths: [30],
      careMonthsPerYear: 12,
      householdAnnualGrossEur: toGrossSalary(18000),
      householdTaxableIncomeZvEEur: toEuroAmount(9000),
      isMarriedJointAssessment: false,
      hasChurchTax: false,
      isBavariaOrBadenWuerttemberg: false,
    });

    assert.equal(lowIncome.annualDeductibleSonderausgabenEur, 1920);
    assert.equal(lowIncome.annualTaxSavingsEur, 0);
    assert.equal(lowIncome.netMonthlyHouseholdCostEur, 200);
  });
});
