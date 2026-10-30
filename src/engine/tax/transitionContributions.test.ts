import assert from "node:assert/strict";
import {
  it, 
} from "node:test";
import {
  toFullCalendarYear,
  toGrossSalary,
} from "#engine/types";
import {
  createTaxRules, 
} from "#engine/tax/taxRules";
import {
  computeTransitionContributionBases, 
} from "#engine/tax/transitionContributions";

it("matches independently published 2026 DRV contribution bases", () => {
  // https://www.deutsche-rentenversicherung.de/DRV/DE/Experten/Arbeitgeber-und-Steuerberater/summa-summarum/Lexikon/U/uebergangsbereich
  const rules = createTaxRules(toFullCalendarYear(2026));
  const low = computeTransitionContributionBases(toGrossSalary(800), toGrossSalary(800), rules);
  assert.equal(low.factor, 0.6619);
  assert.equal(low.totalAssessment, 624.88);
  assert.equal(low.employeeAssessment, 282.03);
  const higher = computeTransitionContributionBases(toGrossSalary(1800), toGrossSalary(1800), rules);
  assert.equal(higher.totalAssessment, 1770.81);
  assert.equal(higher.employeeAssessment, 1713.67);
});

it("matches the 2025 GKV example independently of the BEEG factor", () => {
  // GKV guidance §3.3: https://www.gkv-spitzenverband.de/media/dokumente/pflegeversicherung/grundprinzipien/2025-03-31_GH_Beitragssatzdifferenzierung_sPV.pdf
  const result = computeTransitionContributionBases(toGrossSalary(950), toGrossSalary(950), createTaxRules(toFullCalendarYear(2025)));
  assert.equal(result.factor, 0.6683);
  assert.equal(result.totalAssessment, 815.90);
  assert.equal(result.employeeAssessment, 545.71);
});

it("uses expected pay for eligibility and handles actual pay crossing either limit", () => {
  const rules = createTaxRules(toFullCalendarYear(2026));
  const normal = computeTransitionContributionBases(toGrossSalary(1800), toGrossSalary(2100), rules);
  assert.equal(normal.reduced, false);
  assert.equal(normal.employeeAssessment, 1800);
  const below = computeTransitionContributionBases(toGrossSalary(500), toGrossSalary(800), rules);
  assert.equal(below.reduced, true);
  assert.equal(below.employeeAssessment, 0);
  assert.equal(below.totalAssessment, 330.95);
  const above = computeTransitionContributionBases(toGrossSalary(2100), toGrossSalary(1800), rules);
  assert.equal(above.reduced, false);
  assert.equal(above.employeeAssessment, 2100);
  assert.equal(computeTransitionContributionBases(toGrossSalary(603), toGrossSalary(603), rules).marginal, true);
  assert.equal(computeTransitionContributionBases(toGrossSalary(0), toGrossSalary(0), rules).marginal, false);
});

it("keeps the known 2027 threshold distinct from projected contribution rates", () => {
  const result = computeTransitionContributionBases(toGrossSalary(800), toGrossSalary(800), createTaxRules(toFullCalendarYear(2027)));
  assert.equal(result.thresholds.marginal.value, 633);
  assert.equal(result.thresholds.sourceYear, 2027);
  assert.equal(result.factorSourceYear, 2026);
});
