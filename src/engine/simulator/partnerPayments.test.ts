import {
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";
import {
  type PregnancyAction,
  TargetPerson,
  ScenarioId,
  toPregnancyId,
  toChildIndex,
  toCalendarMonth,
  toFullCalendarYear,
  toSimulationMonth,
  toWorkingHours,
  toNetSalary,
  toMonthDuration,
  toHoursChangeId,
} from "#engine/types";
import {
  runScenarioBatches,
} from "#engine/simulator/timelineGenerator";
import {
  createBenefitRules,
} from "#engine/config/benefitRules";
import {
  standardPreexistingConditions,
} from "../../../test/fixture/standardHouseholds.ts";

const pregnancy: PregnancyAction = {
  pregnancyId: toPregnancyId("PREG-PARTNER"),
  childIndex: toChildIndex(1),
  positiveTestCalendarMonth: toCalendarMonth(4),
  positiveTestCalendarYear: toFullCalendarYear(2026),
  positiveTestSimulationMonth: toSimulationMonth(4),
  calculatedDeliverySimulationMonth: toSimulationMonth(12),
  motherPostBirthPartTimeHours: toWorkingHours(24),
  motherPostBirthPartTimeClass5Net: toNetSalary(1182),
  motherPostBirthPartTimeClass3Net: toNetSalary(1413),
  fatherPartnerMonthsCount: toMonthDuration(4),
};

describe("Partner payment simulation regressions", () => {
  for (const [hours, requested, expected] of [[40, 4, []], [32, 0, []], [32, 2, [14, 15]], [32, 4, [14, 15, 16, 17]]] as const) {
    it(`pays requested ${requested} ordinary months only with eligible ${hours}h hours`, () => {
      const result = runScenarioBatches({
        scenarioKey: ScenarioId.B,
        preexisting: { ...standardPreexistingConditions,
          husbandWeeklyHours: toWorkingHours(hours) },
        pregnancies: [{ ...pregnancy,
          fatherPartnerMonthsCount: toMonthDuration(requested) }],
        taxClassSwitches: [],
        salaryRaises: [],
      });
      assert.deepEqual(result.months.filter((month) => month.month < 26 && month.husbandElterngeld > 0).map((month) => month.month), expected);
    });
  }

  it("rechecks changed hours and injected benefit configuration", () => {
    const result = runScenarioBatches({
      scenarioKey: ScenarioId.B,
      preexisting: { ...standardPreexistingConditions,
        benefitRules: createBenefitRules({ basisMinimum: 400 }) },
      pregnancies: [pregnancy],
      taxClassSwitches: [],
      salaryRaises: [],
      workingHoursChanges: [{
        changeId: toHoursChangeId("HOURS-PARTNER"),
        effectiveSimulationMonth: toSimulationMonth(15),
        effectiveCalendarMonth: toCalendarMonth(3),
        effectiveCalendarYear: toFullCalendarYear(2027),
        targetPerson: TargetPerson.Husband,
        weeklyHours: toWorkingHours(33),
        reason: "Return above the allowance hours limit",
      }],
    });
    assert.equal(result.months[13].husbandElterngeld, 200);
    assert.equal(result.months[14].husbandElterngeld, 0);
  });
});
