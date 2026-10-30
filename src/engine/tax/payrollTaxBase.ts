import {
  type computeEmploymentPayroll,
} from "#engine/tax/employmentPayroll";
import {
  type TaxRules,
} from "#engine/tax/taxRules";
import {
  type AnnualEmploymentIncome,
  computeAnnualEmploymentTaxBase,
  computeIndividualEmploymentTaxBase,
} from "#engine/tax/annualEmploymentIncome";
import {
  TaxClass,
} from "#engine/types";

type EmploymentPayroll = ReturnType<typeof computeEmploymentPayroll>;

/** Annual salary inputs specify the complete modeled payment schedule, including non-working months. */
export function computePayrollTaxBase(
  payrolls: readonly [EmploymentPayroll] | readonly [EmploymentPayroll, EmploymentPayroll],
  rules: TaxRules,
) {
  const reasons = [...new Set(payrolls.flatMap((person) => {
    const limitations = person.payments.flatMap((payment) => payment.payroll.payrollLimitations);
    if (person.churchTax > 0) {
      limitations.push("The annual church-tax deduction is not supported by this taxable-income model.");
    }
    if (person.payments.some((payment) => payment.payroll.taxClass === TaxClass.II)) {
      limitations.push("The annual single-parent relief is not supported by this taxable-income model.");
    }
    return limitations;
  }))];
  const incomes = payrolls.map((person): AnnualEmploymentIncome => ({
    gross: person.annualGross,
    health: person.healthCare,
    care: person.care,
    pension: person.pension,
    unemployment: person.unemployment,
  }));
  const taxBase = reasons.length > 0 ? undefined : payrolls.length === 1
    ? computeIndividualEmploymentTaxBase(incomes[0], rules)
    : computeAnnualEmploymentTaxBase(incomes[0], incomes[1], rules);
  const incomeByPerson = taxBase === undefined ? [] : "income" in taxBase
    ? [taxBase.income]
    : [taxBase.incomeByPartner.husband, taxBase.incomeByPartner.wife];
  return Object.freeze({ rules,
    taxBase,
    incomeByPerson: Object.freeze(incomeByPerson),
    reasons: Object.freeze(reasons) });
}
