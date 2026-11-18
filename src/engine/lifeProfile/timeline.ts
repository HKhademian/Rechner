import {
  type Brand,
} from "#engine/types";
import {
  type LifeDate,
  type PersonId,
  toLifeDate,
} from "#engine/lifeProfile/person";

export type LifeEventId = Brand<string, "LifeEventId">;
export type LifeEventKind = Brand<string, "LifeEventKind">;
export type PartialLifeDate = Brand<string, "PartialLifeDate">;
export type LifeEventDate = LifeDate | PartialLifeDate;

export const LifeEventStatus = {
  Actual: "actual",
  Planned: "planned",
} as const;
export type LifeEventStatus = (typeof LifeEventStatus)[keyof typeof LifeEventStatus];

export interface LifeEvent<Payload> {
  readonly id: LifeEventId;
  readonly kind: LifeEventKind;
  readonly personId: PersonId;
  readonly date?: LifeEventDate;
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

/** Preserve the precision supplied instead of inventing a day or month. */
export function toLifeEventDate(value: string): LifeEventDate {
  if (/^\d{4}$/.test(value)) {
    toLifeDate(`${value}-01-01`);
    return value as PartialLifeDate;
  }
  if (/^\d{4}-\d{2}$/.test(value)) {
    toLifeDate(`${value}-01`);
    return value as PartialLifeDate;
  }
  return toLifeDate(value);
}

/** Group imprecise dates by their supplied prefix; unknown dates appear last. */
export function orderLifeEvents<Payload>(events: readonly LifeEvent<Payload>[]): readonly LifeEvent<Payload>[] {
  return [...events].sort((a, b) => {
    if (a.date === undefined || b.date === undefined) {
      return a.date === b.date ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.date === undefined ? 1 : -1;
    }
    return a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}
