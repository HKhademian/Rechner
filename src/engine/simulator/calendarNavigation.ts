import {
  type CalendarLabel,
  type CalendarMonth,
  type FullCalendarYear,
  type IsoCalendarDate,
  type MonthDuration,
  type SimulationMonth,
  toCalendarLabel,
  toCalendarMonth,
  toFullCalendarYear,
  toSimulationMonth,
} from "#engine/types";
import {
  buildIsoDate,
} from "#engine/formulas/pure/maternityAndLifeMonthFormulas";

export interface ForecastPeriodSummary {
  readonly startLabel: CalendarLabel;
  readonly endLabel: CalendarLabel;
  readonly periodLabel: string;
  readonly durationLabel: string;
}

export interface SimulationCalendarDate {
  readonly simulationMonth: SimulationMonth;
  readonly calendarMonth: CalendarMonth;
  readonly calendarYear: FullCalendarYear;
  readonly calendarLabel: CalendarLabel;
}

/** Converts a 1-based simulation month index into its exact calendar month, year, and formatted label. */
export function simMonthToCalendarDate(
  simulationMonth: SimulationMonth,
  startYear: FullCalendarYear,
  startMonth: CalendarMonth,
): SimulationCalendarDate {
  const elapsed = startMonth - 1 + (simulationMonth - 1);
  const calendarYear = toFullCalendarYear(startYear + Math.floor(elapsed / 12));
  const calendarMonth = toCalendarMonth(((elapsed % 12) + 12) % 12 + 1);
  return Object.freeze({
    simulationMonth,
    calendarMonth,
    calendarYear,
    calendarLabel: toCalendarLabel(calendarMonth, calendarYear),
  });
}

/** Converts a calendar year/month pair into a 1-based simulation month offset from the plan start (clamped >= 1). */
export function calendarDateToSimMonth(
  calendarYear: FullCalendarYear,
  calendarMonth: CalendarMonth,
  startYear: FullCalendarYear,
  startMonth: CalendarMonth,
): SimulationMonth {
  const diff = (calendarYear - startYear) * 12 + (calendarMonth - startMonth) + 1;
  return toSimulationMonth(Math.max(1, diff));
}

/** Builds an ISO calendar date (`YYYY-MM-DD`) anchored to a simulation month and day-of-month. */
export function simMonthToIsoDate(
  simulationMonth: SimulationMonth,
  startYear: FullCalendarYear,
  startMonth: CalendarMonth,
  day = 1,
): IsoCalendarDate {
  const resolved = simMonthToCalendarDate(simulationMonth, startYear, startMonth);
  return buildIsoDate(resolved.calendarYear, resolved.calendarMonth, day);
}

/** Formats the active forecast date range and duration summary for header metadata. */
export function formatForecastPeriodSummary(
  startYear: FullCalendarYear,
  startMonth: CalendarMonth,
  duration: MonthDuration,
): ForecastPeriodSummary {
  const lastMonth = toSimulationMonth(Math.max(1, duration));
  const startLabel = toCalendarLabel(startMonth, startYear);
  const end = simMonthToCalendarDate(lastMonth, startYear, startMonth);
  return Object.freeze({
    startLabel,
    endLabel: end.calendarLabel,
    periodLabel: `${startLabel} – ${end.calendarLabel}`,
    durationLabel: `${duration} months`,
  });
}

/** Formats a pregnancy-relative month label (`M1` at first positive test, `M-x` prior, `Mx` post) per Rule 15. */
export function formatRelativePregnancyMonthLabel(
  simulationMonth: SimulationMonth,
  firstPositiveTestMonth: SimulationMonth | null,
): string {
  if (firstPositiveTestMonth === null) {
    return `M${simulationMonth}`;
  }
  const offset = simulationMonth - firstPositiveTestMonth;
  if (offset >= 0) {
    return `M${offset + 1}`;
  }
  return `M${offset}`;
}
