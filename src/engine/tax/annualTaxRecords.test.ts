import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  collectAnnualTaxRecords,
} from "#engine/tax/annualTaxRecords";
import {
  runScenarioBatches,
} from "#engine/simulator/timelineGenerator";
import {
  standardPreexistingConditions,
} from "../../../test/fixture/standardHouseholds.ts";
import {
  SalaryInputMode,
  ScenarioId,
  TaxClass,
  TargetPerson,
  toGrossSalary,
  toMonthDuration,
  toSimulationMonth,
  toCalendarMonth,
  toFullCalendarYear,
  toHoursChangeId,
  toWorkingHours,
} from "#engine/types";

const base = { scenarioKey: ScenarioId.A,
  pregnancies: [],
  salaryRaises: [],
  taxClassSwitches: [],
  preexisting: { ...standardPreexistingConditions,
    simulationDurationMonths: toMonthDuration(12),
    salaryInputMode: SalaryInputMode.Gross,
    husbandGross: toGrossSalary(5000),
    husbandInitialTaxClass: TaxClass.I,
    wifeGross: toGrossSalary(0),
    enable13thSalary: false } };

it("aggregates actual PAP withholding and deductions across the complete year", () => {
  const result = collectAnnualTaxRecords(runScenarioBatches(base).months, [])[0];
  // Independent BMF5000/I monthly withholding782.41: paid9388.92, credit9389.
  // Gross60000 -1230 -5580 -(5250×.96+1440) -72 =46638; joint tax4820, refund4569.
  assert.equal(result.incomeAvailable, true);
  assert.equal(result.taxBase?.taxableIncome, 46638);
  assert.equal(result.assessment?.withheldIncomeTax, 9388.92);
  assert.equal(result.assessment?.incomeTaxLiability, 4820);
  assert.equal(result.assessment?.settlement, 4569);
});

it("keeps full-year allowances when only six months have employment earnings", () => {
  const months = runScenarioBatches({ ...base,
    workingHoursChanges: [1, 7].map((month, index) => ({changeId: toHoursChangeId(`PARTIAL-YEAR-${month}`),
      effectiveSimulationMonth: toSimulationMonth(month),
      effectiveCalendarMonth: toCalendarMonth(month),
      effectiveCalendarYear: toFullCalendarYear(2026),
      targetPerson: TargetPerson.Husband,
      weeklyHours: toWorkingHours(index === 0 ? 0 : 32),
      reason: "Employment period" })) }).months;
  const result = collectAnnualTaxRecords(months, [])[0];
  // 30000 -1230 -2790 -(2625+720+390) -72=22173, below the joint basic allowance.
  assert.equal(result.taxBase?.taxableIncome, 22173);
  assert.equal(result.assessment?.incomeTaxLiability, 0);
  assert.equal(result.assessment?.settlement, 4695); // ceil(6×782.41)
});

it("distinguishes missing calendar data, manual nets and unknown benefit progression", () => {
  const months = runScenarioBatches(base).months;
  const partial = collectAnnualTaxRecords(months.slice(0, 6), [])[0];
  assert.equal(partial.available, false);
  assert.deepEqual(partial.missingMonths, [7, 8, 9, 10, 11, 12]);
  const unknown = collectAnnualTaxRecords(months.map((month, index) => index === 0
    ? { ...month,
      benefitAssessmentAvailable: false } : month), [])[0];
  assert.equal(unknown.incomeAvailable, true);
  assert.equal(unknown.available, false);
  const manual = collectAnnualTaxRecords(months.map((month) => ({ ...month,
    payroll: undefined })), [])[0];
  assert.equal(manual.incomeAvailable, false);
  assert.throws(() => collectAnnualTaxRecords([...months, months[0]], []), /duplicate calendar months/);
});
