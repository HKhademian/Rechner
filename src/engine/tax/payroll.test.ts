import {
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";
import vectors from "../../../test/fixture/payroll2026.json" with { type: "json" };
import {
  calculatePayrollWithholding,
  payrollInputs,
  toChildAllowanceFactor,
  annualWithholdingTaxBase,
} from "#engine/tax/payroll";
import {
  computeGrossToNetBreakdown,
  computeMonthlySocialSecurity,
  computeTaxFactor,
} from "#engine/tax/wageTax";
import {
  toGrossSalary,
  toChildrenCount,
  toPercentageRate,
  toTaxFactor,
  toMonthDuration,
  toFullCalendarYear,
  TaxClass,
} from "#engine/types";
import {
  createTaxRules,
  toAgeYears,
} from "#engine/tax/taxRules";

describe("Offline PAP against independent BMF API responses", () => {
  for (const vector of vectors) {
    it(vector.name, () => {
      assert.equal(new URL(vector.source).hostname, "www.bmf-steuerrechner.de");
      const result = calculatePayrollWithholding(vector.inputs);
      for (const [field, expected] of Object.entries(vector.outputs)) {
        assert.equal(result[field as keyof typeof result], expected, `${vector.name}: ${field}`);
      }
    });
  }

  // BMF's published 2025/2026 annual comparison table, with PAP default deduction markers.
  // Source: https://www.bundesfinanzministerium.de/Content/DE/Standardartikel/Themen/Steuern/das-aendert-sich-2026.html
  for (const [year, gross, tax] of [[2025, 30000, 2480], [2025, 60000, 9945], [2025, 90000, 20395], [2026, 30000, 2406], [2026, 60000, 9809], [2026, 90000, 20039]]) {
    it(`matches the published ${year} annual withholding comparison at ${gross}`, () => {
      const result = calculatePayrollWithholding({ LZZ: 1,
        RE4: gross * 100,
        STKL: 1 }, createTaxRules(toFullCalendarYear(year)));
      assert.equal(result.LSTLZZ, tax * 100);
    });
  }
});

describe("Payroll domain adapter and actual deductions", () => {
  it("maps domain values to the official factor and Saxony reference inputs", () => {
    const inputs = payrollInputs(toGrossSalary(5000), TaxClass.IV, toChildrenCount(0), undefined, {}, toTaxFactor(0.83));
    const actual = calculatePayrollWithholding(inputs);
    assert.equal(actual.LSTLZZ, 64933);
    const saxony = computeGrossToNetBreakdown(toGrossSalary(6500), TaxClass.IV, 2, undefined, undefined, undefined, { saxony: true,
      childAllowanceFactor: toChildAllowanceFactor(1),
      churchTaxRate: toPercentageRate(0.09) });
    assert.equal(saxony.monthlyWageTax, 1256.08);
    assert.equal(saxony.monthlySolidaritySurcharge, 0);
    assert.equal(saxony.careInsuranceRate, 0.0205);
  });

  it("conserves gross with cent-precise regular and one-off deductions", () => {
    const regular = computeGrossToNetBreakdown(toGrossSalary(5000), TaxClass.I);
    assert.equal(regular.monthlyWageTax, 782.41);
    assert.equal(regular.totalSocialSecurity, 1087.5);
    assert.equal(regular.monthlyNetTakeHome, 3130.09);
    const bonus = computeGrossToNetBreakdown(toGrossSalary(5000), TaxClass.I, 0, toGrossSalary(1000));
    assert.equal(bonus.bonusTaxDeduction, 272);
    assert.equal(bonus.bonusSocialSecurity, 217.5);
    assert.equal(bonus.bonusNetTakeHome, 510.5);
    assert.equal(bonus.monthlyNetTakeHome, 3640.59);
    assert.equal(bonus.monthlyNetTakeHome + bonus.totalTaxWithholding + bonus.totalSocialSecurity + bonus.bonusSocialSecurity, 6000);
  });

  it("applies contribution-age and year-to-date bonus limits", () => {
    assert.equal(computeMonthlySocialSecurity(toGrossSalary(4000), 0, undefined, { ageAtYearStart: toAgeYears(22) }).careInsuranceRate, 0.018);
    assert.equal(computeMonthlySocialSecurity(toGrossSalary(4000), 2, undefined, { childrenUnder25: toChildrenCount(0) }).careInsuranceRate, 0.018);
    const early = computeGrossToNetBreakdown(toGrossSalary(5700), TaxClass.I, 0, toGrossSalary(1000), undefined, undefined, { contributionMonthsYearToDate: toMonthDuration(1) });
    assert.equal(early.bonusSocialSecurity, 118.54);
  });

  it("rejects unsupported tariff overrides rather than silently ignoring them", () => {
    const rules = createTaxRules(undefined, { basicAllowance: 13000 });
    assert.throws(() => computeGrossToNetBreakdown(toGrossSalary(5000), TaxClass.I, 0, undefined, undefined, rules), /cannot apply/);
  });

  it("recovers the official annual wage-tax bases without the public output's zero clamp", () => {
    // Independently captured annual BMF cases in payroll2026.json.
    for (const [gross, taxClass, expected] of [[7000, TaxClass.III, 67354], [3833, TaxClass.V, 35461], [3000, TaxClass.V, 27480]] as const) {
      const inputs = payrollInputs(toGrossSalary(gross), taxClass, toChildrenCount(0));
      assert.equal(annualWithholdingTaxBase(inputs), expected);
    }
    assert.equal(annualWithholdingTaxBase(payrollInputs(toGrossSalary(0), TaxClass.IV, toChildrenCount(0))), 0);
  });

  it("calculates a truncated factor and supports zero joint liability", () => {
    assert.equal(computeTaxFactor(60000, 36000), 0.975);
    assert.equal(computeTaxFactor(25000, 0), 0);
    const zero = computeGrossToNetBreakdown(toGrossSalary(2500), TaxClass.IV, 0, undefined, toTaxFactor(0));
    assert.equal(zero.monthlyWageTax, 0);
  });
});


it("flags the unknown birthday when the childless care surcharge can start during the year", () => {
  const estimate = computeGrossToNetBreakdown(toGrossSalary(4000), TaxClass.I, toChildrenCount(0), undefined, undefined, undefined, { ageAtYearStart: toAgeYears(22) });
  assert.ok(estimate.payrollLimitations.some((reason) => reason.includes("birth month")));
  const parent = computeGrossToNetBreakdown(toGrossSalary(4000), TaxClass.I, toChildrenCount(0), undefined, undefined, undefined, { ageAtYearStart: toAgeYears(22),
    isParent: true });
  assert.equal(parent.payrollLimitations.length, 0);
});
