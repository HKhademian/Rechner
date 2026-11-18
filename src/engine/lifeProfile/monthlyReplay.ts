import {
  type CalendarMonth,
  type FullCalendarYear,
  type MonthId,
  toCalendarMonth,
  toFullCalendarYear,
  toMonthId,
} from "#engine/types";

export interface ReplayMonth {
  readonly year: FullCalendarYear;
  readonly month: CalendarMonth;
  readonly id: MonthId;
}

export interface MonthlySnapshot<State> {
  readonly month: ReplayMonth;
  readonly state: State;
}

export interface MonthlyReplayInput<State, Event, Scenario> {
  readonly origin: ReplayMonth;
  readonly viewStart: ReplayMonth;
  readonly through: ReplayMonth;
  readonly openingState: State;
  readonly events: readonly Event[];
  readonly scenario: Scenario;
  /** Domain-owned pure step; returned states must not mutate earlier states. */
  readonly advance: (state: State, month: ReplayMonth, events: readonly Event[], scenario: Scenario) => State;
}

export function toReplayMonth(year: number, month: number): ReplayMonth {
  return Object.freeze({ year: toFullCalendarYear(year),
    month: toCalendarMonth(month),
    id: toMonthId(month, year) });
}

function ordinal(month: ReplayMonth): number {
  return month.year * 12 + month.month - 1;
}

/** Replays from the explicit opening month even when the visible range starts later. */
export function replayMonthly<State, Event, Scenario>(input: MonthlyReplayInput<State, Event, Scenario>): readonly MonthlySnapshot<State>[] {
  const origin = ordinal(input.origin);
  const viewStart = ordinal(input.viewStart);
  const through = ordinal(input.through);
  if (origin > viewStart || viewStart > through) {
    throw new TypeError("The view must lie within the replay range.");
  }
  const snapshots: MonthlySnapshot<State>[] = [];
  let state = input.openingState;
  for (let cursor = origin; cursor <= through; cursor++) {
    const month = toReplayMonth(Math.floor(cursor / 12), cursor % 12 + 1);
    state = input.advance(state, month, input.events, input.scenario);
    if (cursor >= viewStart) {
      snapshots.push(Object.freeze({ month,
        state }));
    }
  }
  return Object.freeze(snapshots);
}
