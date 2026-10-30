import assert from "node:assert/strict";
import {
  it,
} from "node:test";
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
  toRaiseId,
  toPercentageRate,
  toHoursChangeId,
  toWorkingHours,
  toAnnualSalariesCount,
} from "#engine/types";
import {
  runScenarioBatches,
} from "#engine/simulator/timelineGenerator";
import {
  computeGrossToNetBreakdown,
} from "#engine/tax/wageTax";
import {
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  standardPreexistingConditions,
} from "../../../test/fixture/standardHouseholds.ts";

const preexisting = { ...standardPreexistingConditions,
  simulationDurationMonths: toMonthDuration(13),
  salaryInputMode: SalaryInputMode.Gross,
  husbandGross: toGrossSalary(5000),
  wifeGross: toGrossSalary(3000),
  husbandInitialTaxClass: TaxClass.I,
  wifeInitialTaxClass: TaxClass.IV,
  enable13thSalary: false };

it("recalculates only the targeted gross salary and changed hours through PAP", () => {
  const result = runScenarioBatches({ scenarioKey: ScenarioId.A,
    preexisting,
    pregnancies: [],
    taxClassSwitches: [],
    salaryRaises: [{ raiseId: toRaiseId("RAISE-PARITY"),
      effectiveSimulationMonth: toSimulationMonth(2),
      effectiveCalendarMonth: toCalendarMonth(2),
      effectiveCalendarYear: toFullCalendarYear(2026),
      targetPerson: TargetPerson.Husband,
      percentageIncrease: toPercentageRate(0.1),
      reason: "Raise" }],
    workingHoursChanges: [{ changeId: toHoursChangeId("HOURS-PARITY"),
      effectiveSimulationMonth: toSimulationMonth(3),
      effectiveCalendarMonth: toCalendarMonth(3),
      effectiveCalendarYear: toFullCalendarYear(2026),
      targetPerson: TargetPerson.Husband,
      weeklyHours: toWorkingHours(16),
      reason: "Half the initial 32h" }] });
  const [first, raised, reduced] = result.months;
  assert.equal(first.husbandSalary, 3130.09);
  assert.equal(first.payroll?.husband.monthlyWageTax, 782.41);
  assert.equal(raised.wifeSalary, first.wifeSalary);
  assert.equal(raised.payroll?.husband.monthlyGross, 5500);
  assert.equal(reduced.payroll?.husband.monthlyGross, 2750);
  assert.equal(raised.husbandSalary, computeGrossToNetBreakdown(toGrossSalary(5500), TaxClass.I).regularNetTakeHome);
  assert.notEqual(raised.husbandSalary, Math.round(first.husbandSalary * 1.1));
  assert.equal(result.months[12].payroll?.husband.taxRules.calendarYear, 2027);
  assert.equal(result.months[12].payroll?.husband.taxRules.projected, true);
});

it("uses the actual calendar-year profile and keeps manual payroll unavailable", () => {
  const result = runScenarioBatches({ scenarioKey: ScenarioId.A,
    preexisting: { ...preexisting,
      startCalendarYear: toFullCalendarYear(2025) },
    pregnancies: [],
    taxClassSwitches: [],
    salaryRaises: [] });
  assert.equal(
    result.months[0].husbandSalary,
    computeGrossToNetBreakdown(toGrossSalary(5000), TaxClass.I, 0, undefined, undefined, createTaxRules(toFullCalendarYear(2025))).regularNetTakeHome,
  );
  assert.equal(result.months[12].husbandSalary, 3130.09);
  const manual = runScenarioBatches({ scenarioKey: ScenarioId.A,
    preexisting: standardPreexistingConditions,
    pregnancies: [],
    taxClassSwitches: [],
    salaryRaises: [] });
  assert.equal(manual.months[0].payroll, undefined);
  assert.ok(manual.months[0].assumptions?.some((text) => text.includes("Manual net")));
});

it("pays sourced differential-tax bonuses once and retains their itemized payroll", () => {
  const result = runScenarioBatches({ scenarioKey: ScenarioId.A,
    preexisting: { ...preexisting,
      husbandGross: toGrossSalary(4000),
      husbandInitialTaxClass: TaxClass.III,
      husbandSalariesCount: toAnnualSalariesCount(13) },
    pregnancies: [],
    taxClassSwitches: [],
    salaryRaises: [] });
  const vacation = result.months[4];
  const christmas = result.months[10];
  const first = vacation.payroll?.husband.bonuses?.[0];
  const second = christmas.payroll?.husband.bonuses?.[0];
  assert.ok(first && second);
  // Independently captured BMF responses in test/fixture/payroll2026.json.
  assert.equal(first.gross, 1600);
  assert.equal(first.wageTax, 310);
  assert.equal(first.net, 942);
  assert.equal(second.gross, 2400);
  assert.equal(second.wageTax, 472);
  assert.equal(second.net, 1406);
  assert.equal(vacation.husbandBonusAmount, first.net);
  assert.equal(vacation.specialEvents.filter((event) => event.title.includes("Husband")).length, 1);
  assert.equal(christmas.husbandBonusAmount, second.net);
});

it("preserves payroll limitations in simulator metadata and disclosed assumptions", () => {
  const result = runScenarioBatches({ scenarioKey: ScenarioId.A,
    preexisting: { ...preexisting,
      husbandGross: toGrossSalary(500) },
    pregnancies: [],
    taxClassSwitches: [],
    salaryRaises: [] });
  assert.equal(result.payrollComplete, false);
  assert.match(result.months[0].payroll?.husband.payrollLimitations[0] ?? "", /Marginal employment/);
  assert.ok(result.assumptions?.some((note) => note.includes("Payroll estimate: Marginal employment")));
});

it("keeps earlier bonus withholding independent of the visible timeline cutoff", () => {
  const batches = { scenarioKey: ScenarioId.A,
    preexisting: { ...preexisting,
      husbandGross: toGrossSalary(4000),
      husbandInitialTaxClass: TaxClass.III,
      husbandSalariesCount: toAnnualSalariesCount(13),
      simulationDurationMonths: toMonthDuration(5) },
    pregnancies: [],
    taxClassSwitches: [],
    salaryRaises: [{ raiseId: toRaiseId("LATER-KNOWN-RAISE"),
      effectiveSimulationMonth: toSimulationMonth(9),
      effectiveCalendarMonth: toCalendarMonth(9),
      effectiveCalendarYear: toFullCalendarYear(2026),
      targetPerson: TargetPerson.Husband,
      percentageIncrease: toPercentageRate(0.1),
      reason: "Known September raise affects annual bonus withholding" }] };
  const short = runScenarioBatches(batches);
  const full = runScenarioBatches({ ...batches,
    preexisting: { ...batches.preexisting,
      simulationDurationMonths: toMonthDuration(12) } });
  assert.deepEqual(short.months[4].payroll?.husband.bonuses, full.months[4].payroll?.husband.bonuses);
  const unchanged = runScenarioBatches({ ...batches,
    salaryRaises: [] });
  assert.notEqual(short.months[4].payroll?.husband.bonuses?.[0].wageTax, unchanged.months[4].payroll?.husband.bonuses?.[0].wageTax);
});
