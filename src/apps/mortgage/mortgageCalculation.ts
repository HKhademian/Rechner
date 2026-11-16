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
  readonly balance: EuroAmount;
  readonly interestPaid: EuroAmount;
  readonly principalRepaid: EuroAmount;
  readonly elapsedMonths: number;
  readonly paidOff: boolean;
  readonly balanceIncreasing: boolean;
}

const cents = (amount: number): number => Math.round((amount + Number.EPSILON) * 100);

/** Estimate a fixed-payment loan using monthly interest and cent-rounded payments. */
export function projectMortgage(
  principal: EuroAmount,
  annualInterest: PercentageRate,
  initialRepayment: PercentageRate,
  years: MortgageYears,
): MortgageProjection {
  if (!Number.isFinite(principal) || principal < 0 || !Number.isFinite(annualInterest) || annualInterest < 0
    || !Number.isFinite(initialRepayment) || initialRepayment < 0) {
    throw new TypeError("Mortgage inputs must be finite and non-negative.");
  }
  const initial = cents(principal);
  const payment = cents(principal * (annualInterest + initialRepayment) / 12);
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
    balance: toEuroAmount(balance / 100),
    interestPaid: toEuroAmount(interestTotal / 100),
    principalRepaid: toEuroAmount((initial - balance) / 100),
    elapsedMonths,
    paidOff: balance === 0,
    balanceIncreasing: balance > initial,
  };
}
