import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  type IncomeTaxTariffConstants,
  evaluateIncomeTaxTariffFormula,
} from "#engine/formulas/pure/incomeTaxFormulas";
import {
  evaluateCompoundedWageGrowthFormula,
  evaluateIndexedTaxBracketsFormula,
  evaluatePurchasingPowerDiscountFormula,
} from "#engine/formulas/pure/inflationFormulas";
import {
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";

const BASE_TARIFF_2025: IncomeTaxTariffConstants = {
  basicAllowance: toEuroAmount(12096),
  progressionZone1Ceiling: toEuroAmount(17443),
  progressionZone2Ceiling: toEuroAmount(68480),
  topRateCeiling: toEuroAmount(277825),
  tariffDivisor: toEuroAmount(10000),
  progressionZone1QuadraticCoefficient: 932.3,
  progressionZone1LinearCoefficient: 1400,
  progressionZone2QuadraticCoefficient: 176.64,
  progressionZone2LinearCoefficient: 2397,
  progressionZone2ConstantOffset: toEuroAmount(1015.13),
  topMarginalRate: toPercentageRate(0.42),
  topMarginalOffset: toEuroAmount(10911.92),
  highestMarginalRate: toPercentageRate(0.45),
  highestMarginalOffset: toEuroAmount(19246.67),
};

describe("Tier 1 Pure Inflation, Wage Growth & Bracket Indexing Formulas", () => {
  it("discounts positive and negative nominal cash flows cleanly into real purchasing power", () => {
    const month1 = evaluatePurchasingPowerDiscountFormula({
      nominalAmount: toEuroAmount(5000),
      annualInflationRate: toPercentageRate(0.02),
      elapsedMonths: 0,
    });
    assert.equal(month1.purchasingPowerFactor, 1);
    assert.equal(month1.realAmount, 5000);

    const month13 = evaluatePurchasingPowerDiscountFormula({
      nominalAmount: toEuroAmount(1020),
      annualInflationRate: toPercentageRate(0.02),
      elapsedMonths: 12,
    });
    assert.ok(Math.abs(month13.purchasingPowerFactor - 1 / 1.02) < 1e-12);
    assert.equal(month13.realAmount, 1000);

    const outflow = evaluatePurchasingPowerDiscountFormula({
      nominalAmount: toEuroAmount(-510),
      annualInflationRate: toPercentageRate(0.02),
      elapsedMonths: 12,
    });
    assert.equal(outflow.realAmount, -500);
  });

  it("compounds annual nominal wage growth monotonically", () => {
    assert.equal(
      evaluateCompoundedWageGrowthFormula({
        baseAmount: toEuroAmount(4000),
        annualGrowthRate: toPercentageRate(0),
        yearsElapsed: 3,
      }),
      4000,
    );
    assert.equal(
      evaluateCompoundedWageGrowthFormula({
        baseAmount: toEuroAmount(4000),
        annualGrowthRate: toPercentageRate(0.03),
        yearsElapsed: 2,
      }),
      4243.6,
    );
  });

  it("indexes § 32a EStG brackets without discontinuities at zone boundaries", () => {
    const unchanged = evaluateIndexedTaxBracketsFormula({
      baseTariff: BASE_TARIFF_2025,
      annualIndexRate: toPercentageRate(0),
      yearsElapsed: 2,
    });
    assert.deepEqual(unchanged, BASE_TARIFF_2025);

    const indexed = evaluateIndexedTaxBracketsFormula({
      baseTariff: BASE_TARIFF_2025,
      annualIndexRate: toPercentageRate(0.03),
      yearsElapsed: 2,
    });
    assert.ok(indexed.basicAllowance > BASE_TARIFF_2025.basicAllowance);
    assert.ok(indexed.progressionZone2Ceiling > BASE_TARIFF_2025.progressionZone2Ceiling);

    // Continuity at Zone 1->2, Zone 2->3, Zone 3->4, and Zone 4->5 boundaries
    for (const boundary of [
      indexed.basicAllowance,
      indexed.progressionZone1Ceiling,
      indexed.progressionZone2Ceiling,
      indexed.topRateCeiling,
    ]) {
      const taxAtBoundary = evaluateIncomeTaxTariffFormula({
        ...indexed,
        annualTaxableIncome: boundary,
      });
      const taxJustAbove = evaluateIncomeTaxTariffFormula({
        ...indexed,
        annualTaxableIncome: boundary + 1,
      });
      assert.ok(
        taxJustAbove >= taxAtBoundary && taxJustAbove - taxAtBoundary <= 1,
        `Continuity broken around boundary ${boundary}: ${taxAtBoundary} -> ${taxJustAbove}`,
      );
    }

    // Neutralizes bracket creep on an inflation-adjusted salary
    const baseSalary = 60000;
    const baseTax = evaluateIncomeTaxTariffFormula({
      ...BASE_TARIFF_2025,
      annualTaxableIncome: baseSalary,
    });
    const indexedSalary = baseSalary * (1.03 ** 2);
    const indexedTax = evaluateIncomeTaxTariffFormula({
      ...indexed,
      annualTaxableIncome: indexedSalary,
    });
    const baseAvgRate = baseTax / baseSalary;
    const indexedAvgRate = indexedTax / indexedSalary;
    assert.ok(Math.abs(indexedAvgRate - baseAvgRate) < 0.001);
  });
});
