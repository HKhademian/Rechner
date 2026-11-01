/** Read-only reproductions for the accuracy review; findings describe the reviewed revision, not desired behavior. */
import assert from "node:assert/strict";
import vectors from "../../test/fixture/payroll2026.json" with { type: "json" };
import {
  type CalculatorInputs,
  calculateScenarioData,
  getCurrentInputs,
} from "#store/calculatorStore";
import {
  calculatePayrollWithholding,
} from "#engine/tax/payroll";
import {
  createTaxRules,
  toAgeYears,
} from "#engine/tax/taxRules";
import {
  toFullCalendarYear,
  toChildrenCount,
} from "#engine/types";

const rules = createTaxRules(toFullCalendarYear(2026));
let comparisons = 0;
for (const vector of vectors) {
  const actual = calculatePayrollWithholding(vector.inputs, rules);
  for (const [field, expected] of Object.entries(vector.outputs)) {
    assert.equal(actual[field as keyof typeof actual], expected, `${vector.name}: ${field}`);
    comparisons++;
  }
}
const base: CalculatorInputs = {
  ...getCurrentInputs(),
  taxYear: rules.calendarYear,
  inputMode: "monthly",
  partnerInputMode: "monthly",
  grossIncome: 5000,
  workingMonths: 12,
  salariesPerYear: 12,
  taxBracket: "1",
  state: "Berlin",
  hasChurchTax: false,
  hasPartner: false,
  children: 0,
  personalPayroll: { ageAtYearStart: toAgeYears(40) },
  partnerPersonalPayroll: { ageAtYearStart: toAgeYears(40) },
  partnerGrossIncome: 0,
  partnerWorkingMonths: 12,
  partnerSalariesPerYear: 12,
  partnerTaxBracket: "1",
  partnerState: "Berlin",
  partnerHasChurchTax: false,
  taxFactor: undefined,
};
const summarize = (inputs: CalculatorInputs) => {
  const data = calculateScenarioData(inputs);
  return {
    annualNet: data.household.netIncome,
    annualTaxableIncome: data.annualTaxableIncome.taxBase?.taxableIncome,
    limitations: data.annualTaxableIncome.reasons,
  };
};
console.log(JSON.stringify({
  referenceFixtures: { cases: vectors.length, outputComparisons: comparisons },
  ageRelief: [40, 64, 65].map((age) => ({ age, ...summarize({ ...base, personalPayroll: { ageAtYearStart: toAgeYears(age) } }) })),
  partnerAssessment: [false, true].map((hasPartner) => ({ hasPartner, ...summarize({ ...base, hasPartner }) })),
  childAllowances: [0, 1].map((children) => ({ children, ...summarize({
    ...base,
    grossIncome: 12000,
    hasPartner: true,
    partnerGrossIncome: 8000,
    taxBracket: "4",
    partnerTaxBracket: "4",
    children,
    personalPayroll: { isParent: true, childrenUnder25: toChildrenCount(0) },
    partnerPersonalPayroll: { isParent: true, childrenUnder25: toChildrenCount(0) },
  }) })),
}, null, 2));
