import {
  type EuroCents,
  toEuroCents,
} from "#engine/types";
import {
  type LifeEventModule,
} from "#engine/lifeProfile/eventModules";
import {
  type LifeEvent,
  toLifeEventKind,
} from "#engine/lifeProfile/timeline";

export const CashDirection = { Inflow: "inflow",
  Outflow: "outflow" } as const;
export type CashDirection = (typeof CashDirection)[keyof typeof CashDirection];
export interface CashEventPayload { readonly title: string;
  readonly direction: CashDirection;
  readonly amount: EuroCents }

/** A user-entered cash event is neither a forecast assumption nor proof of funding. */
export const cashEventModule: LifeEventModule<CashEventPayload> = Object.freeze({
  kind: toLifeEventKind("cash.entry"),
  parsePayload(value: unknown): CashEventPayload {
    if (typeof value !== "object" || value === null || Array.isArray(value)
      || Object.keys(value).some((key) => !["title", "direction", "amount"].includes(key))
      || !("title" in value) || typeof value.title !== "string" || !value.title.trim()
      || !("direction" in value) || (value.direction !== CashDirection.Inflow && value.direction !== CashDirection.Outflow)
      || !("amount" in value) || typeof value.amount !== "number" || !Number.isSafeInteger(value.amount) || value.amount <= 0) {
      throw new TypeError("A cash event needs a title, direction and positive integer cents.");
    }
    return Object.freeze({ title: value.title,
      direction: value.direction,
      amount: toEuroCents(value.amount) });
  },
  validateTimeline(events: readonly LifeEvent<unknown>[]) {
    return events.every((event) => event.kind !== cashEventModule.kind || event.date?.length === 10);
  },
});
