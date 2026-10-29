import {
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";
import {
  toGrossSalary,
  toMonthDuration,
  toCalendarMonth,
  toPercentageRate,
  SalaryPeriod,
} from "#engine/types";
import {
  normalizeEmploymentPeriod,
  toSalaryPaymentCount,
} from "#engine/tax/employmentPeriod";

describe("Employment period normalization", () => {
  it("applies active months to monthly salary instead of always multiplying by twelve", () => {
    for (const [months, expected] of [[0, 0], [6, 24000], [12, 48000]]) {
      const result = normalizeEmploymentPeriod({ gross: toGrossSalary(4000),
        period: SalaryPeriod.Monthly,
        monthsWorked: toMonthDuration(months),
        annualSalaryPayments: toSalaryPaymentCount(12) });
      assert.equal(result.annualGross, expected);
      assert.equal(result.regularAnnualGross, expected);
      assert.equal(result.payments.length, months);
    }
  });

  it("preserves an actual yearly total and its residual cents", () => {
    const result = normalizeEmploymentPeriod({ gross: toGrossSalary(24000.01),
      period: SalaryPeriod.Yearly,
      monthsWorked: toMonthDuration(6),
      annualSalaryPayments: toSalaryPaymentCount(12) });
    assert.equal(result.annualGross, 24000.01);
    assert.deepEqual(result.payments.map((payment) => payment.regularGross), [4000.01, 4000, 4000, 4000, 4000, 4000]);
    assert.equal(result.bonusAnnualGross, 0);
  });

  it("explicitly prorates fractional extra payments without changing yearly semantics", () => {
    for (const [payments, bonus, total] of [[12.5, 1000, 25000], [13, 2000, 26000], [14, 4000, 28000]]) {
      const monthly = normalizeEmploymentPeriod({ gross: toGrossSalary(4000),
        period: SalaryPeriod.Monthly,
        monthsWorked: toMonthDuration(6),
        annualSalaryPayments: toSalaryPaymentCount(payments) });
      const yearly = normalizeEmploymentPeriod({ gross: toGrossSalary(total),
        period: SalaryPeriod.Yearly,
        monthsWorked: toMonthDuration(6),
        annualSalaryPayments: toSalaryPaymentCount(payments) });
      assert.equal(monthly.annualGross, total);
      assert.equal(monthly.bonusAnnualGross, bonus);
      assert.deepEqual(monthly.payments, yearly.payments);
      assert.equal(monthly.payments[5].bonusGross, bonus);
      assert.ok(monthly.assumptions.some((message) => message.includes("prorated")));
    }
  });

  it("allocates a supplied bonus schedule and an explicit employment start", () => {
    const result = normalizeEmploymentPeriod({ gross: toGrossSalary(4000),
      period: SalaryPeriod.Monthly,
      monthsWorked: toMonthDuration(6),
      startMonth: toCalendarMonth(7),
      annualSalaryPayments: toSalaryPaymentCount(13),
      bonusDistribution: [{ calendarMonth: toCalendarMonth(9),
        payoutFraction: toPercentageRate(0.4) }, { calendarMonth: toCalendarMonth(12),
        payoutFraction: toPercentageRate(0.6) }] });
    assert.equal(result.payments[0].month, 7);
    assert.equal(result.payments[2].bonusGross, 800);
    assert.equal(result.payments[5].bonusGross, 1200);
    assert.equal(result.payments[5].contributionMonthsYearToDate, 6);
  });

  it("rejects inconsistent or impossible periods rather than guessing", () => {
    const base = { gross: toGrossSalary(4000),
      period: SalaryPeriod.Monthly,
      monthsWorked: toMonthDuration(6),
      annualSalaryPayments: toSalaryPaymentCount(12) };
    assert.throws(() => normalizeEmploymentPeriod({ ...base,
      monthsWorked: toMonthDuration(1.5) }), TypeError);
    assert.throws(() => normalizeEmploymentPeriod({ ...base,
      startMonth: toCalendarMonth(10) }), TypeError);
    assert.throws(() => normalizeEmploymentPeriod({ ...base,
      annualSalaryPayments: toSalaryPaymentCount(6) }), TypeError);
    assert.throws(() => normalizeEmploymentPeriod({ ...base,
      period: SalaryPeriod.Yearly,
      monthsWorked: toMonthDuration(0) }), TypeError);
    assert.throws(() => normalizeEmploymentPeriod({ ...base,
      bonusDistribution: [{ calendarMonth: toCalendarMonth(1),
        payoutFraction: toPercentageRate(0.4) }] }), TypeError);
  });
});
