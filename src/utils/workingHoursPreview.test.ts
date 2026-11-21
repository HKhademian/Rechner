import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  type ScenarioActionBatches,
  type WorkingHoursChangeAction,
  ElterngeldVariant,
  SalaryInputMode,
  SalaryPeriod,
  ScenarioId,
  TargetPerson,
  TaxClass,
  toCalendarMonth,
  toChildIndex,
  toFullCalendarYear,
  toGrossSalary,
  toHoursChangeId,
  toMonthDuration,
  toNetSalary,
  toPregnancyId,
  toSimulationMonth,
  toSwitchId,
  toWorkingHours,
} from "#engine/types";
import {
  runScenarioBatches,
} from "#engine/simulator/timelineGenerator";
import {
  buildWorkingHoursSchedulePreview,
} from "#utils/workingHoursPreview";
import {
  standardPreexistingConditions,
} from "../../test/fixture/standardHouseholds.ts";

function buildTestScenario(
  motherVariant: ElterngeldVariant,
  motherHours: number,
  effectiveMonth: number,
  targetPerson: TargetPerson = TargetPerson.Wife,
  motherMonths?: number,
  fatherVariant: ElterngeldVariant = ElterngeldVariant.Plus,
  fatherMonths = 4,
): {
  readonly change: WorkingHoursChangeAction;
  readonly batches: ScenarioActionBatches;
} {
  const change: WorkingHoursChangeAction = {
    changeId: toHoursChangeId("TEST-HOURS-1"),
    effectiveSimulationMonth: toSimulationMonth(effectiveMonth),
    effectiveCalendarMonth: toCalendarMonth(((effectiveMonth - 1) % 12) + 1),
    effectiveCalendarYear: toFullCalendarYear(2026 + Math.floor((effectiveMonth - 1) / 12)),
    targetPerson,
    weeklyHours: toWorkingHours(motherHours),
    reason: "Test schedule preview",
  };
  const batches: ScenarioActionBatches = {
    scenarioKey: ScenarioId.C,
    preexisting: {
      ...standardPreexistingConditions,
      salaryInputMode: SalaryInputMode.Gross,
      husbandGross: toGrossSalary(4500),
      wifeGross: toGrossSalary(3000),
      husbandWeeklyHours: toWorkingHours(40),
      wifeWeeklyHours: toWorkingHours(40),
      simulationDurationMonths: toMonthDuration(48),
    },
    pregnancies: [
      {
        pregnancyId: toPregnancyId("PREG-PREVIEW-1"),
        childIndex: toChildIndex(1),
        positiveTestCalendarMonth: toCalendarMonth(9),
        positiveTestCalendarYear: toFullCalendarYear(2026),
        positiveTestSimulationMonth: toSimulationMonth(9),
        calculatedDeliverySimulationMonth: toSimulationMonth(17),
        motherPostBirthPartTimeHours: toWorkingHours(0),
        motherPostBirthPartTimeClass5Net: toNetSalary(0),
        motherPostBirthPartTimeClass3Net: toNetSalary(0),
        fatherPartnerMonthsCount: toMonthDuration(fatherMonths),
        motherAllowanceVariant: motherVariant,
        fatherAllowanceVariant: fatherVariant,
        ...(motherMonths !== undefined
          ? { motherAllowanceMonthsCount: toMonthDuration(motherMonths) }
          : {}),
      },
    ],
    taxClassSwitches: [
      {
        switchId: toSwitchId("SWAP-PREVIEW-1"),
        effectiveSimulationMonth: toSimulationMonth(9),
        effectiveCalendarMonth: toCalendarMonth(9),
        effectiveCalendarYear: toFullCalendarYear(2026),
        targetHusbandTaxClass: TaxClass.V,
        targetWifeTaxClass: TaxClass.III,
        revertSimulationMonth: toSimulationMonth(17),
        statutoryReason: "Optimize pre-birth net",
      },
    ],
    salaryRaises: [],
    workingHoursChanges: [change],
  };
  return {
    change,
    batches,
  };
}

describe("buildWorkingHoursSchedulePreview (Engine-Backed Preview)", () => {
  it("reports exact engine ElterngeldPlus at 0h/week without a hardcoded €900 cap", () => {
    const { change, batches } = buildTestScenario(ElterngeldVariant.Plus, 0, 19);
    const result = runScenarioBatches(batches);
    const preview = buildWorkingHoursSchedulePreview(
      change,
      result.months,
      SalaryPeriod.Monthly,
    );

    assert.equal(preview.inHorizon, true);
    if (!preview.inHorizon) {
      return;
    }
    const ledgerMonth = result.months[18];
    assert.equal(preview.grossAmount, 0);
    assert.equal(preview.netAmount, 0);
    assert.equal(preview.elterngeldLabel, "ElterngeldPlus");
    assert.equal(preview.hasBasisPayment, false);
    assert.equal(preview.hasPlusPayment, true);
    assert.equal(preview.hasOrdinaryPlusPayment, true);
    assert.equal(preview.activeOrdinaryPregnancyId, toPregnancyId("PREG-PREVIEW-1"));
    assert.equal(preview.elterngeldAmount, ledgerMonth.wifeElterngeld);
    assert.equal(preview.elterngeldAmount, 724.48);
    assert.equal(preview.totalInflow, 724.48);
  });

  it("reports exact Basiselterngeld (up to €1,800/mo) at 0h/week when Basis variant is selected", () => {
    const { change, batches } = buildTestScenario(
      ElterngeldVariant.Basis,
      0,
      19,
      TargetPerson.Wife,
      10,
    );
    const highEarnerBatches: ScenarioActionBatches = {
      ...batches,
      preexisting: {
        ...batches.preexisting,
        wifeGross: toGrossSalary(5000),
      },
    };
    const result = runScenarioBatches(highEarnerBatches);
    const preview = buildWorkingHoursSchedulePreview(
      change,
      result.months,
      SalaryPeriod.Monthly,
    );

    assert.equal(preview.inHorizon, true);
    if (!preview.inHorizon) {
      return;
    }
    assert.equal(preview.grossAmount, 0);
    assert.equal(preview.netAmount, 0);
    assert.equal(preview.elterngeldLabel, "Basiselterngeld");
    assert.equal(preview.hasBasisPayment, true);
    assert.equal(preview.hasOrdinaryPlusPayment, false);
    assert.equal(preview.elterngeldAmount, 1800);
    assert.equal(preview.totalInflow, 1800);
  });

  it("reports €0 Elterngeld in pre-birth months instead of inventing a fake allowance", () => {
    const { change, batches } = buildTestScenario(ElterngeldVariant.Plus, 0, 3);
    const result = runScenarioBatches(batches);
    const preview = buildWorkingHoursSchedulePreview(
      change,
      result.months,
      SalaryPeriod.Monthly,
    );

    assert.equal(preview.inHorizon, true);
    if (!preview.inHorizon) {
      return;
    }
    assert.equal(preview.elterngeldAmount, 0);
    assert.equal(preview.elterngeldLabel, "Elterngeld");
    assert.equal(preview.totalInflow, 0);
  });

  it("reports exact Mutterschutz and consistent Yearly scaling across all rows", () => {
    const { change, batches } = buildTestScenario(ElterngeldVariant.Basis, 0, 17, TargetPerson.Wife, 10);
    const result = runScenarioBatches(batches);
    const previewMonthly = buildWorkingHoursSchedulePreview(
      change,
      result.months,
      SalaryPeriod.Monthly,
    );
    const previewYearly = buildWorkingHoursSchedulePreview(
      change,
      result.months,
      SalaryPeriod.Yearly,
    );

    assert.equal(previewMonthly.inHorizon, true);
    assert.equal(previewYearly.inHorizon, true);
    if (!previewMonthly.inHorizon || !previewYearly.inHorizon) {
      return;
    }
    assert.ok(previewMonthly.mutterschutzAmount > 0);
    assert.equal(previewMonthly.elterngeldAmount, 0);
    assert.equal(previewMonthly.totalInflow, previewMonthly.mutterschutzAmount);
    assert.equal(previewYearly.periodSuffix, "/yr");
    assert.equal(
      previewYearly.totalInflow,
      Math.round(previewMonthly.totalInflow * 12 * 100) / 100,
    );
  });

  it("reports exact father Basiselterngeld at 0h/week without hardcoded €0/€150 shortcuts", () => {
    const { change, batches } = buildTestScenario(
      ElterngeldVariant.Basis,
      0,
      19,
      TargetPerson.Husband,
      10,
      ElterngeldVariant.Basis,
      2,
    );
    const result = runScenarioBatches(batches);
    const preview = buildWorkingHoursSchedulePreview(
      change,
      result.months,
      SalaryPeriod.Monthly,
    );

    assert.equal(preview.inHorizon, true);
    if (!preview.inHorizon) {
      return;
    }
    const ledgerMonth = result.months[18];
    assert.equal(preview.grossAmount, 0);
    assert.equal(preview.netAmount, 0);
    assert.equal(preview.elterngeldLabel, "Basiselterngeld");
    assert.equal(preview.elterngeldAmount, ledgerMonth.husbandElterngeld);
    assert.equal(preview.elterngeldAmount, 1513.58);
    assert.equal(preview.totalInflow, 1513.58);
  });

  it("returns inHorizon=false when effective month exceeds active simulation duration", () => {
    const { change, batches } = buildTestScenario(ElterngeldVariant.Plus, 24, 60);
    const result = runScenarioBatches(batches);
    const preview = buildWorkingHoursSchedulePreview(
      change,
      result.months,
      SalaryPeriod.Monthly,
    );

    assert.equal(preview.inHorizon, false);
  });
});
