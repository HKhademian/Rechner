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
  toSwitchId,
  toPregnancyId,
  toChildIndex,
  toWorkingHours,
  toNetSalary,
  toMonthDuration,
  toRaiseId,
  toPercentageRate,
  toHoursChangeId,
} from "#engine/types";
import {
  assessmentCalendarMonth,
  toAssessmentMonthOrdinal,
} from "#engine/benefits/assessmentHistory";
import {
  buildIncomeSchedule,
} from "#engine/simulator/incomeSchedule";
import {
  projectAllowanceSchedule,
} from "#engine/benefits/allowanceSchedule";
import {
  standardPreexistingConditions,
} from "../../../test/fixture/standardHouseholds.ts";
import {
  createTimelineConventions,
} from "#engine/config/timelineConventions";

const start = assessmentCalendarMonth(toFullCalendarYear(2026), toCalendarMonth(1));
const at = (index: number) => toAssessmentMonthOrdinal(start + index - 1);
const pregnancy: PregnancyAction = { pregnancyId: toPregnancyId("PREG-ASSESSMENT"),
  childIndex: toChildIndex(1),
  positiveTestCalendarMonth: toCalendarMonth(9),
  positiveTestCalendarYear: toFullCalendarYear(2026),
  positiveTestSimulationMonth: toSimulationMonth(9),
  calculatedDeliverySimulationMonth: toSimulationMonth(17),
  motherPostBirthPartTimeHours: toWorkingHours(0),
  motherPostBirthPartTimeClass3Net: toNetSalary(0),
  motherPostBirthPartTimeClass5Net: toNetSalary(0),
  fatherPartnerMonthsCount: toMonthDuration(4) };
const base: ScenarioActionBatches = { scenarioKey: ScenarioId.C,
  preexisting: { ...standardPreexistingConditions,
    salaryInputMode: SalaryInputMode.Gross,
    husbandGross: toGrossSalary(4000),
    wifeGross: toGrossSalary(3000) },
  pregnancies: [pregnancy],
  taxClassSwitches: [],
  salaryRaises: [] };
const switched = (month: number): ScenarioActionBatches => ({ ...base,
  taxClassSwitches: [
    { switchId: toSwitchId("ASSESSMENT-SWITCH"),
      effectiveSimulationMonth: toSimulationMonth(month),
      effectiveCalendarMonth: toCalendarMonth((month - 1) % 12 + 1),
      effectiveCalendarYear: toFullCalendarYear(2026 + Math.floor((month - 1) / 12)),
      targetHusbandTaxClass: TaxClass.V,
      targetWifeTaxClass: TaxClass.III,
      revertSimulationMonth: toSimulationMonth(17),
      statutoryReason: "Assessment test" },
  ] });
const project = (batches: ScenarioActionBatches, end = 48) => projectAllowanceSchedule(
  batches,
  buildIncomeSchedule(batches, at(end)),
  at(end),
);

it("uses actual early/late switch history and independent BEEG net references", () => {
  const early = project(switched(9));
  const late = project(switched(14));
  const mother = (result: typeof early) => result.assessments.find((audit) => audit.parent === TargetPerson.Wife)!;
  assert.equal(mother(early).taxClass, TaxClass.III);
  assert.equal(mother(early).preBirthNet, 2229.17);
  assert.deepEqual(mother(early).selectedMonths, ["M04.2026", "M05.2026", "M06.2026", "M07.2026", "M08.2026", "M09.2026", "M10.2026", "M11.2026", "M12.2026", "M01.2027", "M02.2027", "M03.2027"]);
  assert.equal(mother(late).taxClass, TaxClass.V);
  assert.equal(mother(late).preBirthNet, 1635.17);
  assert.equal(early.months.get(at(19))?.wifeElterngeld, 724.48);
  assert.equal(late.months.get(at(19))?.wifeElterngeld, 531.43);
  assert.equal(mother(project(switched(10))).taxClass, TaxClass.III); // Six/six: latest wins.
});

it("keeps the pre-birth amount fixed after a later salary raise", () => {
  const batches = switched(9);
  const raised = project({ ...batches,
    salaryRaises: [{ raiseId: toRaiseId("POST-BIRTH-RAISE"),
      effectiveSimulationMonth: toSimulationMonth(25),
      effectiveCalendarMonth: toCalendarMonth(1),
      effectiveCalendarYear: toFullCalendarYear(2028),
      targetPerson: TargetPerson.Wife,
      percentageIncrease: toPercentageRate(0.1),
      reason: "Later raise" }] });
  assert.equal(raised.months.get(at(19))?.wifeElterngeld, 724.48);
  assert.equal(raised.months.get(at(26))?.wifeElterngeld, 724.48);
});

it("averages positive earnings across ordinary Plus and partnership claims", () => {
  const batches: ScenarioActionBatches = { ...switched(9),
    pregnancies: [{ ...pregnancy,
      motherPostBirthPartTimeHours: toWorkingHours(24) }],
    workingHoursChanges: [{ changeId: toHoursChangeId("AVERAGE-HOURS"),
      effectiveSimulationMonth: toSimulationMonth(24),
      effectiveCalendarMonth: toCalendarMonth(12),
      effectiveCalendarYear: toFullCalendarYear(2027),
      targetPerson: TargetPerson.Wife,
      weeklyHours: toWorkingHours(32),
      reason: "Increase after five earning months" }] };
  const result = project(batches);
  const audit = result.assessments.find((entry) => entry.parent === TargetPerson.Wife)!;
  // Five months at 1800, eleven at 2400: average gross 2212.50, BEEG social base 2202.85.
  assert.equal(audit.postBirthAverageNet, 1647.39);
  assert.equal(result.months.get(at(19))?.wifeElterngeld, 378.16);
  assert.equal(result.months.get(at(33))?.wifeElterngeld, 378.16);
});

it("does not treat manual payroll take-home as BEEG net without an explicit assumption", () => {
  const manual = { ...base,
    preexisting: { ...standardPreexistingConditions,
      assumeManualNetIsAssessmentNet: false } };
  const unavailable = project(manual);
  assert.equal(unavailable.complete, false);
  assert.match(unavailable.assessments[0].reason ?? "", /explicit manual assessment-net assumption/);
  const assumed = project({ ...manual,
    preexisting: { ...manual.preexisting,
      assumeManualNetIsAssessmentNet: true } });
  assert.equal(assumed.complete, true);
  assert.ok(assumed.assessments.every((audit) => audit.assumptions.some((note) => note.includes("no standardized-net conversion"))));
});

it("excludes actual older-child protected months and preserves the overlap minimum without extra father claims", () => {
  const batches: ScenarioActionBatches = { ...switched(9),
    pregnancies: [
      { ...pregnancy,
        motherPostBirthPartTimeHours: toWorkingHours(24) },
      { ...pregnancy,
        pregnancyId: toPregnancyId("PREG-ASSESSMENT-2"),
        childIndex: toChildIndex(2),
        calculatedDeliverySimulationMonth: toSimulationMonth(31),
        motherPostBirthPartTimeHours: toWorkingHours(24) },
    ] };
  const result = project(batches);
  const second = result.assessments.find((audit) => audit.parent === TargetPerson.Wife && audit.pregnancyId === "PREG-ASSESSMENT-2")!;
  assert.deepEqual(second.selectedMonths, result.assessments.find((audit) => audit.parent === TargetPerson.Wife)!.selectedMonths);
  assert.equal(second.preBirthNet, 2229.17);
  assert.equal(result.months.get(at(30))?.wifeElterngeld, 150);
  assert.equal(result.months.get(at(30))?.husbandElterngeld, 0);
});

it("uses the father's own history and income loss rather than the mother's entitlement", () => {
  const result = project({ ...base,
    workingHoursChanges: [{ changeId: toHoursChangeId("FATHER-REDUCTION"),
      effectiveSimulationMonth: toSimulationMonth(19),
      effectiveCalendarMonth: toCalendarMonth(7),
      effectiveCalendarYear: toFullCalendarYear(2027),
      targetPerson: TargetPerson.Husband,
      weeklyHours: toWorkingHours(16),
      reason: "Half the original 32-hour contract" }] });
  const father = result.assessments.find((audit) => audit.parent === TargetPerson.Husband)!;
  // Independent BMF fixtures: III/4000 -> 207.66 tax; III/2000 -> zero.
  assert.equal(father.preBirthNet, 2849.84);
  assert.equal(father.postBirthAverageNet, 1477.5);
  assert.equal(result.months.get(at(19))?.husbandElterngeld, 840.13);
  assert.notEqual(result.months.get(at(19))?.husbandElterngeld, result.months.get(at(19))?.wifeElterngeld);
});

it("propagates unknown earlier benefit receipt instead of inventing a later eligible window", () => {
  const result = project({ ...base,
    pregnancies: [
      { ...pregnancy,
        calculatedDeliverySimulationMonth: toSimulationMonth(12),
        motherPostBirthPartTimeHours: toWorkingHours(24) },
      { ...pregnancy,
        pregnancyId: toPregnancyId("PREG-UNKNOWN-SECOND"),
        childIndex: toChildIndex(2),
        calculatedDeliverySimulationMonth: toSimulationMonth(23),
        motherPostBirthPartTimeHours: toWorkingHours(24) },
    ] });
  const first = result.assessments.find((audit) => audit.parent === TargetPerson.Wife)!;
  const second = result.assessments.find((audit) => audit.parent === TargetPerson.Wife && audit.pregnancyId === "PREG-UNKNOWN-SECOND")!;
  assert.equal(first.assumedMonths.length, 2);
  assert.equal(first.available, false);
  assert.match(second.reason ?? "", /Earlier benefit receipt is unavailable/);
  assert.equal(second.available, false);
  assert.equal(result.complete, false);
});

it("does not pay a single isolated partnership month", () => {
  const result = project({ ...base,
    pregnancies: [{ ...pregnancy,
      motherPostBirthPartTimeHours: toWorkingHours(24) }],
    workingHoursChanges: [
      { changeId: toHoursChangeId("FATHER-FULL"),
        effectiveSimulationMonth: toSimulationMonth(1),
        effectiveCalendarMonth: toCalendarMonth(1),
        effectiveCalendarYear: toFullCalendarYear(2026),
        targetPerson: TargetPerson.Husband,
        weeklyHours: toWorkingHours(40),
        reason: "Full time" },
      { changeId: toHoursChangeId("FATHER-ONLY-ONE-BONUS"),
        effectiveSimulationMonth: toSimulationMonth(34),
        effectiveCalendarMonth: toCalendarMonth(10),
        effectiveCalendarYear: toFullCalendarYear(2028),
        targetPerson: TargetPerson.Husband,
        weeklyHours: toWorkingHours(32),
        reason: "One remaining bonus month" },
    ] });
  assert.equal(result.months.get(at(34))?.isPartnerschaftsbonus, false);
  assert.equal(result.months.get(at(34))?.husbandElterngeld, 0);
  assert.equal(result.months.get(at(34))?.wifeElterngeld, 0);
});

it("rejects plans exceeding ordinary budgets rather than inventing extra entitlement", () => {
  const conventions = createTimelineConventions({ motherOrdinaryPlusMonths: 24,
    partnershipBonusMonths: 0 });
  const income = buildIncomeSchedule(base, at(48), conventions);
  assert.throws(() => projectAllowanceSchedule(base, income, at(48), conventions), /individual or family budget/);
});
