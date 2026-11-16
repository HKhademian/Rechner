import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  EmploymentBand,
  MinijobTaxMode,
  evaluateMinijobMidijobTransition,
} from "#engine/formulas/pure/minijobTransitionEvaluator";
import {
  TaxClass,
  toChildrenCount,
  toFullCalendarYear,
  toGrossSalary,
} from "#engine/types";

describe("Minijob & Midijob Transition Evaluator", () => {
  it("tracks statutory marginal earnings thresholds across 2024 (€538), 2025 (€556), and 2026 (€603)", () => {
    const y2024 = evaluateMinijobMidijobTransition({
      calendarYear: toFullCalendarYear(2024),
      monthlyGrossEur: toGrossSalary(538),
      taxClass: TaxClass.I,
      childrenCount: toChildrenCount(0),
      hasChurchTax: false,
      isBavariaOrBadenWuerttemberg: false,
      inSaxony: false,
      minijobPensionOptOut: true,
      minijobTaxMode: MinijobTaxMode.EmployerFlat2Percent,
    });
    const y2025 = evaluateMinijobMidijobTransition({
      calendarYear: toFullCalendarYear(2025),
      monthlyGrossEur: toGrossSalary(556),
      taxClass: TaxClass.I,
      childrenCount: toChildrenCount(0),
      hasChurchTax: false,
      isBavariaOrBadenWuerttemberg: false,
      inSaxony: false,
      minijobPensionOptOut: true,
      minijobTaxMode: MinijobTaxMode.EmployerFlat2Percent,
    });
    const y2026 = evaluateMinijobMidijobTransition({
      calendarYear: toFullCalendarYear(2026),
      monthlyGrossEur: toGrossSalary(603),
      taxClass: TaxClass.I,
      childrenCount: toChildrenCount(0),
      hasChurchTax: false,
      isBavariaOrBadenWuerttemberg: false,
      inSaxony: false,
      minijobPensionOptOut: true,
      minijobTaxMode: MinijobTaxMode.EmployerFlat2Percent,
    });

    assert.equal(y2024.marginalLimitMonthlyEur, 538);
    assert.equal(y2024.current.employmentBand, EmploymentBand.Minijob);
    assert.equal(y2024.current.monthlyNetEur, 538);

    assert.equal(y2025.marginalLimitMonthlyEur, 556);
    assert.equal(y2025.current.employmentBand, EmploymentBand.Minijob);

    assert.equal(y2026.marginalLimitMonthlyEur, 603);
    assert.equal(y2026.current.employmentBand, EmploymentBand.Minijob);
    assert.equal(y2026.current.monthlyNetEur, 603);
  });

  it("models Minijob 3.6% pension top-up (including €175 minimum assessment base) vs opt-out", () => {
    const lowOptIn = evaluateMinijobMidijobTransition({
      calendarYear: toFullCalendarYear(2026),
      monthlyGrossEur: toGrossSalary(120),
      taxClass: TaxClass.I,
      childrenCount: toChildrenCount(0),
      hasChurchTax: false,
      isBavariaOrBadenWuerttemberg: false,
      inSaxony: false,
      minijobPensionOptOut: false,
      minijobTaxMode: MinijobTaxMode.EmployerFlat2Percent,
    });
    // Min base €175 * 3.6% = €6.30
    assert.equal(lowOptIn.current.employmentBand, EmploymentBand.Minijob);
    assert.equal(lowOptIn.pensionInsuranceEur, 6.3);
    assert.equal(lowOptIn.current.monthlyNetEur, 113.7);
    assert.equal(lowOptIn.current.employeeContributionBaseEur, 175);

    const optIn600 = evaluateMinijobMidijobTransition({
      calendarYear: toFullCalendarYear(2026),
      monthlyGrossEur: toGrossSalary(600),
      taxClass: TaxClass.I,
      childrenCount: toChildrenCount(0),
      hasChurchTax: false,
      isBavariaOrBadenWuerttemberg: false,
      inSaxony: false,
      minijobPensionOptOut: false,
      minijobTaxMode: MinijobTaxMode.EmployerFlat2Percent,
    });
    // 600 * 3.6% = €21.60
    assert.equal(optIn600.pensionInsuranceEur, 21.6);
    assert.equal(optIn600.current.monthlyNetEur, 578.4);
  });

  it("applies reduced Midijob employee contribution bases (§ 20 SGB IV) while preserving full gross pension credits", () => {
    const midijob = evaluateMinijobMidijobTransition({
      calendarYear: toFullCalendarYear(2026),
      monthlyGrossEur: toGrossSalary(1200),
      taxClass: TaxClass.I,
      childrenCount: toChildrenCount(0),
      hasChurchTax: false,
      isBavariaOrBadenWuerttemberg: false,
      inSaxony: false,
      minijobPensionOptOut: false,
      minijobTaxMode: MinijobTaxMode.EmployerFlat2Percent,
    });

    assert.equal(midijob.current.employmentBand, EmploymentBand.Midijob);
    assert.ok(midijob.current.employeeContributionBaseEur < 1200);
    assert.equal(midijob.current.pensionEntitlementBaseEur, 1200);
    assert.ok(midijob.midijobContributionSavingsPerMonthEur > 0);
    assert.equal(midijob.milestoneComparisons.length, 4);

    const regular = evaluateMinijobMidijobTransition({
      calendarYear: toFullCalendarYear(2026),
      monthlyGrossEur: toGrossSalary(2500),
      taxClass: TaxClass.I,
      childrenCount: toChildrenCount(1),
      hasChurchTax: false,
      isBavariaOrBadenWuerttemberg: false,
      inSaxony: false,
      minijobPensionOptOut: false,
      minijobTaxMode: MinijobTaxMode.EmployerFlat2Percent,
    });
    assert.equal(regular.current.employmentBand, EmploymentBand.Regular);
    assert.equal(regular.current.employeeContributionBaseEur, 2500);
    assert.equal(regular.midijobContributionSavingsPerMonthEur, 0);
  });
});
