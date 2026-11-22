import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  toCalendarMonth,
  toFullCalendarYear,
  toMonthDuration,
  toSimulationMonth,
} from "#engine/types";
import {
  calendarDateToSimMonth,
  formatForecastPeriodSummary,
  formatRelativePregnancyMonthLabel,
  simMonthToCalendarDate,
  simMonthToIsoDate,
} from "#engine/simulator/calendarNavigation";

describe("calendarNavigation pure helpers", () => {
  it("converts simulation months to exact calendar dates across year boundaries", () => {
    const startYear = toFullCalendarYear(2026);
    const startMonth = toCalendarMonth(1);

    const m1 = simMonthToCalendarDate(toSimulationMonth(1), startYear, startMonth);
    assert.equal(m1.calendarYear, 2026);
    assert.equal(m1.calendarMonth, 1);
    assert.equal(m1.calendarLabel, "01.2026");

    const m17 = simMonthToCalendarDate(toSimulationMonth(17), startYear, startMonth);
    assert.equal(m17.calendarYear, 2027);
    assert.equal(m17.calendarMonth, 5);
    assert.equal(m17.calendarLabel, "05.2027");
  });

  it("converts calendar dates back to simulation months with safe lower bound", () => {
    const startYear = toFullCalendarYear(2026);
    const startMonth = toCalendarMonth(1);

    assert.equal(
      calendarDateToSimMonth(toFullCalendarYear(2027), toCalendarMonth(5), startYear, startMonth),
      17,
    );
    assert.equal(
      calendarDateToSimMonth(toFullCalendarYear(2025), toCalendarMonth(6), startYear, startMonth),
      1,
    );
  });

  it("formats forecast period summary and ISO dates deterministically", () => {
    const summary = formatForecastPeriodSummary(
      toFullCalendarYear(2026),
      toCalendarMonth(1),
      toMonthDuration(60),
    );
    assert.equal(summary.periodLabel, "01.2026 – 12.2030");
    assert.equal(summary.durationLabel, "60 months");

    const iso = simMonthToIsoDate(
      toSimulationMonth(17),
      toFullCalendarYear(2026),
      toCalendarMonth(1),
      15,
    );
    assert.equal(iso, "2027-05-15");
  });

  it("formats Rule 15 relative pregnancy month labels cleanly", () => {
    const positiveTest = toSimulationMonth(9);
    assert.equal(formatRelativePregnancyMonthLabel(toSimulationMonth(1), positiveTest), "M-8");
    assert.equal(formatRelativePregnancyMonthLabel(toSimulationMonth(8), positiveTest), "M-1");
    assert.equal(formatRelativePregnancyMonthLabel(toSimulationMonth(9), positiveTest), "M1");
    assert.equal(formatRelativePregnancyMonthLabel(toSimulationMonth(17), positiveTest), "M9");
    assert.equal(formatRelativePregnancyMonthLabel(toSimulationMonth(5), null), "M5");
  });
});
