import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  type ScenarioActionBatches,
  type PregnancyAction,
  ScenarioId,
  SalaryInputMode,
  TaxClass,
  TargetPerson,
  toGrossSalary,
  toSimulationMonth,
  toCalendarMonth,
  toFullCalendarYear,
  toTaxFactor,
  toSwitchId,
  toRaiseId,
  toPercentageRate,
  toPregnancyId,
  toChildIndex,
  toWorkingHours,
  toNetSalary,
  toMonthDuration,
} from "#engine/types";
import {
  assessmentCalendarMonth,
  toAssessmentMonthOrdinal,
} from "#engine/benefits/assessmentHistory";
import {
  evaluateIncomeMonth,
  buildIncomeSchedule,
} from "#engine/simulator/incomeSchedule";
import {
  standardPreexistingConditions,
} from "../../../test/fixture/standardHouseholds.ts";

const start = assessmentCalendarMonth(toFullCalendarYear(2026), toCalendarMonth(1));
const at = (index: number) => toAssessmentMonthOrdinal(start + index - 1);
const base: ScenarioActionBatches = { scenarioKey: ScenarioId.C,
  preexisting: standardPreexistingConditions,
  pregnancies: [],
  taxClassSwitches: [],
  salaryRaises: [] };
const pregnancy: PregnancyAction = { pregnancyId: toPregnancyId("PREG-INCOME"),
  childIndex: toChildIndex(1),
  positiveTestCalendarMonth: toCalendarMonth(4),
  positiveTestCalendarYear: toFullCalendarYear(2026),
  positiveTestSimulationMonth: toSimulationMonth(4),
  calculatedDeliverySimulationMonth: toSimulationMonth(12),
  motherPostBirthPartTimeHours: toWorkingHours(24),
  motherPostBirthPartTimeClass3Net: toNetSalary(1413),
  motherPostBirthPartTimeClass5Net: toNetSalary(1182),
  fatherPartnerMonthsCount: toMonthDuration(4) };

it("evaluates verified gross payroll and applies raises only to their target", () => {
  const batches: ScenarioActionBatches = { ...base,
    preexisting: { ...base.preexisting,
      salaryInputMode: SalaryInputMode.Gross,
      husbandGross: toGrossSalary(5000),
      wifeGross: toGrossSalary(3000),
      husbandInitialTaxClass: TaxClass.I },
    salaryRaises: [{ raiseId: toRaiseId("RAISE-INCOME"),
      effectiveSimulationMonth: toSimulationMonth(2),
      effectiveCalendarMonth: toCalendarMonth(2),
      effectiveCalendarYear: toFullCalendarYear(2026),
      targetPerson: TargetPerson.Wife,
      percentageIncrease: toPercentageRate(0.1),
      reason: "Promotion" }] };
  const first = evaluateIncomeMonth(batches, at(1));
  const second = evaluateIncomeMonth(batches, at(2));
  assert.equal(first.husbandSalary, 3130.09);
  assert.equal(second.husbandSalary, first.husbandSalary);
  assert.equal(second.wifePayroll?.monthlyGross, 3300);
  assert.ok(second.wifeSalary > first.wifeSalary);
});

it("orders tax switch and reversion events chronologically even when input arrays are unsorted", () => {
  const batches: ScenarioActionBatches = { ...base,
    preexisting: { ...base.preexisting,
      husbandGross: toGrossSalary(4000),
      wifeGross: toGrossSalary(3000) },
    taxClassSwitches: [
      { switchId: toSwitchId("SWITCH-LATER"),
        effectiveSimulationMonth: toSimulationMonth(6),
        effectiveCalendarMonth: toCalendarMonth(6),
        effectiveCalendarYear: toFullCalendarYear(2026),
        targetHusbandTaxClass: TaxClass.IV,
        targetWifeTaxClass: TaxClass.IV,
        targetUseTaxFactor: true,
        targetTaxFactor: toTaxFactor(0),
        revertSimulationMonth: toSimulationMonth(9),
        statutoryReason: "Later" },
      { switchId: toSwitchId("SWITCH-EARLIER"),
        effectiveSimulationMonth: toSimulationMonth(3),
        effectiveCalendarMonth: toCalendarMonth(3),
        effectiveCalendarYear: toFullCalendarYear(2026),
        targetHusbandTaxClass: TaxClass.V,
        targetWifeTaxClass: TaxClass.III,
        revertSimulationMonth: toSimulationMonth(6),
        statutoryReason: "Earlier" },
    ] };
  assert.equal(evaluateIncomeMonth(batches, at(5)).wifeClass, TaxClass.III);
  assert.equal(evaluateIncomeMonth(batches, at(6)).wifeClass, TaxClass.IV);
  assert.equal(evaluateIncomeMonth(batches, at(6)).factor, 0);
  assert.equal(evaluateIncomeMonth(batches, at(9)).wifeClass, TaxClass.V);
});

it("freezes maternity pay to the preceding three calendar wages instead of the current class", () => {
  const batches: ScenarioActionBatches = { ...base,
    pregnancies: [pregnancy],
    taxClassSwitches: [
      { switchId: toSwitchId("MATERNITY-SWITCH"),
        effectiveSimulationMonth: toSimulationMonth(10),
        effectiveCalendarMonth: toCalendarMonth(10),
        effectiveCalendarYear: toFullCalendarYear(2026),
        targetHusbandTaxClass: TaxClass.V,
        targetWifeTaxClass: TaxClass.III,
        revertSimulationMonth: toSimulationMonth(12),
        statutoryReason: "Maternity reference" },
    ] };
  const months = buildIncomeSchedule(batches, at(14));
  assert.equal(months[10].mutterschutz, 1932.33); // (1751 + 1751 + 2295) / 3
  assert.equal(months[11].mutterschutz, 1932.33);
  assert.equal(months[12].mutterschutz, 1932.33);
  assert.equal(months[13].wifeSalary, 1182);
});

it("supports internal calendar forecasts beyond the visible 120-month ledger boundary", () => {
  const income = evaluateIncomeMonth(base, at(126));
  assert.equal(income.calendarYearNum, 2036);
  assert.equal(income.calendarMonthNum, 6);
  assert.equal(income.husbandSalary, 3184);
});

it("repeats verified initial gross payroll rather than stale net presets in missing maternity history", () => {
  const batches: ScenarioActionBatches = { ...base,
    preexisting: { ...base.preexisting,
      salaryInputMode: SalaryInputMode.Gross,
      husbandGross: toGrossSalary(5000),
      wifeGross: toGrossSalary(5000),
      wifeInitialTaxClass: TaxClass.I },
    pregnancies: [{ ...pregnancy,
      calculatedDeliverySimulationMonth: toSimulationMonth(2) }] };
  const months = buildIncomeSchedule(batches, at(4));
  assert.equal(months[0].mutterschutz, 3130.09);
  assert.ok(months[0].assumptions.some((message) => message.includes("3 missing maternity-reference")));
});
