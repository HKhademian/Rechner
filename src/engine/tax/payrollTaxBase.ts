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
  type EuroAmount,
  TaxClass,
  toEuroAmount,
} from "#engine/types";

import {
  TaxAssessment,
  toTaxAssessment,
  TAX_ASSESSMENT_SOURCE,
} from "#engine/tax/taxAssessment";

type EmploymentPayroll = ReturnType<typeof computeEmploymentPayroll>;

/** Annual salary inputs specify the complete modeled payment schedule, including non-working months. */
export function computePayrollTaxBase(
  payrolls: readonly [EmploymentPayroll] | readonly [EmploymentPayroll, EmploymentPayroll],
  rules: TaxRules,
  assessment: TaxAssessment = payrolls.length === 1 ? TaxAssessment.Individual : TaxAssessment.Unspecified,
) {
  const mode = toTaxAssessment(assessment);
  if (mode === TaxAssessment.Joint && payrolls.length !== 2) {
    throw new TypeError("Joint assessment needs two people.");
  }
  const reasons = [...new Set(payrolls.flatMap((person) => {
    const limitations = [...person.annualAssessmentLimitations, ...person.payments.flatMap((payment) => payment.payroll.payrollLimitations)];
    if (person.churchTax > 0) {
      limitations.push("The annual church-tax deduction is not supported by this taxable-income model.");
    }
    if (person.payments.some((payment) => payment.payroll.taxClass === TaxClass.II)) {
      limitations.push("The annual single-parent relief is not supported by this taxable-income model.");
    }
    if (person.payments.some((payment) => payment.payroll.childrenCount > 0)) {
      limitations.push("Child allowances need eligibility and allocation details. https://www.gesetze-im-internet.de/estg/__32.html");
    }
    return limitations;
  }))];
  if (mode === TaxAssessment.Unspecified) {
    reasons.push(`Choose individual or joint assessment. ${TAX_ASSESSMENT_SOURCE}`);
  }
  const incomes = payrolls.map((person): AnnualEmploymentIncome => ({
    gross: person.annualGross,
    health: person.healthCare,
    care: person.care,
    pension: person.pension,
    unemployment: person.unemployment,
  }));
  const individualBases = reasons.length === 0 && mode === TaxAssessment.Individual
    ? incomes.map((income) => computeIndividualEmploymentTaxBase(income, rules)) : [];
  const jointBase = reasons.length === 0 && mode === TaxAssessment.Joint && incomes.length === 2
    ? computeAnnualEmploymentTaxBase(incomes[0], incomes[1], rules) : undefined;
  const sum = (get: (base: typeof individualBases[number]) => EuroAmount): EuroAmount =>
    toEuroAmount(individualBases.reduce((total, base) => total + get(base), 0));
  // Apply limits and the zero floor per person before summing separate assessments.
  const taxBase = jointBase ?? (individualBases.length === 1 ? individualBases[0] : individualBases.length === 2
    ? Object.freeze({ gross: sum((base) => base.gross),
      pensionDeduction: sum((base) => base.pensionDeduction),
      insuranceDeduction: sum((base) => base.insuranceDeduction),
      specialExpenses: sum((base) => base.specialExpenses),
      taxableIncome: sum((base) => base.taxableIncome) }) : undefined);
  const incomeByPerson = jointBase ? [jointBase.incomeByPartner.husband, jointBase.incomeByPartner.wife]
    : individualBases.map((base) => base.income);
  return Object.freeze({ rules,
    assessment: mode,
    individualBases: Object.freeze(individualBases),
    taxBase,
    incomeByPerson: Object.freeze(incomeByPerson),
    reasons: Object.freeze(reasons) });
}
