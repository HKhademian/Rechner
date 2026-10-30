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
  toMonthDuration,
  toWorkingHours,
  toNetSalary,
  toChildIndex,
  toPregnancyId,
  toSwitchId,
  toRaiseId,
  toPercentageRate,
} from "#engine/types";
import {
  runScenarioBatches,
} from "#engine/simulator/timelineGenerator";
import {
  standardPreexistingConditions,
} from "../../../test/fixture/standardHouseholds.ts";

const pregnancy: PregnancyAction = {
  pregnancyId: toPregnancyId("INTEGRATED-ASSESSMENT"),
  childIndex: toChildIndex(1),
  positiveTestSimulationMonth: toSimulationMonth(9),
  positiveTestCalendarMonth: toCalendarMonth(9),
  positiveTestCalendarYear: toFullCalendarYear(2026),
  calculatedDeliverySimulationMonth: toSimulationMonth(17),
  motherPostBirthPartTimeHours: toWorkingHours(0),
  motherPostBirthPartTimeClass3Net: toNetSalary(0),
  motherPostBirthPartTimeClass5Net: toNetSalary(0),
  fatherPartnerMonthsCount: toMonthDuration(4),
};
const base: ScenarioActionBatches = {
  scenarioKey: ScenarioId.C,
  preexisting: { ...standardPreexistingConditions,
    salaryInputMode: SalaryInputMode.Gross,
    husbandGross: toGrossSalary(4000),
    wifeGross: toGrossSalary(3000),
    enable13thSalary: false },
  pregnancies: [pregnancy],
  salaryRaises: [],
  taxClassSwitches: [],
};
const switched = (month: number): ScenarioActionBatches => ({ ...base,
  taxClassSwitches: [{ switchId: toSwitchId("INTEGRATED-SWITCH"),
    effectiveSimulationMonth: toSimulationMonth(month),
    effectiveCalendarMonth: toCalendarMonth((month - 1) % 12 + 1),
    effectiveCalendarYear: toFullCalendarYear(2026 + Math.floor((month - 1) / 12)),
    targetHusbandTaxClass: TaxClass.V,
    targetWifeTaxClass: TaxClass.III,
    revertSimulationMonth: toSimulationMonth(17),
    statutoryReason: "Actual assessment history regression" }] });

it("pays independently worked early/late assessments through the ledger, including a six/six tie", () => {
  // Eligible Apr 2026-Mar 2027. 3000 - 102.50 - 630 - PAP(III:38.33/V:632.33).
  // With zero post-birth income, Plus is half of the rounded 65% Basis result.
  for (const [switchMonth, taxClass, preNet, plus] of [
    [9, TaxClass.III, 2229.17, 724.48],
    [10, TaxClass.III, 2229.17, 724.48],
    [14, TaxClass.V, 1635.17, 531.43],
  ] as const) {
    const result = runScenarioBatches(switched(switchMonth));
    const audit = result.benefitAssessments?.find((item) => item.parent === TargetPerson.Wife);
    assert.equal(audit?.taxClass, taxClass);
    assert.equal(audit?.preBirthNet, preNet);
    assert.equal(audit?.selectedMonths.length, 12);
    assert.equal(result.months[18].wifeElterngeld, plus);
    assert.equal(result.months[18].benefitPayments?.find((payment) => payment.parent === TargetPerson.Wife)?.payment, plus);
    assert.equal(result.benefitsComplete, true);
  }
});

it("finishes the averaging period outside the visible ledger and freezes pre-birth history", () => {
  const batches = switched(9);
  const result = runScenarioBatches({ ...batches,
    preexisting: { ...batches.preexisting,
      simulationDurationMonths: toMonthDuration(20) },
    salaryRaises: [{ raiseId: toRaiseId("LATER-RAISE"),
      effectiveSimulationMonth: toSimulationMonth(25),
      effectiveCalendarMonth: toCalendarMonth(1),
      effectiveCalendarYear: toFullCalendarYear(2028),
      targetPerson: TargetPerson.Wife,
      percentageIncrease: toPercentageRate(0.1),
      reason: "Outside visible horizon" }] });
  assert.equal(result.months.length, 20);
  assert.equal(result.months[18].wifeElterngeld, 724.48);
  const audit = result.benefitAssessments?.find((item) => item.parent === TargetPerson.Wife);
  assert.equal(audit?.preBirthNet, 2229.17);
  assert.equal(audit?.ordinaryClaimMonths.at(-1), "M06.2028");
});

it("labels repeated initial salary/class history and unavailable PAP snapshots", () => {
  const earlyBirth = { ...pregnancy,
    calculatedDeliverySimulationMonth: toSimulationMonth(5),
    positiveTestSimulationMonth: toSimulationMonth(1) };
  const available = runScenarioBatches({ ...base,
    preexisting: { ...base.preexisting,
      startCalendarYear: toFullCalendarYear(2027) },
    pregnancies: [earlyBirth] });
  const audit = available.benefitAssessments?.find((item) => item.parent === TargetPerson.Wife);
  assert.equal(audit?.assumedMonths.length, 9);
  assert.ok(available.assumptions?.some((note) => note.includes("9 missing pre-birth months repeat the initial salary")));
  const unavailable = runScenarioBatches({ ...base,
    pregnancies: [earlyBirth] });
  assert.equal(unavailable.benefitsComplete, false);
  assert.equal(unavailable.months[6].benefitAssessmentAvailable, false);
  assert.ok(unavailable.unavailableReasons?.some((reason) => reason.includes("January")));
});

it("requires explicit manual-net consent at the public timeline boundary", () => {
  const manual = { ...base,
    preexisting: { ...standardPreexistingConditions,
      assumeManualNetIsAssessmentNet: false } };
  const unavailable = runScenarioBatches(manual);
  assert.equal(unavailable.benefitsComplete, false);
  assert.equal(unavailable.months[18].wifeElterngeld, 0);
  const assumed = runScenarioBatches({ ...manual,
    preexisting: { ...manual.preexisting,
      assumeManualNetIsAssessmentNet: true } });
  assert.equal(assumed.benefitsComplete, true);
  assert.ok(assumed.assumptions?.some((note) => note.includes("Explicit assumption")));
});
