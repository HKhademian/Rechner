import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  computeEmploymentAgeRelief,
  createAgeReliefRules,
  DEFAULT_AGE_RELIEF_RULES,
} from "#engine/tax/ageRelief";
import {
  createTaxRules,
  DEFAULT_TAX_RULES,
  toAgeYears,
} from "#engine/tax/taxRules";
import {
  toGrossSalary,
  toFullCalendarYear,
} from "#engine/types";

it("uses gross wages, the personal cohort and its permanent cap", () => {
  const relief = (gross: number, age?: number) => computeEmploymentAgeRelief(toGrossSalary(gross), age === undefined ? undefined : toAgeYears(age), DEFAULT_TAX_RULES);
  assert.equal(relief(60000), 0);
  assert.equal(relief(60000, 63), 0);
  assert.equal(relief(60000, 64), 608);
  assert.equal(relief(1000, 64), 128);
  assert.equal(relief(1000, 68), 144);
  assert.equal(relief(60000, 65), 627);
  assert.equal(relief(60000, 100), 1900);
  assert.equal(relief(0, 64), 0);
  assert.equal(computeEmploymentAgeRelief(toGrossSalary(60000), toAgeYears(64), createTaxRules(toFullCalendarYear(2025))), 627);
  assert.equal(computeEmploymentAgeRelief(toGrossSalary(60000), toAgeYears(65), createTaxRules(toFullCalendarYear(2027))), 608);
});

it("accepts sourced configuration and rejects gaps, duplicates and invalid values", () => {
  const source = DEFAULT_AGE_RELIEF_RULES.source;
  const custom = createAgeReliefRules({ source,
    cohorts: [{ firstYear: 2026,
      rate: 0.1,
      maximum: 500 }, { firstYear: 2027,
      rate: 0,
      maximum: 0 }] });
  assert.equal(computeEmploymentAgeRelief(toGrossSalary(60000), toAgeYears(64), DEFAULT_TAX_RULES, custom), 500);
  assert.ok(Object.isFrozen(custom.cohorts[0]));
  for (const input of [null, {}, { source,
    cohorts: [] }, { source,
    cohorts: [{ firstYear: 2026,
      rate: -1,
      maximum: 0 }] },
  { source,
    cohorts: [{ firstYear: 2026,
      rate: 0.1,
      maximum: 500 }] },
  { source,
    cohorts: [{ firstYear: 2025,
      rate: 0.1,
      maximum: 500 }, { firstYear: 2027,
      rate: 0,
      maximum: 0 }] }]) {
    assert.throws(() => createAgeReliefRules(input), TypeError);
  }
});
