import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  toFullCalendarYear,
} from "#engine/types";
import {
  getEmploymentThresholds,
} from "#engine/tax/employmentThresholds";

it("uses already published future thresholds independently from payroll projections", () => {
  assert.equal(getEmploymentThresholds(toFullCalendarYear(2026)).marginal.value, 603);
  const published = getEmploymentThresholds(toFullCalendarYear(2027));
  assert.equal(published.marginal.value, 633);
  assert.equal(published.projected, false);
  assert.equal(getEmploymentThresholds(toFullCalendarYear(2028)).projected, true);
  assert.throws(() => getEmploymentThresholds(toFullCalendarYear(2023)), TypeError);
});
