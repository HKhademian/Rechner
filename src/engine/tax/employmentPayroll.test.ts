import assert from "node:assert/strict";
import {
  it, 
} from "node:test";
import {
  SalaryPeriod,
  TaxClass,
  toChildrenCount,
  toGrossSalary,
  toMonthDuration,
  toPercentageRate,
} from "#engine/types";
import {
  DEFAULT_TAX_RULES, 
} from "#engine/tax/taxRules";
import {
  toSalaryPaymentCount, 
} from "#engine/tax/employmentPeriod";
import {
  computeEmploymentPayroll, 
} from "#engine/tax/employmentPayroll";

it("withholds only in active months and preserves monthly/yearly equivalent inputs", () => {
  const period = { gross: toGrossSalary(4000),
    period: SalaryPeriod.Monthly,
    monthsWorked: toMonthDuration(6),
    annualSalaryPayments: toSalaryPaymentCount(12) };
  const half = computeEmploymentPayroll(period, TaxClass.I, toChildrenCount(0), DEFAULT_TAX_RULES);
  const full = computeEmploymentPayroll({ ...period,
    monthsWorked: toMonthDuration(12) }, TaxClass.I, toChildrenCount(0), DEFAULT_TAX_RULES);
  const yearly = computeEmploymentPayroll({ ...period,
    gross: toGrossSalary(24000),
    period: SalaryPeriod.Yearly }, TaxClass.I, toChildrenCount(0), DEFAULT_TAX_RULES);
  assert.equal(half.annualGross, 24000);
  assert.equal(full.annualGross, 48000);
  assert.equal(half.netIncome * 2, full.netIncome);
  assert.equal(half.totalDeductions, yearly.totalDeductions);
  assert.equal(half.totalDeductions + half.netIncome, half.annualGross);
});

it("uses actual contribution months and conserves itemized bonus payroll", () => {
  const result = computeEmploymentPayroll(
    { gross: toGrossSalary(5700),
      period: SalaryPeriod.Monthly,
      monthsWorked: toMonthDuration(1),
      annualSalaryPayments: toSalaryPaymentCount(14) },
    TaxClass.I,
    toChildrenCount(0),
    DEFAULT_TAX_RULES,
    { churchTaxRate: toPercentageRate(0.09) },
  );
  assert.equal(result.bonusAnnualGross, 950);
  assert.equal(result.payments[0].payroll.bonusSocialSecurity, 113.24);
  assert.equal(
    result.totalDeductions,
    Number((result.tax + result.churchTax + result.solidarity + result.totalSocialSecurity).toFixed(2)),
  );
  assert.equal(result.netIncome, result.payments[0].payroll.monthlyNetTakeHome);
});

it("passes a personal insurer rate to both PAP and actual contributions", () => {
  const period = { gross: toGrossSalary(4000),
    period: SalaryPeriod.Monthly,
    monthsWorked: toMonthDuration(12),
    annualSalaryPayments: toSalaryPaymentCount(12) };
  const normal = computeEmploymentPayroll(period, TaxClass.I, toChildrenCount(0), DEFAULT_TAX_RULES);
  const personal = computeEmploymentPayroll(
    period, 
    TaxClass.I, 
    toChildrenCount(0), 
    DEFAULT_TAX_RULES,
    { healthSupplementTotalRate: toPercentageRate(0.02) },
  );
  assert.equal(personal.healthCare, 3984);
  assert.ok(personal.tax > normal.tax);
  assert.ok(personal.netIncome > normal.netIncome);
});
