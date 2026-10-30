import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  toFullCalendarYear,
  toCalendarMonth,
  toEuroAmount,
} from "#engine/types";
import {
  assessCoupleBenefitIncome,
  getCoupleBenefitIncomeLimit,
  IncomeEligibilityStatus,
  toIncomeEligibilityStatus,
} from "#engine/benefits/incomeEligibility";

it("selects the verified limit at the April birth-month boundaries", () => {
  const limit = (year: number, month: number) => getCoupleBenefitIncomeLimit(toFullCalendarYear(year), toCalendarMonth(month));
  assert.equal(limit(2024, 3).maximum, 300000);
  assert.equal(limit(2024, 4).maximum, 200000);
  assert.equal(limit(2025, 3).maximum, 200000);
  assert.equal(limit(2025, 4).maximum, 175000);
  assert.equal(limit(2027, 2).relevantIncomeYear, 2026);
  assert.match(limit(2027, 2).source, /beeg\/__1/);
  assert.throws(() => limit(2021, 8), TypeError);
});

it("distinguishes the exact maximum, a cent above it and missing evidence", () => {
  const assess = (income?: number) => assessCoupleBenefitIncome(toFullCalendarYear(2026), toCalendarMonth(6), income === undefined ? undefined : toEuroAmount(income));
  assert.equal(assess(175000).status, IncomeEligibilityStatus.Eligible);
  assert.equal(assess(175000.01).status, IncomeEligibilityStatus.Ineligible);
  assert.equal(assess().status, IncomeEligibilityStatus.Unavailable);
  assert.equal(toIncomeEligibilityStatus(IncomeEligibilityStatus.Eligible), IncomeEligibilityStatus.Eligible);
  assert.throws(() => toIncomeEligibilityStatus("ASSUMED"), TypeError);
});
