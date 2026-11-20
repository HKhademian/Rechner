import {
  type EuroCents,
  toEuroCents,
} from "#engine/types";
import {
  type LifeEventModule,
} from "#engine/lifeProfile/eventModules";
import {
  type LifeEvent,
  type LifeEventId,
  LifeEventStatus,
  toLifeEventId,
  toLifeEventKind,
} from "#engine/lifeProfile/timeline";

export const CashDirection = {
  Inflow: "inflow",
  Outflow: "outflow",
} as const;
export type CashDirection = (typeof CashDirection)[keyof typeof CashDirection];

export function toCashDirection(value: string): CashDirection {
  if (!Object.values(CashDirection).includes(value as CashDirection)) {
    throw new TypeError("Cash direction must be inflow or outflow.");
  }
  return value as CashDirection;
}

export interface CashEventPayload {
  readonly title: string;
  readonly direction: CashDirection;
  readonly amount: EuroCents;
  /** Optional link from an actual cash transaction to the planned cash entry it settles. */
  readonly reconcilesEventId?: LifeEventId;
}

/** A user-entered cash event is neither a forecast assumption nor proof of funding. */
export const cashEventModule: LifeEventModule<CashEventPayload> = Object.freeze({
  kind: toLifeEventKind("cash.entry"),
  parsePayload(value: unknown): CashEventPayload {
    if (typeof value !== "object" || value === null || Array.isArray(value)
      || Object.keys(value).some((key) => !["title", "direction", "amount", "reconcilesEventId"].includes(key))
      || !("title" in value) || typeof value.title !== "string" || !value.title.trim()
      || !("direction" in value) || typeof value.direction !== "string"
      || !("amount" in value) || typeof value.amount !== "number" || !Number.isSafeInteger(value.amount) || value.amount <= 0) {
      throw new TypeError("A cash event needs a title, direction and positive integer cents.");
    }
    const raw = value as Record<string, unknown>;
    if (raw.reconcilesEventId !== undefined && typeof raw.reconcilesEventId !== "string") {
      throw new TypeError("Reconciled event ID must be a valid event identifier.");
    }
    return Object.freeze({
      title: value.title,
      direction: toCashDirection(value.direction),
      amount: toEuroCents(value.amount),
      ...(typeof raw.reconcilesEventId === "string" ? { reconcilesEventId: toLifeEventId(raw.reconcilesEventId) } : {}),
    });
  },
  validateTimeline(events: readonly LifeEvent<unknown>[]): boolean {
    const cashEvents = new Map<LifeEventId, { readonly event: LifeEvent<unknown>;
      readonly payload: CashEventPayload }>();
    for (const event of events) {
      if (event.kind !== cashEventModule.kind) {
        continue;
      }
      if (event.date?.length !== 10) {
        return false;
      }
      cashEvents.set(event.id, {
        event,
        payload: cashEventModule.parsePayload(event.payload),
      });
    }
    const claimedPlannedIds = new Set<LifeEventId>();
    for (const { event, payload } of cashEvents.values()) {
      if (payload.reconcilesEventId === undefined) {
        continue;
      }
      if (event.status !== LifeEventStatus.Actual || payload.reconcilesEventId === event.id) {
        return false;
      }
      const planned = cashEvents.get(payload.reconcilesEventId);
      if (!planned || planned.event.status !== LifeEventStatus.Planned
        || planned.event.personId !== event.personId
        || claimedPlannedIds.has(planned.event.id)) {
        return false;
      }
      claimedPlannedIds.add(planned.event.id);
    }
    return true;
  },
});
