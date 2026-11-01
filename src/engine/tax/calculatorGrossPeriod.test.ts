import assert from "node:assert/strict";
import {
  it, 
} from "node:test";
import {
  calculateScenarioData,
  getCurrentInputs,
} from "#store/calculatorStore";
import {
  SalaryPeriod,
  toGrossSalary,
} from "#engine/types";
import {
  CalculatorGrossField,
  grossInputForPeriod,
  withGrossInputForPeriod,
} from "#engine/tax/calculatorGrossPeriod";

it("period presentation preserves original cents and partial-year extra-pay schedules", () => {
  const inputs = { ...getCurrentInputs(),
    inputMode: "monthly" as const,
    grossIncome: 4123.45,
    workingMonths: 7,
    salariesPerYear: 13.5 };
  const original = structuredClone(inputs);
  const data = calculateScenarioData(inputs);
  assert.equal(grossInputForPeriod(inputs, CalculatorGrossField.Primary, SalaryPeriod.Yearly), data.person1.grossYearly);
  assert.equal(grossInputForPeriod(inputs, CalculatorGrossField.Primary, SalaryPeriod.Monthly), 4123.45);
  assert.deepEqual(inputs, original);
  assert.deepEqual(calculateScenarioData(inputs), data);
  const annual = { ...inputs,
    inputMode: "yearly" as const,
    grossIncome: 50000.01 };
  grossInputForPeriod(annual, CalculatorGrossField.Primary, SalaryPeriod.Monthly);
  assert.equal(annual.grossIncome, 50000.01);
});

it("editing either person's basis preserves the other person's exact payroll", () => {
  const inputs = { ...getCurrentInputs(),
    inputMode: "yearly" as const,
    hasPartner: true,
    grossIncome: 67000.01,
    partnerGrossIncome: 42000.07 };
  const original = calculateScenarioData(inputs);
  const primary = withGrossInputForPeriod(inputs, CalculatorGrossField.Primary, toGrossSalary(5000), SalaryPeriod.Monthly);
  assert.equal(primary.partnerInputMode, "yearly");
  assert.deepEqual(calculateScenarioData(primary).partner, original.partner);
  const partner = withGrossInputForPeriod(inputs, CalculatorGrossField.Partner, toGrossSalary(3000), SalaryPeriod.Monthly);
  assert.deepEqual(calculateScenarioData(partner).person1, original.person1);
  assert.equal(calculateScenarioData(partner).partner?.grossYearly, 36000);
});

it("distinguishes a valid zero from an unknown monthly rate with no worked months", () => {
  const inputs = { ...getCurrentInputs(),
    inputMode: "yearly" as const,
    grossIncome: 0,
    workingMonths: 0 };
  assert.equal(grossInputForPeriod(inputs, CalculatorGrossField.Primary, SalaryPeriod.Monthly), undefined);
  assert.equal(grossInputForPeriod(inputs, CalculatorGrossField.Primary, SalaryPeriod.Yearly), 0);
  assert.equal(grossInputForPeriod({ ...inputs,
    workingMonths: 12 }, CalculatorGrossField.Primary, SalaryPeriod.Monthly), 0);
});
