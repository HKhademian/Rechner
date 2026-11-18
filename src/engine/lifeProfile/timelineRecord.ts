import {
  type LifeEventModule,
} from "#engine/lifeProfile/eventModules";
import {
  type LifeEvent,
  type LifeEventKind,
  toLifeEventId,
  toLifeEventKind,
  toLifeEventStatus,
} from "#engine/lifeProfile/timeline";
import {
  toLifeDate,
  toPersonId,
} from "#engine/lifeProfile/person";

export const TIMELINE_STORAGE_KEY = "rechner:life-profile:timeline:v1";
export const TimelineRecordStatus = {
  Missing: "missing",
  Valid: "valid",
  Invalid: "invalid",
  Unsupported: "unsupported",
} as const;
export type TimelineRecordStatus = (typeof TimelineRecordStatus)[keyof typeof TimelineRecordStatus];

export interface TimelineRecord {
  readonly version: 1;
  readonly events: readonly LifeEvent<unknown>[];
}

export interface DecodedTimelineRecord {
  readonly status: TimelineRecordStatus;
  readonly record?: TimelineRecord;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function decodeTimelineRecord(
  raw: string | null,
  modules: ReadonlyMap<LifeEventKind, LifeEventModule<unknown>>,
): DecodedTimelineRecord {
  if (raw === null) {
    return { status: TimelineRecordStatus.Missing };
  }
  try {
    const data: unknown = JSON.parse(raw);
    if (!isObject(data) || !Number.isInteger(data.version)) {
      return { status: TimelineRecordStatus.Invalid };
    }
    if (data.version !== 1 || Object.keys(data).some((key) => key !== "version" && key !== "events")) {
      return { status: TimelineRecordStatus.Unsupported };
    }
    if (!Array.isArray(data.events)) {
      return { status: TimelineRecordStatus.Invalid };
    }
    const events: LifeEvent<unknown>[] = [];
    const ids = new Set<string>();
    for (const event of data.events) {
      if (!isObject(event)) {
        return { status: TimelineRecordStatus.Invalid };
      }
      if (Object.keys(event).some((key) => !["id", "kind", "personId", "date", "status", "payload"].includes(key))) {
        return { status: TimelineRecordStatus.Unsupported };
      }
      if (typeof event.id !== "string" || typeof event.kind !== "string" || typeof event.personId !== "string"
        || typeof event.date !== "string" || typeof event.status !== "string") {
        return { status: TimelineRecordStatus.Invalid };
      }
      const id = toLifeEventId(event.id);
      const kind = toLifeEventKind(event.kind);
      const module = modules.get(kind);
      if (!module) {
        return { status: TimelineRecordStatus.Unsupported };
      }
      if (ids.has(id)) {
        return { status: TimelineRecordStatus.Invalid };
      }
      ids.add(id);
      events.push(Object.freeze({ id,
        kind,
        personId: toPersonId(event.personId),
        date: toLifeDate(event.date),
        status: toLifeEventStatus(event.status),
        payload: module.parsePayload(event.payload) }));
    }
    return { status: TimelineRecordStatus.Valid,
      record: Object.freeze({ version: 1,
        events: Object.freeze(events) }) };
  }
  catch {
    return { status: TimelineRecordStatus.Invalid };
  }
}
