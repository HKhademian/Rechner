import {
  type Brand,
  type GrossSalary,
  type MonthDuration,
  type CalendarMonth,
  type SalaryBonusSlot,
  type SalaryPeriod,
  SalaryPeriod as Period,
  toGrossSalary,
  toCalendarMonth,
  toMonthDuration,
} from "#engine/types";

/** Count of salary-payment equivalents; fractional extra salary payments are permitted. */
export type SalaryPaymentCount = Brand<number, "SalaryPaymentCount">;

export function toSalaryPaymentCount(value: number): SalaryPaymentCount {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError("Salary payment count must be a non-negative finite number.");
  }
  return value as SalaryPaymentCount;
}

export interface EmploymentPeriodInput {
  readonly gross: GrossSalary;
  readonly period: SalaryPeriod;
  readonly monthsWorked: MonthDuration;
  /** Full-year contractual salary-payment equivalents, including ordinary monthly pay. */
  readonly annualSalaryPayments: SalaryPaymentCount;
  readonly startMonth?: CalendarMonth;
  /** Full-year bonus fractions; totals must equal annualSalaryPayments minus monthly payments. */
  readonly bonusDistribution?: readonly SalaryBonusSlot[];
}

export interface EmploymentPayment {
  readonly month: CalendarMonth;
  readonly regularGross: GrossSalary;
  readonly bonusGross: GrossSalary;
  readonly contributionMonthsYearToDate: MonthDuration;
}

export interface NormalizedEmploymentPeriod {
  readonly annualGross: GrossSalary;
  readonly regularAnnualGross: GrossSalary;
  readonly bonusAnnualGross: GrossSalary;
  readonly paymentEquivalents: SalaryPaymentCount;
  readonly payments: readonly EmploymentPayment[];
  readonly assumptions: readonly string[];
}

/** Allocate cents with largest remainders so the schedule exactly preserves its supplied total. */
function allocateCents(total: GrossSalary, weights: readonly number[]): readonly GrossSalary[] {
  if (weights.length === 0) {
    return [];
  }
  const sum = weights.reduce((value, weight) => value + weight, 0);
  const cents = Math.round(total * 100);
  const exact = weights.map((weight) => cents * weight / sum);
  const amounts = exact.map(Math.floor);
  const order = exact.map((value, index) => ({ index,
    remainder: value - amounts[index] })).sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  const missing = cents - amounts.reduce((value, amount) => value + amount, 0);
  for (let index = 0; index < missing; index++) {
    amounts[order[index % order.length].index]++;
  }
  return amounts.map((amount) => toGrossSalary(amount / 100));
}

/**
 * Monthly amounts describe ordinary pay. Yearly amounts describe the actual total for the year.
 * Bonus proration is an explicit employment-contract assumption, not a statutory tax rule.
 */
export function normalizeEmploymentPeriod(input: EmploymentPeriodInput): NormalizedEmploymentPeriod {
  const { gross, monthsWorked, annualSalaryPayments } = input;
  const start = input.startMonth ?? toCalendarMonth(1);
  if (!Number.isInteger(monthsWorked) || monthsWorked < 0 || monthsWorked > 12 || start + monthsWorked > 13) {
    throw new TypeError("Employment must occupy whole months within the selected calendar year.");
  }
  if (annualSalaryPayments < 12 || !Number.isFinite(annualSalaryPayments)) {
    throw new TypeError("Annual salary equivalents must include the twelve regular monthly payments.");
  }
  if (input.period !== Period.Monthly && input.period !== Period.Yearly) {
    throw new TypeError("Invalid employment salary period.");
  }
  if (monthsWorked === 0) {
    if (input.period === Period.Yearly && gross > 0) {
      throw new TypeError("Positive yearly employment earnings require a modeled employment period.");
    }
    return Object.freeze({ annualGross: toGrossSalary(0),
      regularAnnualGross: toGrossSalary(0),
      bonusAnnualGross: toGrossSalary(0),
      paymentEquivalents: toSalaryPaymentCount(0),
      payments: Object.freeze([]),
      assumptions: Object.freeze([]) });
  }
  const annualGross = input.period === Period.Monthly
    ? toGrossSalary(gross * monthsWorked * annualSalaryPayments / 12)
    : gross;
  const regularAnnualGross = input.period === Period.Monthly
    ? toGrossSalary(gross * monthsWorked)
    : toGrossSalary(gross * 12 / annualSalaryPayments);
  const bonusAnnualGross = toGrossSalary(annualGross - regularAnnualGross);
  const regular = allocateCents(regularAnnualGross, Array.from({ length: monthsWorked }, () => 1));
  const slots = input.bonusDistribution ?? [];
  if (slots.length > 0) {
    const sum = slots.reduce((total, slot) => total + slot.payoutFraction, 0);
    if (Math.abs(sum - (annualSalaryPayments - 12)) > Number.EPSILON * Math.max(1, annualSalaryPayments) * slots.length) {
      throw new TypeError("Bonus distribution must match the full-year extra salary equivalents.");
    }
    for (const slot of slots) {
      if (slot.calendarMonth < start || slot.calendarMonth >= start + monthsWorked || slot.payoutFraction <= 0) {
        throw new TypeError("Bonus dates must fall inside the modeled employment period and have positive shares.");
      }
    }
  }
  const bonuses = allocateCents(bonusAnnualGross, slots.map((slot) => slot.payoutFraction));
  const assumptions: string[] = [];
  if (input.startMonth === undefined && monthsWorked < 12) {
    assumptions.push("Employment is assumed to start in January unless an explicit start month is supplied.");
  }
  if (bonusAnnualGross > 0) {
    assumptions.push("Additional contractual salary equivalents are prorated to months worked.");
    if (slots.length === 0) {
      assumptions.push("The bonus is assumed paid in the last modeled employment month.");
    }
  }
  const payments = regular.map((amount, index) => {
    const month = toCalendarMonth(start + index);
    const bonus = slots.length > 0
      ? toGrossSalary(slots.reduce((sum, slot, slotIndex) => sum + (slot.calendarMonth === month ? bonuses[slotIndex] : 0), 0))
      : toGrossSalary(index === regular.length - 1 ? bonusAnnualGross : 0);
    return Object.freeze({ month,
      regularGross: amount,
      bonusGross: bonus,
      contributionMonthsYearToDate: toMonthDuration(index + 1) });
  });
  return Object.freeze({ annualGross,
    regularAnnualGross,
    bonusAnnualGross,
    paymentEquivalents: toSalaryPaymentCount(monthsWorked * annualSalaryPayments / 12),
    payments: Object.freeze(payments),
    assumptions: Object.freeze(assumptions) });
}
