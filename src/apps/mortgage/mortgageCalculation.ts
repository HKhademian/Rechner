import {
  type Brand,
  type EuroAmount,
  type PercentageRate,
  toEuroAmount,
} from "#engine/types";

export type MortgageYears = Brand<number, "MortgageYears">;

export function toMortgageYears(value: number): MortgageYears {
  if (!Number.isInteger(value) || value < 1 || value > 50) {
    throw new TypeError("The projection must be between 1 and 50 years.");
  }
  return value as MortgageYears;
}

export interface MortgageProjection {
  readonly monthlyPayment: EuroAmount;
  readonly baseMonthlyPayment: EuroAmount;
  readonly balance: EuroAmount;
  readonly interestPaid: EuroAmount;
  readonly principalRepaid: EuroAmount;
  readonly elapsedMonths: number;
  readonly paidOff: boolean;
  readonly balanceIncreasing: boolean;
}

const cents = (amount: number): number => Math.round((amount + Number.EPSILON) * 100);

/** Monthly annuity for a target payoff term, rounded up so the final payment can settle the balance. */
export function mortgagePaymentForTerm(principal: EuroAmount, annualInterest: PercentageRate, term: MortgageYears): EuroAmount {
  if (!Number.isFinite(principal) || principal < 0 || !Number.isFinite(annualInterest) || annualInterest < 0) {
    throw new TypeError("Mortgage amount and rate must be finite and non-negative.");
  }
  const monthlyRate = annualInterest / 12;
  const count = term * 12;
  const raw = monthlyRate === 0 ? principal / count : principal * monthlyRate / -Math.expm1(-count * Math.log1p(monthlyRate));
  return toEuroAmount(Math.ceil(raw * 100 - 1e-8) / 100);
}

export interface MortgagePaymentOptions {
  readonly extraMonthlyPayment?: EuroAmount;
  readonly baseMonthlyPayment?: EuroAmount;
}

/** Estimate a fixed-payment loan using monthly interest and cent-rounded payments. */
export function projectMortgage(
  principal: EuroAmount,
  annualInterest: PercentageRate,
  initialRepayment: PercentageRate,
  years: MortgageYears,
  options: MortgagePaymentOptions = {},
): MortgageProjection {
  if (!Number.isFinite(principal) || principal < 0 || !Number.isFinite(annualInterest) || annualInterest < 0
    || !Number.isFinite(initialRepayment) || initialRepayment < 0) {
    throw new TypeError("Mortgage inputs must be finite and non-negative.");
  }
  const extra = options.extraMonthlyPayment ?? toEuroAmount(0);
  if (!Number.isFinite(extra) || extra < 0 || (options.baseMonthlyPayment !== undefined && (!Number.isFinite(options.baseMonthlyPayment) || options.baseMonthlyPayment < 0))) {
    throw new TypeError("Monthly payments must be finite and non-negative.");
  }
  const initial = cents(principal);
  const basePayment = principal === 0 ? 0 : cents(options.baseMonthlyPayment ?? principal * (annualInterest + initialRepayment) / 12);
  const payment = principal === 0 ? 0 : basePayment + cents(extra);
  let balance = initial;
  let interestTotal = 0;
  let elapsedMonths = 0;
  for (let month = 0; month < years * 12 && balance > 0; month += 1) {
    const interest = Math.round(balance * annualInterest / 12);
    const paid = Math.min(payment, balance + interest);
    balance += interest - paid;
    interestTotal += interest;
    elapsedMonths += 1;
  }
  return {
    monthlyPayment: toEuroAmount(payment / 100),
    baseMonthlyPayment: toEuroAmount(basePayment / 100),
    balance: toEuroAmount(balance / 100),
    interestPaid: toEuroAmount(interestTotal / 100),
    principalRepaid: toEuroAmount((initial - balance) / 100),
    elapsedMonths,
    paidOff: balance === 0,
    balanceIncreasing: balance > initial,
  };
}
