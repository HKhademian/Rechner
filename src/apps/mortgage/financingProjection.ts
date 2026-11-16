import {
  type Brand,
  type EuroAmount,
  type PercentageRate,
  toEuroAmount,
} from "#engine/types";
import {
  type MortgageYears,
} from "#/apps/mortgage/mortgageCalculation.ts";

export const LoanRepaymentMethod = { Annuity: "annuity",
  Balloon: "balloon" } as const;
export type LoanRepaymentMethod = (typeof LoanRepaymentMethod)[keyof typeof LoanRepaymentMethod];
export type GraceYears = Brand<number, "GraceYears">;
export function toGraceYears(value: number): GraceYears {
  if (!Number.isInteger(value) || value < 0 || value > 49) {
    throw new TypeError("The repayment-free period must be between 0 and 49 years.");
  }
  return value as GraceYears;
}

export interface KfwLoanTerms {
  readonly principal: EuroAmount;
  readonly annualInterest: PercentageRate;
  readonly term: MortgageYears;
  readonly grace: GraceYears;
  readonly method: LoanRepaymentMethod;
}

export interface KfwLoanProjection {
  readonly initialMonthlyPayment: EuroAmount;
  readonly laterMonthlyPayment: EuroAmount;
  readonly balloonDue: EuroAmount;
  readonly balance: EuroAmount;
  readonly interestPaid: EuroAmount;
  readonly totalPaid: EuroAmount;
  readonly yearly: readonly KfwYear[];
}
export interface KfwYear {
  readonly year: number;
  readonly balance: EuroAmount;
  readonly interestPaid: EuroAmount;
  readonly payments: EuroAmount;
}

/** Approximate a fully disbursed loan with a fixed nominal rate and monthly compounding. */
export function projectKfwLoan(terms: KfwLoanTerms, horizon: MortgageYears): KfwLoanProjection {
  if (terms.principal < 0 || !Number.isFinite(terms.principal) || terms.annualInterest < 0 || !Number.isFinite(terms.annualInterest)) {
    throw new TypeError("Loan amount and interest must be non-negative and finite.");
  }
  if (terms.method !== LoanRepaymentMethod.Annuity && terms.method !== LoanRepaymentMethod.Balloon) {
    throw new TypeError("Invalid loan repayment method.");
  }
  if (terms.method === LoanRepaymentMethod.Annuity && terms.grace >= terms.term) {
    throw new TypeError("The repayment-free period must be shorter than the loan term.");
  }
  const initialCents = Math.round(terms.principal * 100);
  const monthlyRate = terms.annualInterest / 12;
  const graceMonths = terms.method === LoanRepaymentMethod.Balloon ? terms.term * 12 : terms.grace * 12;
  const repaymentMonths = (terms.term - terms.grace) * 12;
  const interestOnly = Math.round(initialCents * monthlyRate);
  const payment = terms.method === LoanRepaymentMethod.Balloon ? interestOnly : Math.round(monthlyRate === 0
    ? initialCents / repaymentMonths
    : initialCents * monthlyRate / (1 - Math.pow(1 + monthlyRate, -repaymentMonths)));
  let balance = initialCents;
  let totalInterest = 0;
  let totalPayments = 0;
  let balloon = 0;
  const yearly: KfwYear[] = [];
  for (let month = 1; month <= horizon * 12; month += 1) {
    if (balance > 0) {
      const interest = Math.round(balance * monthlyRate);
      let paid = Math.min(balance + interest, month <= graceMonths ? interest : payment);
      if (month === terms.term * 12) {
        // The last payment reconciles rounding; a balloon loan returns all principal here.
        paid = balance + interest;
        if (terms.method === LoanRepaymentMethod.Balloon) {
          balloon = balance;
        }
      }
      balance += interest - paid;
      totalInterest += interest;
      totalPayments += paid;
    }
    if (month % 12 === 0) {
      yearly.push({ year: month / 12,
        balance: toEuroAmount(balance / 100),
        interestPaid: toEuroAmount(totalInterest / 100),
        payments: toEuroAmount(totalPayments / 100) });
    }
  }
  return {
    initialMonthlyPayment: toEuroAmount((graceMonths > 0 ? interestOnly : payment) / 100),
    laterMonthlyPayment: toEuroAmount(payment / 100),
    balloonDue: toEuroAmount(balloon / 100),
    balance: toEuroAmount(balance / 100),
    interestPaid: toEuroAmount(totalInterest / 100),
    totalPaid: toEuroAmount(totalPayments / 100),
    yearly,
  };
}

/** Purchase-price LTV is an estimate; lenders may use a different collateral value. */
export function calculatePurchaseLtv(debt: EuroAmount, propertyPrice: EuroAmount): number | null {
  if (debt < 0 || propertyPrice < 0 || !Number.isFinite(debt) || !Number.isFinite(propertyPrice)) {
    throw new TypeError("Debt and property value must be non-negative and finite.");
  }
  return propertyPrice === 0 ? null : debt / propertyPrice;
}

export interface AffordabilityEstimate {
  readonly availableBeforeLoans: EuroAmount;
  readonly remainingAfterLoans: EuroAmount;
  readonly loanPaymentShare: number | null;
}

/** Cash-flow comparison using amounts supplied by the user, without a lending threshold. */
export function estimateAffordability(income: EuroAmount, expenses: EuroAmount, housingCosts: EuroAmount, payments: EuroAmount): AffordabilityEstimate {
  if ([income, expenses, housingCosts, payments].some((amount) => !Number.isFinite(amount) || amount < 0)) {
    throw new TypeError("Monthly affordability inputs must be non-negative and finite.");
  }
  const available = income - expenses - housingCosts;
  return {
    availableBeforeLoans: toEuroAmount(available),
    remainingAfterLoans: toEuroAmount(available - payments),
    loanPaymentShare: income === 0 ? null : payments / income,
  };
}

/** Maximum bank principal under the selected initial-payment formula and monthly budget. */
export function estimateAffordableBankLoan(monthlyBudget: EuroAmount, annualInterest: PercentageRate, initialRepayment: PercentageRate): EuroAmount | null {
  if (!Number.isFinite(monthlyBudget) || !Number.isFinite(annualInterest) || !Number.isFinite(initialRepayment) || annualInterest < 0 || initialRepayment < 0) {
    throw new TypeError("Budget and rates must be finite, with non-negative rates.");
  }
  const annualRate = annualInterest + initialRepayment;
  if (monthlyBudget < 0 || annualRate === 0) {
    return null;
  }
  return toEuroAmount(Math.floor((monthlyBudget * 12 / annualRate) * 100) / 100);
}
