import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  projectMortgage,
  toMortgageYears,
} from "#/apps/mortgage/mortgageCalculation.ts";
import {
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";

it("projects an interest-free loan and caps the final payment at the balance", () => {
  const result = projectMortgage(toEuroAmount(12000), toPercentageRate(0), toPercentageRate(1), toMortgageYears(2));
  assert.equal(result.monthlyPayment, 1000);
  assert.equal(result.balance, 0);
  assert.equal(result.interestPaid, 0);
  assert.equal(result.elapsedMonths, 12);
  assert.equal(result.paidOff, true);
});

it("keeps an interest-only balance and tracks interest over the selected period", () => {
  const result = projectMortgage(toEuroAmount(120000), toPercentageRate(0.06), toPercentageRate(0), toMortgageYears(1));
  assert.equal(result.monthlyPayment, 600);
  assert.equal(result.balance, 120000);
  assert.equal(result.interestPaid, 7200);
  assert.equal(result.paidOff, false);
});

it("reduces the balance over time and validates the projection period", () => {
  const result = projectMortgage(toEuroAmount(100000), toPercentageRate(0.04), toPercentageRate(0.02), toMortgageYears(1));
  assert.equal(result.monthlyPayment, 500);
  assert.equal(result.balance, 97962.93);
  assert.equal(result.interestPaid, 3962.93);
  assert.throws(() => toMortgageYears(0));
  assert.throws(() => toMortgageYears(51));
});
