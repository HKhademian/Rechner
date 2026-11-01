import {
  type CalculatorInputs,
} from "#store/calculatorStore";
import {
  type GrossSalary,
  type SalaryPeriod,
  SalaryPeriod as Period,
  toGrossSalary,
  toMonthDuration,
} from "#engine/types";
import {
  normalizeEmploymentPeriod,
  toSalaryPaymentCount,
} from "#engine/tax/employmentPeriod";

export const CalculatorGrossField = { Primary: "grossIncome",
  Partner: "partnerGrossIncome" } as const;
export type CalculatorGrossField = (typeof CalculatorGrossField)[keyof typeof CalculatorGrossField];
export function toCalculatorGrossField(value: string): CalculatorGrossField {
  if (!Object.values(CalculatorGrossField).includes(value as CalculatorGrossField)) {
    throw new TypeError("Choose a primary or partner gross field.");
  }
  return value as CalculatorGrossField;
}

export function inputModeForPeriod(period: SalaryPeriod): CalculatorInputs["inputMode"] {
  return period === Period.Monthly ? "monthly" : "yearly";
}

/** Reading another period never changes the original amount or payroll schedule. */
export function grossInputForPeriod(inputs: CalculatorInputs, field: CalculatorGrossField, period: SalaryPeriod): GrossSalary | undefined {
  const partner = field === CalculatorGrossField.Partner;
  const mode = partner ? inputs.partnerInputMode ?? inputs.inputMode : inputs.inputMode;
  const gross = toGrossSalary(inputs[field]);
  if (mode === inputModeForPeriod(period)) {
    return gross;
  }
  const months = toMonthDuration(partner ? inputs.partnerWorkingMonths : inputs.workingMonths);
  const schedule = normalizeEmploymentPeriod({ gross,
    period: mode === "monthly" ? Period.Monthly : Period.Yearly,
    monthsWorked: months,
    annualSalaryPayments: toSalaryPaymentCount(partner ? inputs.partnerSalariesPerYear : inputs.salariesPerYear) });
  return period === Period.Yearly ? schedule.annualGross : months === 0 ? undefined : toGrossSalary(schedule.regularAnnualGross / months);
}

/** Editing adopts a basis for only that person; the other person's exact amount/basis survive. */
export function withGrossInputForPeriod(inputs: CalculatorInputs, field: CalculatorGrossField, amount: GrossSalary, period: SalaryPeriod): CalculatorInputs {
  const mode = inputModeForPeriod(period);
  if (field === CalculatorGrossField.Partner) {
    return { ...inputs,
      partnerGrossIncome: amount,
      partnerInputMode: mode };
  }
  return { ...inputs,
    grossIncome: amount,
    inputMode: mode,
    partnerInputMode: inputs.partnerInputMode ?? (mode === inputs.inputMode ? undefined : inputs.inputMode) };
}
