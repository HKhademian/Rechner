import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  type IncomeTaxTariffConstants,
  evaluateIncomeTaxTariffFormula,
  evaluateIncomeTaxZoneFormula,
  evaluateProgressionRateTaxFormula,
  evaluateSolidaritySurchargeFormula,
  evaluateSplittingTaxTariffFormula,
  evaluateSwapWithholdingVarianceFormula,
} from "#engine/formulas/pure/incomeTaxFormulas";
import {
  WageTaxZone,
  toEuroAmount,
  toNetSalary,
  toPercentageRate,
} from "#engine/types";

const FIXTURE_2026_TARIFF_CONSTANTS: IncomeTaxTariffConstants = Object.freeze({
  basicAllowance: toEuroAmount(12348),
  progressionZone1Ceiling: toEuroAmount(17799),
  progressionZone2Ceiling: toEuroAmount(69878),
  topRateCeiling: toEuroAmount(277825),
  tariffDivisor: toEuroAmount(10000),
  progressionZone1QuadraticCoefficient: 914.51,
  progressionZone1LinearCoefficient: 1400,
  progressionZone2QuadraticCoefficient: 173.1,
  progressionZone2LinearCoefficient: 2397,
  progressionZone2ConstantOffset: toEuroAmount(1034.87),
  topMarginalRate: toPercentageRate(0.42),
  topMarginalOffset: toEuroAmount(11135.63),
  highestMarginalRate: toPercentageRate(0.45),
  highestMarginalOffset: toEuroAmount(19470.38),
});

describe("Tier 1 Pure Income Tax Formulas (context-unaware)", () => {
  it("evaluates § 32a tariff zones and progressive amounts deterministically from explicit constants", () => {
    assert.equal(
      evaluateIncomeTaxZoneFormula({
        ...FIXTURE_2026_TARIFF_CONSTANTS,
        annualTaxableIncome: 12348,
      }),
      WageTaxZone.Zone1Null,
    );
    assert.equal(
      evaluateIncomeTaxZoneFormula({
        ...FIXTURE_2026_TARIFF_CONSTANTS,
        annualTaxableIncome: 15000,
      }),
      WageTaxZone.Zone2Progression1,
    );
    assert.equal(
      evaluateIncomeTaxZoneFormula({
        ...FIXTURE_2026_TARIFF_CONSTANTS,
        annualTaxableIncome: 40000,
      }),
      WageTaxZone.Zone3Progression2,
    );
    assert.equal(
      evaluateIncomeTaxZoneFormula({
        ...FIXTURE_2026_TARIFF_CONSTANTS,
        annualTaxableIncome: 100000,
      }),
      WageTaxZone.Zone4Proportional42,
    );
    assert.equal(
      evaluateIncomeTaxZoneFormula({
        ...FIXTURE_2026_TARIFF_CONSTANTS,
        annualTaxableIncome: 300000,
      }),
      WageTaxZone.Zone5Reichensteuer45,
    );

    assert.equal(
      evaluateIncomeTaxTariffFormula({
        ...FIXTURE_2026_TARIFF_CONSTANTS,
        annualTaxableIncome: 12348,
      }),
      0,
    );
    assert.equal(
      evaluateIncomeTaxTariffFormula({
        ...FIXTURE_2026_TARIFF_CONSTANTS,
        annualTaxableIncome: 25000,
      }),
      2850,
    );
    assert.throws(
      () =>
        evaluateIncomeTaxTariffFormula({
          ...FIXTURE_2026_TARIFF_CONSTANTS,
          annualTaxableIncome: Number.NaN,
        }),
      TypeError,
    );
  });

  it("evaluates custom hypothetical constants independently without reading global registries", () => {
    const customTariff: IncomeTaxTariffConstants = {
      basicAllowance: toEuroAmount(20000),
      progressionZone1Ceiling: toEuroAmount(30000),
      progressionZone2Ceiling: toEuroAmount(50000),
      topRateCeiling: toEuroAmount(100000),
      tariffDivisor: toEuroAmount(10000),
      progressionZone1QuadraticCoefficient: 0,
      progressionZone1LinearCoefficient: 1000,
      progressionZone2QuadraticCoefficient: 0,
      progressionZone2LinearCoefficient: 2000,
      progressionZone2ConstantOffset: toEuroAmount(1000),
      topMarginalRate: toPercentageRate(0.35),
      topMarginalOffset: toEuroAmount(5000),
      highestMarginalRate: toPercentageRate(0.5),
      highestMarginalOffset: toEuroAmount(20000),
    };

    assert.equal(
      evaluateIncomeTaxTariffFormula({
        ...customTariff,
        annualTaxableIncome: 20000,
      }),
      0,
    );
    assert.equal(
      evaluateIncomeTaxTariffFormula({
        ...customTariff,
        annualTaxableIncome: 25000,
      }),
      500,
    );
    assert.equal(
      evaluateIncomeTaxTariffFormula({
        ...customTariff,
        annualTaxableIncome: 80000,
      }),
      23000,
    );
  });

  it("evaluates spousal splitting and § 32b progression-clause tax identically to statutory reference math", () => {
    const splitTax = evaluateSplittingTaxTariffFormula({
      ...FIXTURE_2026_TARIFF_CONSTANTS,
      primarySpouseTaxableIncome: 50000,
      secondarySpouseTaxableIncome: 0,
    });
    assert.equal(splitTax, 5700);

    const progressionResult = evaluateProgressionRateTaxFormula({
      ...FIXTURE_2026_TARIFF_CONSTANTS,
      taxableIncome: toEuroAmount(40000),
      progressionIncome: toEuroAmount(10000),
      ratePrecisionDecimalPlaces: 4,
    });
    assert.equal(progressionResult.hypotheticalTax, 5700);
    assert.equal(progressionResult.specialRate, 0.114);
    assert.equal(progressionResult.incomeTax, 4560);
  });

  it("evaluates SolzG § 4 exemption, mitigation zone, and class III/V withholding swap variance", () => {
    assert.equal(
      evaluateSolidaritySurchargeFormula({
        annualIncomeTax: toEuroAmount(18130),
        singleAssessmentExemptionThreshold: toEuroAmount(18130),
        isJointAssessment: false,
        solidarityRate: toPercentageRate(0.055),
        mitigationZoneRate: toPercentageRate(0.119),
      }),
      0,
    );

    // Mitigation zone: min(20000 * 0.055 = 1100, (20000 - 18130) * 0.119 = 222.53) -> 222.53
    assert.equal(
      evaluateSolidaritySurchargeFormula({
        annualIncomeTax: toEuroAmount(20000),
        singleAssessmentExemptionThreshold: toEuroAmount(18130),
        isJointAssessment: false,
        solidarityRate: toPercentageRate(0.055),
        mitigationZoneRate: toPercentageRate(0.119),
      }),
      222.53,
    );

    assert.equal(
      evaluateSwapWithholdingVarianceFormula({
        primaryClass3MonthlyNet: toNetSalary(4200),
        primaryClass5MonthlyNet: toNetSalary(3100),
        secondaryClass3MonthlyNet: toNetSalary(2800),
        secondaryClass5MonthlyNet: toNetSalary(2100),
      }),
      400,
    );
  });
});
