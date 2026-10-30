import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  setPregnancy1PositiveDate,
  customPregnancies,
  startCalendarYear,
  startCalendarMonth,
  child1BirthMonth,
  prePregnancyPlanningMonths,
  resetToDefaults,
} from "#store/elterngeldStore";
import {
  toPregnancyId,
  toChildIndex,
  toCalendarMonth,
  toFullCalendarYear,
  toSimulationMonth,
  toWorkingHours,
  toNetSalary,
  toMonthDuration,
} from "#engine/types";

it("keeps October 2026 selected in the pregnancy action and delivery baseline", () => {
  resetToDefaults();
  customPregnancies.value = [1, 2].map((child) => ({
    pregnancyId: toPregnancyId(`PREG-CHILD-${child}`),
    childIndex: toChildIndex(child),
    positiveTestCalendarMonth: toCalendarMonth(9),
    positiveTestCalendarYear: toFullCalendarYear(2025 + child),
    positiveTestSimulationMonth: toSimulationMonth(9 + (child - 1) * 12),
    calculatedDeliverySimulationMonth: toSimulationMonth(17 + (child - 1) * 12),
    motherPostBirthPartTimeHours: toWorkingHours(0),
    motherPostBirthPartTimeClass5Net: toNetSalary(0),
    motherPostBirthPartTimeClass3Net: toNetSalary(0),
    fatherPartnerMonthsCount: toMonthDuration(0),
  }));
  const laterPregnancies = customPregnancies.value.slice(1);
  try {
    setPregnancy1PositiveDate(2026, 10);
    const first = customPregnancies.value[0];
    assert.equal(first.positiveTestCalendarMonth, 10);
    assert.equal(first.positiveTestCalendarYear, 2026);
    assert.equal(first.positiveTestSimulationMonth, 10);
    assert.equal(first.calculatedDeliverySimulationMonth, 18);
    assert.equal(child1BirthMonth.value, 18);
    assert.equal(startCalendarYear.value, 2026);
    assert.equal(startCalendarMonth.value, 1);
    assert.equal(prePregnancyPlanningMonths.value, 9);
    assert.deepEqual(customPregnancies.value.slice(1), laterPregnancies);

    setPregnancy1PositiveDate(2027, 2);
    assert.equal(startCalendarYear.value, 2026);
    assert.equal(customPregnancies.value[0].positiveTestSimulationMonth, 14);
    assert.equal(customPregnancies.value[0].positiveTestCalendarMonth, 2);
    assert.equal(customPregnancies.value[0].positiveTestCalendarYear, 2027);
    assert.equal(child1BirthMonth.value, 22);
  }
  finally {
    resetToDefaults();
  }
});
