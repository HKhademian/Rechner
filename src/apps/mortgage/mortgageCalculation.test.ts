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

it("uses a payoff term and handles a smaller final payment", async () => {
  const { mortgagePaymentForTerm } = await import("#/apps/mortgage/mortgageCalculation.ts");
  const principal = toEuroAmount(360000);
  const rate = toPercentageRate(0.0365);
  const payment = mortgagePaymentForTerm(principal, rate, toMortgageYears(30));
  assert.equal(payment, 1646.86);
  const projection = projectMortgage(principal, rate, toPercentageRate(0), toMortgageYears(30), { baseMonthlyPayment: payment });
  assert.equal(projection.paidOff, true);
  assert.equal(projection.elapsedMonths, 360);
  assert.equal(mortgagePaymentForTerm(toEuroAmount(1200), toPercentageRate(0), toMortgageYears(1)), 100);
});

it("applies extra principal only until payoff and reduces interest", () => {
  const principal = toEuroAmount(12000);
  const base = projectMortgage(principal, toPercentageRate(0.06), toPercentageRate(0.1), toMortgageYears(20));
  const extra = projectMortgage(principal, toPercentageRate(0.06), toPercentageRate(0.1), toMortgageYears(20), { extraMonthlyPayment: toEuroAmount(100) });
  assert.equal(extra.monthlyPayment, base.monthlyPayment + 100);
  assert.equal(extra.paidOff, true);
  assert.ok(extra.elapsedMonths < base.elapsedMonths);
  assert.ok(extra.interestPaid < base.interestPaid);
  assert.equal(extra.principalRepaid, principal);
  assert.equal(projectMortgage(toEuroAmount(0), toPercentageRate(0), toPercentageRate(0), toMortgageYears(1), { extraMonthlyPayment: toEuroAmount(100) }).monthlyPayment, 0);
});
