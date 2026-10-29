import {
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";
import {
  toFullCalendarYear,
  toGrossSalary,
  toEuroAmount,
  TaxClass,
} from "#engine/types";
import {
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  computeAnnualIncomeTax,
  computeMonthlySocialSecurity,
  computeSolidaritySurcharge,
  computeGrossToNetBreakdown,
} from "#engine/tax/wageTax";

describe("Annual rules in financial calculations", () => {
  it("uses the selected annual allowance and statutory whole-euro flooring", () => {
    const year2025 = createTaxRules(toFullCalendarYear(2025));
    const year2026 = createTaxRules(toFullCalendarYear(2026));
    // EStG § 32a: 2025's 12096 allowance gives floor((932.30*.0104+1400)*.0104)=14.
    assert.equal(computeAnnualIncomeTax(12200, year2025), 14);
    assert.equal(computeAnnualIncomeTax(12200, year2026), 0);
    assert.equal(computeAnnualIncomeTax(12348.99, year2026), 0);
    assert.equal(computeAnnualIncomeTax(12000), 0);
    const custom = createTaxRules(toFullCalendarYear(2026), { basicAllowance: 13000 });
    assert.equal(computeAnnualIncomeTax(13000, custom), 0);
  });

  it("uses verified contribution ceilings and configurable insurer rates", () => {
    const before = computeMonthlySocialSecurity(toGrossSalary(9000), 0, createTaxRules(toFullCalendarYear(2025)));
    const after = computeMonthlySocialSecurity(toGrossSalary(9000));
    assert.equal(before.pensionInsurance, 748.65);
    assert.equal(after.pensionInsurance, 785.85);
    assert.equal(after.healthInsurance, 508.59);
    const custom = createTaxRules(toFullCalendarYear(2026), { healthSupplementTotalRate: 0.02 });
    assert.equal(computeMonthlySocialSecurity(toGrossSalary(4000), 0, custom).healthInsurance, 332);
  });

  it("retains solidarity cents and identifies projected payroll rules", () => {
    assert.equal(computeSolidaritySurcharge(toEuroAmount(20360), false), 1.19);
    const rules = createTaxRules(toFullCalendarYear(2030));
    const payroll = computeGrossToNetBreakdown(toGrossSalary(4000), TaxClass.I, 0, undefined, undefined, rules);
    assert.equal(payroll.taxRules.sourceYear, 2026);
    assert.equal(payroll.taxRules.calendarYear, 2030);
    assert.equal(payroll.taxRules.projected, true);
  });
});
