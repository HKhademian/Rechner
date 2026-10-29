import {
  type ChildrenCount,
  type TaxClass,
  type TaxFactor,
  type EuroAmount,
  toEuroAmount,
  toGrossSalary,
} from "#engine/types";
import {
  type EmploymentPeriodInput,
  normalizeEmploymentPeriod,
} from "#engine/tax/employmentPeriod";
import {
  type PayrollOptions,
} from "#engine/tax/payroll";
import {
  type TaxRules,
} from "#engine/tax/taxRules";
import {
  computeGrossToNetBreakdown,
  computeBonusSocialInsurance,
} from "#engine/tax/wageTax";

/** Run withholding only in active payment periods, retaining the actual annual earnings total. */
export function computeEmploymentPayroll(
  period: EmploymentPeriodInput,
  taxClass: TaxClass,
  children: ChildrenCount,
  rules: TaxRules,
  personal: PayrollOptions = {},
  factor?: TaxFactor,
) {
  const schedule = normalizeEmploymentPeriod(period);
  let regularYtd = toGrossSalary(0);
  let bonusYtd = toEuroAmount(0);
  const payments = schedule.payments.map((payment) => {
    regularYtd = toGrossSalary(regularYtd + payment.regularGross);
    const options: PayrollOptions = { ...personal,
      expectedRegularAnnualGross: schedule.regularAnnualGross,
      contributionMonthsYearToDate: payment.contributionMonthsYearToDate,
      regularGrossYearToDate: regularYtd,
      priorBonusGrossYearToDate: bonusYtd };
    const payroll = computeGrossToNetBreakdown(
      payment.regularGross, 
      taxClass, 
      children,
      toEuroAmount(payment.bonusGross), 
      factor, 
      rules, 
      options,
    );
    const bonusContributions = computeBonusSocialInsurance(
      payment.regularGross,
      toEuroAmount(payment.bonusGross),
      children,
      rules,
      options,
    );
    bonusYtd = toEuroAmount(bonusYtd + payment.bonusGross);
    return { ...payment,
      payroll,
      bonusContributions };
  });
  const sum = (get: (payment: typeof payments[number]) => number): EuroAmount =>
    toEuroAmount(payments.reduce((total, payment) => total + get(payment), 0));
  const healthCare = sum((p) => p.payroll.healthInsurance + p.bonusContributions.healthInsurance);
  const pension = sum((p) => p.payroll.pensionInsurance + p.bonusContributions.pensionInsurance);
  const unemployment = sum((p) => p.payroll.unemploymentInsurance + p.bonusContributions.unemploymentInsurance);
  const care = sum((p) => p.payroll.careInsurance + p.bonusContributions.careInsurance);
  const tax = sum((p) => p.payroll.monthlyWageTax + p.payroll.bonusWageTax);
  const churchTax = sum((p) => p.payroll.monthlyChurchTax + p.payroll.bonusChurchTax);
  const solidarity = sum((p) => p.payroll.monthlySolidaritySurcharge + p.payroll.bonusSolidaritySurcharge);
  const totalSocialSecurity = toEuroAmount(healthCare + pension + unemployment + care);
  const totalDeductions = toEuroAmount(totalSocialSecurity + tax + churchTax + solidarity);
  return { ...schedule,
    payments,
    healthCare,
    pension,
    unemployment,
    care,
    tax,
    churchTax,
    solidarity,
    totalSocialSecurity,
    totalDeductions,
    netIncome: toEuroAmount(schedule.annualGross - totalDeductions),
    assumptions: [...new Set([...schedule.assumptions, ...payments.flatMap((p) => p.payroll.assumptions)])] };
}
