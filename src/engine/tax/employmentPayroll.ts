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
  let regularHealthYtd = toGrossSalary(0);
  let regularPensionYtd = toGrossSalary(0);
  let bonusHealthYtd = toGrossSalary(0);
  let bonusPensionYtd = toGrossSalary(0);
  const payments = schedule.payments.map((payment) => {
    regularYtd = toGrossSalary(regularYtd + payment.regularGross);
    regularHealthYtd = toGrossSalary(regularHealthYtd + Math.min(payment.regularGross, rules.parameters.healthCapMonthly.value));
    regularPensionYtd = toGrossSalary(regularPensionYtd + Math.min(payment.regularGross, rules.parameters.pensionCapMonthly.value));
    const options: PayrollOptions = { ...personal,
      expectedRegularAnnualGross: schedule.regularAnnualGross,
      expectedMonthlyEmploymentGross: toGrossSalary(schedule.annualGross / schedule.payments.length),
      contributionMonthsYearToDate: payment.contributionMonthsYearToDate,
      regularGrossYearToDate: regularYtd,
      regularHealthAssessmentYearToDate: regularHealthYtd,
      regularPensionAssessmentYearToDate: regularPensionYtd,
      bonusHealthAssessmentYearToDate: bonusHealthYtd,
      bonusPensionAssessmentYearToDate: bonusPensionYtd,
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
    bonusHealthYtd = toGrossSalary(bonusHealthYtd + bonusContributions.assessedHealth);
    bonusPensionYtd = toGrossSalary(bonusPensionYtd + bonusContributions.assessedPension);
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
  // Annual assessment relief is separate from the correctly applied PAP withholding relief.
  const annualAssessmentLimitations: string[] = [];
  if (schedule.annualGross > 0 && personal.ageAtYearStart !== undefined && personal.ageAtYearStart >= rules.parameters.ageReliefMinimumAge.value) {
    annualAssessmentLimitations.push(`Annual age relief is not modeled. ${rules.parameters.ageReliefMinimumAge.source}`);
  }
  if ((personal.childAllowanceFactor ?? 0) > 0) {
    annualAssessmentLimitations.push(`Child allowances need eligibility and allocation details. ${rules.parameters.childAllowanceAnnual.source}`);
  }
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
    annualAssessmentLimitations: Object.freeze(annualAssessmentLimitations),
    assumptions: [...new Set([...schedule.assumptions, ...payments.flatMap((p) => p.payroll.assumptions)])] };
}
