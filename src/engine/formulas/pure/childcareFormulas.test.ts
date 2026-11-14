import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  evaluateChildcareTaxDeductionFormula,
  evaluateMunicipalDaycareFeeFormula,
} from "#engine/formulas/pure/childcareFormulas";
import {
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";

describe("Tier 1 Pure Childcare & Daycare Formulas", () => {
  it("computes § 10 Abs. 1 Nr. 5 EStG childcare deductions for 2024 vs 2025 limits and <14y age gate", () => {
    const result2024 = evaluateChildcareTaxDeductionFormula({
      paidFeesPerChild: [
        { annualPaidFee: toEuroAmount(6000),
          childAgeYears: 3 },
        { annualPaidFee: toEuroAmount(3000),
          childAgeYears: 8 },
        { annualPaidFee: toEuroAmount(2000),
          childAgeYears: 14 }, // >= 14 excluded
      ],
      deductibleFraction: toPercentageRate(2 / 3),
      maxAnnualDeductionPerChild: toEuroAmount(4000),
      maxChildAgeYears: 14,
    });
    assert.equal(result2024.eligibleChildrenCount, 2);
    assert.equal(result2024.totalPaidEligibleFees, 9000);
    assert.equal(result2024.perChildDeductions[0], 4000);
    assert.equal(result2024.perChildDeductions[1], 2000.01);
    assert.equal(result2024.perChildDeductions[2], 0);
    assert.equal(result2024.deductibleAmount, 6000.01);

    const result2025 = evaluateChildcareTaxDeductionFormula({
      paidFeesPerChild: [
        { annualPaidFee: toEuroAmount(6000),
          childAgeYears: 3 },
        { annualPaidFee: toEuroAmount(7000),
          childAgeYears: 1 },
      ],
      deductibleFraction: toPercentageRate(0.8),
      maxAnnualDeductionPerChild: toEuroAmount(4800),
      maxChildAgeYears: 14,
    });
    assert.equal(result2025.eligibleChildrenCount, 2);
    assert.equal(result2025.perChildDeductions[0], 4800);
    assert.equal(result2025.perChildDeductions[1], 4800);
    assert.equal(result2025.deductibleAmount, 9600);
  });

  it("evaluates municipal daycare income brackets, sibling care discounts, and fee-free ages", () => {
    const brackets = [
      { maxAnnualGrossIncome: 50000,
        monthlyFee: 140 },
      { maxAnnualGrossIncome: 90000,
        monthlyFee: 260 },
      { maxAnnualGrossIncome: null,
        monthlyFee: 400 },
    ] as const;

    const child1 = evaluateMunicipalDaycareFeeFormula({
      householdAnnualGrossIncome: toEuroAmount(80000),
      childAgeMonths: 20,
      siblingCareRank: 1,
      feeFreeFromAgeMonths: 36,
      siblingDiscountRateSecondChild: toPercentageRate(0.5),
      siblingDiscountRateThirdPlusChild: toPercentageRate(1),
      incomeBrackets: brackets,
    });
    assert.equal(child1.baseBracketFee, 260);
    assert.equal(child1.discountRateApplied, 0);
    assert.equal(child1.netMonthlyFee, 260);
    assert.equal(child1.isFeeFreeByAge, false);

    const child2 = evaluateMunicipalDaycareFeeFormula({
      householdAnnualGrossIncome: toEuroAmount(80000),
      childAgeMonths: 20,
      siblingCareRank: 2,
      feeFreeFromAgeMonths: 36,
      siblingDiscountRateSecondChild: toPercentageRate(0.5),
      siblingDiscountRateThirdPlusChild: toPercentageRate(1),
      incomeBrackets: brackets,
    });
    assert.equal(child2.discountRateApplied, 0.5);
    assert.equal(child2.netMonthlyFee, 130);

    const child3 = evaluateMunicipalDaycareFeeFormula({
      householdAnnualGrossIncome: toEuroAmount(120000),
      childAgeMonths: 24,
      siblingCareRank: 3,
      feeFreeFromAgeMonths: 36,
      siblingDiscountRateSecondChild: toPercentageRate(0.5),
      siblingDiscountRateThirdPlusChild: toPercentageRate(1),
      incomeBrackets: brackets,
    });
    assert.equal(child3.baseBracketFee, 400);
    assert.equal(child3.netMonthlyFee, 0);

    const freeOlderChild = evaluateMunicipalDaycareFeeFormula({
      householdAnnualGrossIncome: toEuroAmount(120000),
      childAgeMonths: 36,
      siblingCareRank: 1,
      feeFreeFromAgeMonths: 36,
      siblingDiscountRateSecondChild: toPercentageRate(0.5),
      siblingDiscountRateThirdPlusChild: toPercentageRate(1),
      incomeBrackets: brackets,
    });
    assert.equal(freeOlderChild.isFeeFreeByAge, true);
    assert.equal(freeOlderChild.netMonthlyFee, 0);
  });
});
