import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  runScenarioBatches,
} from "#engine/simulator/timelineGenerator";
import {
  computeAnnualTaxReconciliation,
} from "#engine/tax/jointAssessment";
import {
  ScenarioId,
  SalaryInputMode,
  SpecialEventType,
  toGrossSalary,
  toNetSalary,
  toMonthDuration,
  toCalendarYear,
  toSimulationMonth,
} from "#engine/types";
import {
  standardPreexistingConditions,
} from "../../../test/fixture/standardHouseholds.ts";

it("creates no tax cash or tax events for a zero-income, zero-withholding household", () => {
  const result = runScenarioBatches({ scenarioKey: ScenarioId.A,
    preexisting: { ...standardPreexistingConditions,
      salaryInputMode: SalaryInputMode.Gross,
      simulationDurationMonths: toMonthDuration(36),
      husbandGross: toGrossSalary(0),
      wifeGross: toGrossSalary(0),
      husbandInitialNet: toNetSalary(0),
      wifeInitialFullTimeNet: toNetSalary(0),
      enable13thSalary: false },
    pregnancies: [],
    taxClassSwitches: [],
    salaryRaises: [] });
  assert.equal(result.summary.totalTaxRefunds, 0);
  assert.equal(result.summary.grandTotal, 0);
  assert.equal(result.months.some((month) => month.specialEvents.some((event) => event.type === SpecialEventType.TaxReturn)), false);
});

it("has no default flat deduction refund even in the compatibility helper", () => {
  const result = computeAnnualTaxReconciliation(toCalendarYear(1), toSimulationMonth(15), []);
  assert.equal(result.baseDeductionsRefund, 0);
  assert.equal(result.totalRefundAmount, 0);
});
