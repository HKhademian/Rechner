import {
  type CashEventPayload,
  cashEventModule,
} from "#engine/lifeProfile/cashEvent";
import {
  reconciledPlannedIds,
  reconcilingActualByPlannedId,
} from "#engine/lifeProfile/cashReconciliation";
import {
  type PersonId,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
  LifeEventStatus,
  orderLifeEvents,
} from "#engine/lifeProfile/timeline";
import {
  type ReplayMonth,
} from "#engine/lifeProfile/monthlyReplay";

export interface ReconciledPlannedCashEntry {
  readonly planned: LifeEvent<CashEventPayload>;
  readonly actual: LifeEvent<CashEventPayload>;
}

/** Lists all user-entered cash events in a month, including planned entries later reconciled by an actual entry. */
export function rawCashEventsForMonth(
  events: readonly LifeEvent<unknown>[],
  personId: PersonId,
  month: ReplayMonth,
): readonly LifeEvent<CashEventPayload>[] {
  const prefix = `${month.year}-${String(month.month).padStart(2, "0")}`;
  return orderLifeEvents(events.filter((event) => event.kind === cashEventModule.kind
    && event.personId === personId
    && event.date?.slice(0, 7) === prefix))
    .map((event) => ({
      ...event,
      payload: cashEventModule.parsePayload(event.payload),
    }));
}

/** Lists active user-entered cash events for a month; excludes planned entries settled by a linked actual entry so transactions are counted once. */
export function cashEventsForMonth(
  events: readonly LifeEvent<unknown>[],
  personId: PersonId,
  month: ReplayMonth,
  includePlanned: boolean,
): readonly LifeEvent<CashEventPayload>[] {
  const settled = reconciledPlannedIds(events, personId);
  return rawCashEventsForMonth(events, personId, month).filter((event) => {
    if (event.status === LifeEventStatus.Actual) {
      return true;
    }
    return includePlanned && !settled.has(event.id);
  });
}

/** Lists planned cash entries dated in the selected month that have been reconciled by a linked actual entry. */
export function reconciledPlannedCashEventsForMonth(
  events: readonly LifeEvent<unknown>[],
  personId: PersonId,
  month: ReplayMonth,
): readonly ReconciledPlannedCashEntry[] {
  const settledBy = reconcilingActualByPlannedId(events, personId);
  return rawCashEventsForMonth(events, personId, month)
    .filter((event) => event.status === LifeEventStatus.Planned && settledBy.has(event.id))
    .map((planned) => ({
      planned,
      actual: settledBy.get(planned.id)!,
    }));
}
