import {
  type Brand,
} from "#engine/types";
import {
  type LifeDate,
  type PersonId,
} from "#engine/lifeProfile/person";

export type LifeEventId = Brand<string, "LifeEventId">;
export type LifeEventKind = Brand<string, "LifeEventKind">;

export const LifeEventStatus = {
  Actual: "actual",
  Planned: "planned",
} as const;
export type LifeEventStatus = (typeof LifeEventStatus)[keyof typeof LifeEventStatus];

export interface LifeEvent<Payload> {
  readonly id: LifeEventId;
  readonly kind: LifeEventKind;
  readonly personId: PersonId;
  readonly date: LifeDate;
  readonly status: LifeEventStatus;
  readonly payload: Payload;
}

export function toLifeEventId(value: string): LifeEventId {
  if (!value || value.trim() !== value) {
    throw new TypeError("Event ID must not be empty or contain surrounding whitespace.");
  }
  return value as LifeEventId;
}

/** Domain modules own the meanings and payload validation of their event kinds. */
export function toLifeEventKind(value: string): LifeEventKind {
  if (!/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/.test(value)) {
    throw new TypeError("Event kind must be a lowercase domain identifier.");
  }
  return value as LifeEventKind;
}

export function toLifeEventStatus(value: string): LifeEventStatus {
  if (!Object.values(LifeEventStatus).includes(value as LifeEventStatus)) {
    throw new TypeError("Event status must be actual or planned.");
  }
  return value as LifeEventStatus;
}

/** Stable IDs resolve display order for events on the same day without implying domain precedence. */
export function orderLifeEvents<Payload>(events: readonly LifeEvent<Payload>[]): readonly LifeEvent<Payload>[] {
  return [...events].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
