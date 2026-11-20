import {
  type Brand,
  type EuroCents,
  toEuroCents,
} from "#engine/types";
import {
  type CashEventPayload,
} from "#engine/lifeProfile/cashEvent";
import {
  projectCashFlow,
} from "#engine/lifeProfile/cashFlowProjection";
import {
  type CashScenario,
} from "#engine/lifeProfile/cashScenarioRecord";
import {
  ProjectedFactStatus,
} from "#engine/lifeProfile/datedFacts";
import {
  type ReplayMonth,
  toReplayMonth,
} from "#engine/lifeProfile/monthlyReplay";
import {
  type LifeDate,
} from "#engine/lifeProfile/person";
import {
  type RecordedLifeMonth,
} from "#engine/lifeProfile/recordedLifeMonths";
import {
  type LifeEvent,
  LifeEventStatus,
} from "#engine/lifeProfile/timeline";

export type MonthHorizon = Brand<number, "MonthHorizon">;

export const MAX_MONTHLY_VIEW_HORIZON = 60;

export function toMonthHorizon(value: number): MonthHorizon {
  if (!Number.isInteger(value) || value < 1 || value > MAX_MONTHLY_VIEW_HORIZON) {
    throw new TypeError(`Monthly view horizon must be an integer between 1 and ${MAX_MONTHLY_VIEW_HORIZON}.`);
  }
  return value as MonthHorizon;
}

export const MonthTimelinePhase = {
  History: "history",
  Current: "current",
  Forecast: "forecast",
} as const;
export type MonthTimelinePhase = (typeof MonthTimelinePhase)[keyof typeof MonthTimelinePhase];

export function toMonthTimelinePhase(value: string): MonthTimelinePhase {
  if (!Object.values(MonthTimelinePhase).includes(value as MonthTimelinePhase)) {
    throw new TypeError("Invalid monthly timeline phase.");
  }
  return value as MonthTimelinePhase;
}

export const MonthUncertaintyFlag = {
  AmbiguousEmployment: "ambiguous-employment",
  AmbiguousResidence: "ambiguous-residence",
  IncludesPlannedCash: "includes-planned-cash",
  MissingCashOpening: "missing-cash-opening",
} as const;
export type MonthUncertaintyFlag = (typeof MonthUncertaintyFlag)[keyof typeof MonthUncertaintyFlag];

export interface ReplayWindow {
  readonly start: ReplayMonth;
  readonly through: ReplayMonth;
  readonly monthCount: MonthHorizon;
  readonly months: readonly ReplayMonth[];
}

function monthOrdinal(month: ReplayMonth): number {
  return month.year * 12 + month.month - 1;
}

function fromOrdinal(index: number): ReplayMonth {
  return toReplayMonth(Math.floor(index / 12), index % 12 + 1);
}

/** Builds a validated inclusive calendar-month window from a start month and horizon count. */
export function buildReplayWindow(start: ReplayMonth, monthCount: MonthHorizon): ReplayWindow {
  const first = monthOrdinal(start);
  const months = Array.from({ length: monthCount }, (_, index) => fromOrdinal(first + index));
  return Object.freeze({
    start,
    through: months[months.length - 1],
    monthCount,
    months: Object.freeze(months),
  });
}

/** Builds a validated inclusive calendar-month window from explicit start and end months. */
export function buildReplayWindowFromBounds(start: ReplayMonth, through: ReplayMonth): ReplayWindow {
  const count = monthOrdinal(through) - monthOrdinal(start) + 1;
  return buildReplayWindow(start, toMonthHorizon(count));
}

/** Classifies a replay month relative to a reference calendar date without inventing sub-month precision. */
export function classifyMonthPhase(month: ReplayMonth, referenceDate: LifeDate): MonthTimelinePhase {
  const refYear = Number(referenceDate.slice(0, 4));
  const refMonth = Number(referenceDate.slice(5, 7));
  const currentOrdinal = monthOrdinal(toReplayMonth(refYear, refMonth));
  const targetOrdinal = monthOrdinal(month);
  if (targetOrdinal < currentOrdinal) {
    return MonthTimelinePhase.History;
  }
  if (targetOrdinal === currentOrdinal) {
    return MonthTimelinePhase.Current;
  }
  return MonthTimelinePhase.Forecast;
}

/** Finds the last point index (including opening point 0) that belongs to recorded history or current month. */
export function historyBoundaryPointIndex(
  months: readonly ReplayMonth[],
  referenceDate: LifeDate,
): number {
  let boundary = 0;
  for (let index = 0; index < months.length; index += 1) {
    const phase = classifyMonthPhase(months[index], referenceDate);
    if (phase === MonthTimelinePhase.History || phase === MonthTimelinePhase.Current) {
      boundary = index + 1;
    }
  }
  return boundary;
}

/** Collects explicit uncertainty flags for a single monthly snapshot so incomplete data stays visible. */
export function assessMonthUncertainties(input: {
  readonly state: RecordedLifeMonth;
  readonly activeCashEvents: readonly LifeEvent<CashEventPayload>[];
  readonly hasUnknownBalance?: boolean;
}): readonly MonthUncertaintyFlag[] {
  const flags: MonthUncertaintyFlag[] = [];
  const ambiguousJob = input.state.jobs.some((job) => job.existence === ProjectedFactStatus.Ambiguous
    || job.gross.status === ProjectedFactStatus.Ambiguous
    || job.weeklyHours.status === ProjectedFactStatus.Ambiguous);
  if (ambiguousJob) {
    flags.push(MonthUncertaintyFlag.AmbiguousEmployment);
  }
  if (input.state.residence.status === ProjectedFactStatus.Ambiguous) {
    flags.push(MonthUncertaintyFlag.AmbiguousResidence);
  }
  if (input.activeCashEvents.some((entry) => entry.status === LifeEventStatus.Planned)) {
    flags.push(MonthUncertaintyFlag.IncludesPlannedCash);
  }
  if (input.hasUnknownBalance === true) {
    flags.push(MonthUncertaintyFlag.MissingCashOpening);
  }
  return Object.freeze(flags);
}

export interface ComparedScenarioSeries {
  readonly id: CashScenario["id"];
  readonly name: string;
  readonly opening: EuroCents;
  readonly closingByMonth: readonly (EuroCents | undefined)[];
  readonly finalDeltaVsFirst?: EuroCents;
}

export interface MultiScenarioComparison {
  readonly window: ReplayWindow;
  readonly series: readonly ComparedScenarioSeries[];
}

/** Projects and compares two or more named recurring cash scenarios across the same month window. */
export function compareNamedCashScenarios(
  scenarios: readonly CashScenario[],
  start: ReplayMonth,
  monthCount: MonthHorizon,
): MultiScenarioComparison {
  const window = buildReplayWindow(start, monthCount);
  const rawSeries = scenarios.map((scenario) => {
    const rows = projectCashFlow(window.start, window.start, window.through, scenario.opening, {
      inflow: scenario.inflow,
      expense: scenario.expense,
    });
    return {
      id: scenario.id,
      name: scenario.name,
      opening: scenario.opening,
      closingByMonth: Object.freeze(rows.map(({ state }) => state.closing)),
    };
  });
  const baselineFinal = rawSeries[0]?.closingByMonth[rawSeries[0].closingByMonth.length - 1];
  const series = rawSeries.map((entry, index) => {
    const finalBalance = entry.closingByMonth[entry.closingByMonth.length - 1];
    let finalDeltaVsFirst: EuroCents | undefined;
    if (index > 0 && baselineFinal !== undefined && finalBalance !== undefined) {
      const diff = BigInt(finalBalance) - BigInt(baselineFinal);
      if (diff <= BigInt(Number.MAX_SAFE_INTEGER) && diff >= BigInt(Number.MIN_SAFE_INTEGER)) {
        finalDeltaVsFirst = toEuroCents(Number(diff));
      }
    }
    return Object.freeze({
      ...entry,
      ...(finalDeltaVsFirst === undefined ? {} : { finalDeltaVsFirst }),
    });
  });
  return Object.freeze({
    window,
    series: Object.freeze(series),
  });
}
