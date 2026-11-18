import {
  type EuroCents,
  toEuroCents,
} from "#engine/types";
import {
  type LifeEvent,
} from "#engine/lifeProfile/timeline";
import {
  type PersonId,
} from "#engine/lifeProfile/person";
import {
  type ReplayMonth,
} from "#engine/lifeProfile/monthlyReplay";
import {
  type CashEventPayload,
  CashDirection,
} from "#engine/lifeProfile/cashEvent";
import {
  cashEventsForMonth,
} from "#engine/lifeProfile/cashEventView";
import {
  closingCashBalance,
} from "#engine/lifeProfile/cashFlowFormula";
import {
  type AccumulatorModule,
  replayAccumulator,
  toAccumulatorId,
  toAccumulatorScope,
  toAccumulatorUnit,
} from "#engine/lifeProfile/monthlyAccumulator";

interface EventScenario { readonly personId: PersonId;
  readonly includePlanned: boolean }
export interface CashEventContribution { readonly sources: readonly LifeEvent<CashEventPayload>[];
  readonly inflow: EuroCents;
  readonly expense: EuroCents }

function total(sources: readonly LifeEvent<CashEventPayload>[], direction: CashDirection): EuroCents {
  const value = sources.filter((event) => event.payload.direction === direction).reduce((sum, event) => sum + BigInt(event.payload.amount), 0n);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new TypeError("Cash event total exceeds the supported range.");
  }
  return toEuroCents(Number(value));
}
const eventCashModule: AccumulatorModule<EuroCents, CashEventContribution, LifeEvent<unknown>, EventScenario> = {
  id: toAccumulatorId("cash.event-balance"),
  unit: toAccumulatorUnit("EUR cents"),
  scope: toAccumulatorScope("person-cash-events"),
  contribution: (month, events, scenario) => {
    const sources = cashEventsForMonth(events, scenario.personId, month, scenario.includePlanned);
    return { sources,
      inflow: total(sources, CashDirection.Inflow),
      expense: total(sources, CashDirection.Outflow) };
  },
  advance: (opening, contribution) => opening === undefined || contribution === undefined ? undefined
    : closingCashBalance(opening, contribution.inflow, contribution.expense),
};

/** Replays only user-recorded cash events, from the explicit opening month. */
export function projectCashEvents(
  origin: ReplayMonth,
  viewStart: ReplayMonth,
  through: ReplayMonth,
  opening: EuroCents | undefined,
  events: readonly LifeEvent<unknown>[],
  personId: PersonId,
  includePlanned: boolean,
) {
  return replayAccumulator({ module: eventCashModule,
    origin,
    viewStart,
    through,
    opening,
    events,
    scenario: { personId,
      includePlanned } });
}
