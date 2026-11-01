import {
  TaxAssessment,
} from "#engine/tax/taxAssessment";
import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  computeEmploymentPayroll,
} from "#engine/tax/employmentPayroll";
import {
  computePayrollTaxBase,
} from "#engine/tax/payrollTaxBase";
import {
  DEFAULT_TAX_RULES,
  toAgeYears,
} from "#engine/tax/taxRules";
import {
  toSalaryPaymentCount,
} from "#engine/tax/employmentPeriod";
import {
  SalaryPeriod,
  TaxClass,
  toGrossSalary,
  toChildrenCount,
  toMonthDuration,
  toPercentageRate,
} from "#engine/types";

const payroll = (gross: number, months = 12, salaries = 12) => computeEmploymentPayroll({
  gross: toGrossSalary(gross),
  period: SalaryPeriod.Monthly,
  monthsWorked: toMonthDuration(months),
  annualSalaryPayments: toSalaryPaymentCount(salaries),
}, TaxClass.I, toChildrenCount(0), DEFAULT_TAX_RULES);

it("uses individual annual receipts rather than a joint allowance for one person", () => {
  const result = computePayrollTaxBase([payroll(5000)], DEFAULT_TAX_RULES);
  assert.deepEqual(result.reasons, []);
  assert.equal(result.incomeByPerson.length, 1);
  assert.equal(result.incomeByPerson[0].gross, 60000);
  assert.equal(result.taxBase?.taxableIncome, 46674);
});

it("keeps both partner contributions and their sum before joint deductions", () => {
  const result = computePayrollTaxBase([payroll(5000), payroll(3000)], DEFAULT_TAX_RULES, TaxAssessment.Joint);
  assert.equal(result.incomeByPerson.length, 2);
  const combined = result.incomeByPerson.reduce((sum, person) => sum + person.employmentIncome, 0);
  const base = result.taxBase!;
  assert.equal(base.taxableIncome, combined - base.pensionDeduction - base.insuranceDeduction - base.specialExpenses);
  assert.equal(base.specialExpenses, DEFAULT_TAX_RULES.parameters.specialExpenseAllowance.value * result.incomeByPerson.length);
});

it("uses the configured active months and bonus receipts without reannualizing them", () => {
  const schedule = payroll(5000, 6, 13);
  const result = computePayrollTaxBase([schedule], DEFAULT_TAX_RULES);
  assert.equal(result.incomeByPerson[0].gross, schedule.annualGross);
  assert.equal(result.incomeByPerson[0].gross, 32500);
  const empty = computePayrollTaxBase([payroll(5000, 0)], DEFAULT_TAX_RULES);
  assert.equal(empty.taxBase?.taxableIncome, 0);
});

it("keeps provisional payroll and unsupported annual deductions unavailable", () => {
  const provisional = computePayrollTaxBase([payroll(500)], DEFAULT_TAX_RULES);
  assert.equal(provisional.taxBase, undefined);
  assert.ok(provisional.reasons.some((reason) => reason.includes("Marginal employment")));
  const church = computeEmploymentPayroll(
    { gross: toGrossSalary(5000),
      period: SalaryPeriod.Monthly,
      monthsWorked: toMonthDuration(12),
      annualSalaryPayments: toSalaryPaymentCount(12) },
    TaxClass.I,
    toChildrenCount(0),
    DEFAULT_TAX_RULES,
    { churchTaxRate: toPercentageRate(0.09) },
  );
  const result = computePayrollTaxBase([church], DEFAULT_TAX_RULES);
  assert.equal(result.taxBase, undefined);
  assert.ok(result.reasons.some((reason) => reason.includes("church-tax deduction")));
});

it("withholds an incomplete annual base when child allowances are not modeled", () => {
  const parents = [12000, 8000].map((gross) => computeEmploymentPayroll({
    gross: toGrossSalary(gross),
    period: SalaryPeriod.Monthly,
    monthsWorked: toMonthDuration(12),
    annualSalaryPayments: toSalaryPaymentCount(12),
  }, TaxClass.IV, toChildrenCount(1), DEFAULT_TAX_RULES));
  const result = computePayrollTaxBase([parents[0], parents[1]], DEFAULT_TAX_RULES, TaxAssessment.Joint);
  assert.equal(result.taxBase, undefined);
  assert.deepEqual(result.incomeByPerson, []);
  assert.equal(result.reasons.length, 1);
  assert.match(result.reasons[0], /Child allowances.*https:\/\/www.gesetze-im-internet.de\/estg\/__32.html/);
  assert.ok(parents.every((person) => person.netIncome > 0 && person.tax > 0));
});

it("flags missing annual age relief without marking monthly withholding provisional", () => {
  const older = computeEmploymentPayroll({
    gross: toGrossSalary(5000),
    period: SalaryPeriod.Monthly,
    monthsWorked: toMonthDuration(12),
    annualSalaryPayments: toSalaryPaymentCount(12),
  }, TaxClass.I, toChildrenCount(0), DEFAULT_TAX_RULES, { ageAtYearStart: toAgeYears(64) });
  const result = computePayrollTaxBase([older], DEFAULT_TAX_RULES);
  assert.equal(result.taxBase, undefined);
  assert.equal(result.reasons.length, 1);
  assert.match(result.reasons[0], /Annual age relief.*https:\/\/www.gesetze-im-internet.de\/estg\/__24a.html/);
  assert.ok(older.netIncome > payroll(5000).netIncome);
  assert.ok(older.payments.every((payment) => payment.payroll.payrollLimitations.length === 0));
});

it("requires an explicit assessment for two people instead of pooling allowances silently", () => {
  const result = computePayrollTaxBase([payroll(5000), payroll(0)], DEFAULT_TAX_RULES);
  assert.equal(result.assessment, TaxAssessment.Unspecified);
  assert.equal(result.taxBase, undefined);
  assert.match(result.reasons[0], /Choose individual or joint assessment/);
});

it("sums individual bases after separate deduction limits and zero floors", () => {
  const people = [payroll(5000), payroll(0)] as const;
  const separate = computePayrollTaxBase(people, DEFAULT_TAX_RULES, TaxAssessment.Individual);
  const joint = computePayrollTaxBase(people, DEFAULT_TAX_RULES, TaxAssessment.Joint);
  assert.equal(separate.taxBase?.taxableIncome, 46674);
  assert.equal(separate.individualBases.length, 2);
  assert.equal(separate.individualBases[1].taxableIncome, 0);
  assert.equal(joint.taxBase?.taxableIncome, 46638);
  assert.equal(joint.individualBases.length, 0);
  assert.throws(() => computePayrollTaxBase([people[0]], DEFAULT_TAX_RULES, TaxAssessment.Joint), TypeError);
});
