import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  standardPreexistingConditions,
} from "../../../test/fixture/standardHouseholds.ts";
import {
  runScenarioBatches,
} from "#engine/simulator/timelineGenerator";
import {
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  FieldColumnKey,
  SalaryInputMode,
  ScenarioId,
  TaxClass,
  toEuroAmount,
  toGrossSalary,
  toMonthDuration,
} from "#engine/types";
import {
  getFieldExplanation,
} from "#engine/explanation/timelineExplainer";

const money = (amount: number) => new Intl.NumberFormat("de-DE", { style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2 }).format(amount);

const payrollMonth = (gross: number, taxClass: TaxClass = TaxClass.I) => runScenarioBatches({
  scenarioKey: ScenarioId.A,
  preexisting: { ...standardPreexistingConditions,
    simulationDurationMonths: toMonthDuration(1),
    salaryInputMode: SalaryInputMode.Gross,
    husbandGross: toGrossSalary(gross),
    wifeGross: toGrossSalary(3200),
    husbandInitialTaxClass: taxClass,
    enable13thSalary: false },
  pregnancies: [],
  taxClassSwitches: [],
  salaryRaises: [],
}).months[0];

it("explains husband's actual gross, tax class and deductions across different payrolls", () => {
  for (const gross of [3800, 8200]) {
    for (const taxClass of [TaxClass.I, TaxClass.IV]) {
      const month = payrollMonth(gross, taxClass);
      const payroll = month.payroll!.husband;
      const result = getFieldExplanation(FieldColumnKey.HusbandSalary, month);
      const factor = (name: string) => result.contributingFactors?.find((item) => item.name === name);
      assert.equal(result.valueFormatted, money(month.husbandSalary));
      assert.equal(factor("Recorded gross salary")?.value, money(gross));
      assert.equal(factor("Actual tax class")?.value, taxClass);
      assert.equal(factor("Wage tax withheld")?.value, money(payroll.monthlyWageTax));
      assert.equal(factor("Total social insurance")?.value, money(payroll.totalSocialSecurity));
      assert.equal(factor("Wage tax withheld")?.source, createTaxRules(payroll.taxRules.sourceYear).papPublication.source);
      assert.equal(result.calculationSteps?.[0].result, money(payroll.regularNetTakeHome));
      assert.ok(!result.explanation.includes("fully refunded"));
    }
  }
});

it("keeps missing husband's payroll deductions unavailable, including a zero salary", () => {
  const month = { ...payrollMonth(3800),
    payroll: undefined,
    husbandSalary: toEuroAmount(0) };
  const result = getFieldExplanation(FieldColumnKey.HusbandSalary, month);
  assert.equal(result.valueFormatted, money(0));
  assert.ok(result.explanation.includes("Payroll deductions are unavailable"));
  assert.equal(result.contributingFactors?.some((factor) => factor.name === "Recorded gross salary"), false);
  assert.deepEqual(result.calculationSteps, []);
});

it("discloses provisional payroll limitations without substituting fixed examples", () => {
  const month = payrollMonth(3800);
  const provisional = { ...month,
    payroll: { ...month.payroll!,
      husband: { ...month.payroll!.husband,
        payrollLimitations: ["Unsupported employment regime"] } } };
  const result = getFieldExplanation(FieldColumnKey.HusbandSalary, provisional);
  assert.ok(result.explanation.includes("Provisional payroll: Unsupported employment regime"));
  assert.equal(result.valueFormatted, money(month.husbandSalary));
});
