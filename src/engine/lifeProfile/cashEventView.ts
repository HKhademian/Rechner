import {
  type CashEventPayload,
  cashEventModule,
} from "#engine/lifeProfile/cashEvent";
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

/** Lists user-entered events; does not assume a complete transaction history or calculate a balance. */
export function cashEventsForMonth(events: readonly LifeEvent<unknown>[], personId: PersonId, month: ReplayMonth, includePlanned: boolean): readonly LifeEvent<CashEventPayload>[] {
  const prefix = `${month.year}-${String(month.month).padStart(2, "0")}`;
  return orderLifeEvents(events.filter((event) => event.kind === cashEventModule.kind && event.personId === personId
    && event.date?.slice(0, 7) === prefix && (includePlanned || event.status === LifeEventStatus.Actual)))
    .map((event) => ({ ...event,
      payload: cashEventModule.parsePayload(event.payload) }));
}
