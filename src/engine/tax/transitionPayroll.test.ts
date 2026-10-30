import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  computeMonthlySocialSecurity,
  computeGrossToNetBreakdown,
} from "#engine/tax/wageTax";
import {
  TaxClass,
  toEuroAmount,
  toGrossSalary,
  toFullCalendarYear,
} from "#engine/types";
import {
  createTaxRules,
} from "#engine/tax/taxRules";

it("deducts employee contributions from the official 2026 reduced bases", () => {
  // DRV 800 EUR example: AN base 282.03, total base 624.88.
  // https://www.deutsche-rentenversicherung.de/DRV/DE/Experten/Arbeitgeber-und-Steuerberater/summa-summarum/Lexikon/U/uebergangsbereich
  const result = computeMonthlySocialSecurity(toGrossSalary(800));
  assert.equal(result.healthInsurance, 24.68); // 20.59 general + 4.09 supplement
  assert.equal(result.pensionInsurance, 26.23);
  assert.equal(result.unemploymentInsurance, 3.67);
  assert.equal(result.careInsurance, 8.83); // 5.08 base + 3.75 childless surcharge
  assert.equal(result.totalSocialSecurity, 63.41);
  assert.equal(computeMonthlySocialSecurity(toGrossSalary(800), 0, undefined, { saxony: true }).careInsurance, 10.24);
  assert.equal(computeMonthlySocialSecurity(toGrossSalary(800), 2).careInsurance, 4.37); // 5.08 - .71
});

it("matches the independent GKV 2025 two-child care example", () => {
  // GKV guidance §3.3: AN 545.71 × 1.8% ->9.82, discount ×.25% ->1.36, result8.46.
  // https://www.gkv-spitzenverband.de/media/dokumente/pflegeversicherung/grundprinzipien/2025-03-31_GH_Beitragssatzdifferenzierung_sPV.pdf
  const result = computeMonthlySocialSecurity(toGrossSalary(950), 2, createTaxRules(toFullCalendarYear(2025)));
  assert.equal(result.careInsurance, 8.46);
});

it("uses the expected employment average rather than mistaking lower monthly pay for a Midijob", () => {
  // 1800 ×14/12=2100: predictable extra salaries put regular expected pay above the transition ceiling.
  const normal = computeMonthlySocialSecurity(
    toGrossSalary(1800),
    1,
    undefined,
    { expectedMonthlyEmploymentGross: toGrossSalary(2100) },
  );
  assert.equal(normal.pensionInsurance, 167.40);
  const reduced = computeMonthlySocialSecurity(toGrossSalary(1800), 1);
  assert.equal(reduced.pensionInsurance, 159.37);
  assert.equal(reduced.totalSocialSecurity, 362.45);
});

it("identifies unsupported contribution regimes instead of presenting exact net values", () => {
  const marginal = computeGrossToNetBreakdown(toGrossSalary(500), TaxClass.I);
  assert.match(marginal.payrollLimitations[0], /Marginal employment/);
  assert.ok(marginal.assumptions.some((note) => note.startsWith("Payroll estimate:")));
  const bonus = computeGrossToNetBreakdown(toGrossSalary(1800), TaxClass.I, 1, toEuroAmount(1000));
  assert.match(bonus.payrollLimitations[0], /One-off contributions in the transition zone/);
  assert.equal(computeGrossToNetBreakdown(toGrossSalary(0), TaxClass.I).payrollLimitations.length, 0);
  assert.equal(computeGrossToNetBreakdown(toGrossSalary(800), TaxClass.I).payrollLimitations.length, 0);
});
