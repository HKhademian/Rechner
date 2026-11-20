import {
  type Brand,
  type EuroCents,
  toEuroCents,
} from "#engine/types";
import {
  type PersonId,
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
  orderLifeEvents,
} from "#engine/lifeProfile/timeline";
import {
  type CashEventPayload,
  cashEventModule,
} from "#engine/lifeProfile/cashEvent";
import {
  createLifeEventRegistry,
} from "#engine/lifeProfile/eventModules";
import {
  decodeTimelineRecord,
  TimelineRecordStatus,
} from "#engine/lifeProfile/timelineRecord";
import {
  type ReplayMonth,
  toReplayMonth,
} from "#engine/lifeProfile/monthlyReplay";
import {
  rawCashEventsForMonth,
} from "#engine/lifeProfile/cashEventView";
import {
  reconciledPlannedByActualId,
  reconcilingActualByPlannedId,
} from "#engine/lifeProfile/cashReconciliation";

export const EVENT_PROJECTION_STORAGE_KEY = "rechner:life-profile:event-projections:v1";
export const EventProjectionStatus = { Missing: "missing",
  Valid: "valid",
  Invalid: "invalid",
  Unsupported: "unsupported" } as const;
export type EventProjectionStatus = (typeof EventProjectionStatus)[keyof typeof EventProjectionStatus];
export type EventProjectionId = Brand<string, "EventProjectionId">;
export interface EventProjection {
  readonly id: EventProjectionId;
  readonly name: string;
  readonly personId: PersonId;
  readonly origin: string;
  readonly opening: EuroCents;
  readonly includePlanned: boolean;
  /** Captures relevant sources at save time for change detection, not as current facts. */
  readonly sources: readonly LifeEvent<CashEventPayload>[];
}
export interface EventProjectionRecord { readonly version: 1;
  readonly projections: readonly EventProjection[] }
export interface DecodedEventProjections { readonly status: EventProjectionStatus;
  readonly record?: EventProjectionRecord }
export function toEventProjectionId(value: string): EventProjectionId {
  if (!value || value.trim() !== value) {
    throw new TypeError("Invalid projection ID.");
  }
  return value as EventProjectionId;
}
export function projectionMonths(origin: string): readonly ReplayMonth[] {
  if (!/^\d{4}-\d{2}$/.test(origin)) {
    throw new TypeError("Invalid projection month.");
  }
  const first = toReplayMonth(Number(origin.slice(0, 4)), Number(origin.slice(5)));
  const start = first.year * 12 + first.month - 1;
  return Array.from({ length: 6 }, (_, index) => toReplayMonth(Math.floor((start + index) / 12), (start + index) % 12 + 1));
}
export function eventProjectionSources(events: readonly LifeEvent<unknown>[], personId: PersonId, origin: string): readonly LifeEvent<CashEventPayload>[] {
  const inWindow = projectionMonths(origin).flatMap((month) => rawCashEventsForMonth(events, personId, month));
  const plannedByActual = reconciledPlannedByActualId(events, personId);
  const actualByPlanned = reconcilingActualByPlannedId(events, personId);
  const byId = new Map<LifeEvent<CashEventPayload>["id"], LifeEvent<CashEventPayload>>();
  for (const entry of inWindow) {
    byId.set(entry.id, entry);
    const linkedPlanned = plannedByActual.get(entry.id);
    if (linkedPlanned) {
      byId.set(linkedPlanned.id, linkedPlanned);
    }
    const linkedActual = actualByPlanned.get(entry.id);
    if (linkedActual) {
      byId.set(linkedActual.id, linkedActual);
    }
  }
  return orderLifeEvents([...byId.values()]);
}
export function eventProjectionChangeDetails(saved: EventProjection, current: readonly LifeEvent<unknown>[]) {
  const now = eventProjectionSources(current, saved.personId, saved.origin);
  const before = new Map(saved.sources.map((event) => [event.id, event]));
  const after = new Map(now.map((event) => [event.id, event]));
  return { added: now.filter((event) => !before.has(event.id)),
    changed: now.filter((event) => before.has(event.id) && JSON.stringify(before.get(event.id)) !== JSON.stringify(event)).map((event) => ({ before: before.get(event.id)!,
      after: event })),
    removed: saved.sources.filter((event) => !after.has(event.id)) };
}
export function describeEventChanges(saved: EventProjection, current: readonly LifeEvent<unknown>[]): { readonly added: number;
  readonly changed: number;
  readonly removed: number } {
  const details = eventProjectionChangeDetails(saved, current);
  return { added: details.added.length,
    changed: details.changed.length,
    removed: details.removed.length };
}
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function only(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}
const cashRegistry = createLifeEventRegistry([cashEventModule]);
export function decodeEventProjections(raw: string | null): DecodedEventProjections {
  if (raw === null) {
    return { status: EventProjectionStatus.Missing };
  }
  try {
    const data: unknown = JSON.parse(raw);
    if (!object(data) || !Number.isInteger(data.version)) {
      return { status: EventProjectionStatus.Invalid };
    }
    if (data.version !== 1 || !only(data, ["version", "projections"])) {
      return { status: EventProjectionStatus.Unsupported };
    }
    if (!Array.isArray(data.projections)) {
      return { status: EventProjectionStatus.Invalid };
    }
    const projections: EventProjection[] = [];
    const ids = new Set<string>();
    for (const item of data.projections) {
      if (!object(item)) {
        return { status: EventProjectionStatus.Invalid };
      }
      if (!only(item, ["id", "name", "personId", "origin", "opening", "includePlanned", "sources"])) {
        return { status: EventProjectionStatus.Unsupported };
      }
      if (typeof item.id !== "string" || typeof item.name !== "string" || !item.name.trim() || item.name !== item.name.trim()
        || typeof item.personId !== "string" || typeof item.origin !== "string" || typeof item.includePlanned !== "boolean"
        || typeof item.opening !== "number" || !Number.isSafeInteger(item.opening) || !Array.isArray(item.sources)) {
        return { status: EventProjectionStatus.Invalid };
      }
      const id = toEventProjectionId(item.id), personId = toPersonId(item.personId);
      if (ids.has(id)) {
        return { status: EventProjectionStatus.Invalid };
      }
      ids.add(id);
      const months = projectionMonths(item.origin);
      const parsed = decodeTimelineRecord(JSON.stringify({ version: 2,
        events: item.sources }), cashRegistry);
      if (parsed.status === TimelineRecordStatus.Unsupported) {
        return { status: EventProjectionStatus.Unsupported };
      }
      if (parsed.status !== TimelineRecordStatus.Valid || !parsed.record) {
        return { status: EventProjectionStatus.Invalid };
      }
      const scoped = eventProjectionSources(parsed.record.events, personId, item.origin);
      if (scoped.length !== item.sources.length || !months.length) {
        return { status: EventProjectionStatus.Invalid };
      }
      projections.push({ id,
        name: item.name,
        personId,
        origin: item.origin,
        opening: toEuroCents(item.opening),
        includePlanned: item.includePlanned,
        sources: orderLifeEvents(scoped) });
    }
    return { status: EventProjectionStatus.Valid,
      record: { version: 1,
        projections } };
  }
  catch {
    return { status: EventProjectionStatus.Invalid };
  }
}
