import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  calculatePurchaseLtv,
  estimateAffordability,
  estimateAffordableBankLoan,
  estimateAffordableBankLoanForTerm,
  LoanRepaymentMethod,
  projectKfwLoan,
  toGraceYears,
} from "#/apps/mortgage/financingProjection.ts";
import {
  toMortgageYears,
} from "#/apps/mortgage/mortgageCalculation.ts";
import {
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";

it("models a grace period and repays the full loan at zero interest", () => {
  const result = projectKfwLoan({ principal: toEuroAmount(120000),
    annualInterest: toPercentageRate(0),
    term: toMortgageYears(11),
    grace: toGraceYears(1),
    method: LoanRepaymentMethod.Annuity }, toMortgageYears(11));
  assert.equal(result.initialMonthlyPayment, 0);
  assert.equal(result.laterMonthlyPayment, 1000);
  assert.equal(result.yearly[0].balance, 120000);
  assert.equal(result.balance, 0);
  assert.equal(result.totalPaid, 120000);
});

it("models a balloon payment and keeps debt outstanding until maturity", () => {
  const terms = { principal: toEuroAmount(120000),
    annualInterest: toPercentageRate(0.06),
    term: toMortgageYears(2),
    grace: toGraceYears(0),
    method: LoanRepaymentMethod.Balloon };
  const before = projectKfwLoan(terms, toMortgageYears(1));
  assert.equal(before.initialMonthlyPayment, 600);
  assert.equal(before.balance, 120000);
  assert.equal(before.balloonDue, 0);
  const full = projectKfwLoan(terms, toMortgageYears(2));
  assert.equal(full.balance, 0);
  assert.equal(full.balloonDue, 120000);
  assert.equal(full.interestPaid, 14400);
  assert.equal(full.totalPaid, 134400);
});

it("calculates LTV and household cash flow without hiding a deficit", () => {
  assert.equal(calculatePurchaseLtv(toEuroAmount(400000), toEuroAmount(500000)), 0.8);
  assert.equal(calculatePurchaseLtv(toEuroAmount(100), toEuroAmount(0)), null);
  assert.deepEqual(estimateAffordability(toEuroAmount(4000), toEuroAmount(2500), toEuroAmount(300), toEuroAmount(1500)), {
    availableBeforeLoans: 1200,
    remainingAfterLoans: -300,
    loanPaymentShare: 0.375,
  });
  assert.throws(() => projectKfwLoan({ principal: toEuroAmount(100),
    annualInterest: toPercentageRate(0.03),
    term: toMortgageYears(1),
    grace: toGraceYears(1),
    method: LoanRepaymentMethod.Annuity }, toMortgageYears(1)));
});


it("estimates a bank loan from the available payment without assuming a lending rule", () => {
  assert.equal(estimateAffordableBankLoan(toEuroAmount(1000), toPercentageRate(0.04), toPercentageRate(0.02)), 200000);
  assert.equal(estimateAffordableBankLoan(toEuroAmount(-1), toPercentageRate(0.04), toPercentageRate(0.02)), null);
  assert.equal(estimateAffordableBankLoan(toEuroAmount(1000), toPercentageRate(0), toPercentageRate(0)), null);
});

it("charges interest during the grace period before starting an amortizing payment", () => {
  const result = projectKfwLoan({
    principal: toEuroAmount(120000),
    annualInterest: toPercentageRate(0.06),
    term: toMortgageYears(11),
    grace: toGraceYears(1),
    method: LoanRepaymentMethod.Annuity,
  }, toMortgageYears(2));
  assert.equal(result.initialMonthlyPayment, 600);
  assert.equal(result.laterMonthlyPayment, 1332.25);
  assert.equal(result.yearly[0].balance, 120000);
  assert.equal(result.yearly[0].interestPaid, 7200);
  assert.ok(result.yearly[1].balance < 120000);
});


it("estimates a bank loan using a chosen payoff term", () => {
  assert.equal(estimateAffordableBankLoanForTerm(toEuroAmount(1000), toPercentageRate(0), toMortgageYears(10)), 120000);
  const loan = estimateAffordableBankLoanForTerm(toEuroAmount(1000), toPercentageRate(0.06), toMortgageYears(10));
  assert.ok(loan !== null && loan > 90000 && loan < 91000);
  assert.equal(estimateAffordableBankLoanForTerm(toEuroAmount(-1), toPercentageRate(0.06), toMortgageYears(10)), null);
});
