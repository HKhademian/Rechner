import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";
import {
  evaluateDeductibleExpensesFormula,
} from "#engine/formulas/pure/deductibleExpensesFormula";

describe("evaluateDeductibleExpensesFormula", () => {
  it("applies only Werbungskosten strictly above the combined § 9a lump-sum threshold", () => {
    const underThreshold = evaluateDeductibleExpensesFormula({
      werbungskostenAnnual: toEuroAmount(2000),
      employedPartnersCount: 2,
      sonderausgabenAnnual: toEuroAmount(0),
      householdServicesLaborAnnual: toEuroAmount(0),
      craftsmenLaborAnnual: toEuroAmount(0),
      marginalTaxRate: toPercentageRate(0.35),
    });
    assert.equal(underThreshold.combinedLumpSumThreshold, 2460);
    assert.equal(underThreshold.excessWerbungskosten, 0);
    assert.equal(underThreshold.totalEstimatedAnnualTaxRefund, 0);

    const overThreshold = evaluateDeductibleExpensesFormula({
      werbungskostenAnnual: toEuroAmount(4460),
      employedPartnersCount: 2,
      sonderausgabenAnnual: toEuroAmount(1000),
      householdServicesLaborAnnual: toEuroAmount(0),
      craftsmenLaborAnnual: toEuroAmount(0),
      marginalTaxRate: toPercentageRate(0.35),
    });
    assert.equal(overThreshold.excessWerbungskosten, 2000);
    assert.equal(overThreshold.totalTaxBaseDeduction, 3000);
    assert.equal(overThreshold.estimatedDeductionTaxSavings, 1050);
    assert.equal(overThreshold.totalEstimatedAnnualTaxRefund, 1050);
  });

  it("caps § 35a household services and craftsmen direct credits at statutory ceilings", () => {
    const result = evaluateDeductibleExpensesFormula({
      werbungskostenAnnual: toEuroAmount(0),
      sonderausgabenAnnual: toEuroAmount(500),
      householdServicesLaborAnnual: toEuroAmount(30000),
      craftsmenLaborAnnual: toEuroAmount(10000),
      marginalTaxRate: toPercentageRate(0.3),
    });
    assert.equal(result.credit35aHousehold, 4000);
    assert.equal(result.credit35aCraftsmen, 1200);
    assert.equal(result.totalDirectTaxCredits, 5200);
    assert.equal(result.estimatedDeductionTaxSavings, 150);
    assert.equal(result.totalEstimatedAnnualTaxRefund, 5350);
  });
});
