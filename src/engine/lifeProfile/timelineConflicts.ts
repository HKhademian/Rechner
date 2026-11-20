import {
  cashEventModule,
} from "#engine/lifeProfile/cashEvent";
import {
  reconciledPlannedIds,
} from "#engine/lifeProfile/cashReconciliation";
import {
  jobChangedModule,
  jobStartedModule,
} from "#engine/lifeProfile/employmentEvent";
import {
  type PersonId,
} from "#engine/lifeProfile/person";
import {
  residenceMoveModule,
} from "#engine/lifeProfile/residenceEvent";
import {
  type LifeEvent,
  type LifeEventId,
  LifeEventStatus,
} from "#engine/lifeProfile/timeline";

export const TimelineConflictKind = {
  SameDayJobPayConflict: "same-day-job-pay-conflict",
  SameDayJobHoursConflict: "same-day-job-hours-conflict",
  SameDayMoveConflict: "same-day-move-conflict",
  PossibleDuplicateCash: "possible-duplicate-cash",
  IncompleteEventDate: "incomplete-event-date",
} as const;
export type TimelineConflictKind = (typeof TimelineConflictKind)[keyof typeof TimelineConflictKind];

export interface TimelineConflict {
  readonly kind: TimelineConflictKind;
  readonly personId: PersonId;
  readonly eventIds: readonly LifeEventId[];
  readonly summary: string;
  readonly suggestedAction: string;
}

/** Detects conflicting same-day updates, potential unlinked duplicate cash entries, and imprecise dates on timeline events. */
export function detectTimelineConflicts(events: readonly LifeEvent<unknown>[]): readonly TimelineConflict[] {
  const conflicts: TimelineConflict[] = [];
  const settledPlans = reconciledPlannedIds(events);

  // 1. Same-day job pay/hours conflicts on the same jobId
  const jobPayByKey = new Map<string, { readonly personId: PersonId;
    readonly ids: LifeEventId[];
    readonly values: Set<string> }>();
  const jobHoursByKey = new Map<string, { readonly personId: PersonId;
    readonly ids: LifeEventId[];
    readonly values: Set<string> }>();
  // 2. Same-day move conflicts per person
  const movesByKey = new Map<string, { readonly personId: PersonId;
    readonly ids: LifeEventId[];
    readonly locations: Set<string> }>();
  // 3. Potential unlinked duplicate cash entries (same person, date, direction, amount)
  const cashByKey = new Map<string, { readonly personId: PersonId;
    readonly ids: LifeEventId[];
    readonly date: string;
    readonly statuses: Set<LifeEventStatus> }>();

  for (const event of events) {
    if (event.kind === jobStartedModule.kind || event.kind === jobChangedModule.kind) {
      if (!event.date || event.date.length < 10) {
        conflicts.push(Object.freeze({
          kind: TimelineConflictKind.IncompleteEventDate,
          personId: event.personId,
          eventIds: Object.freeze([event.id]),
          summary: `Employment event (${event.date ?? "date unknown"}) does not have an exact day and may make dated pay projections ambiguous.`,
          suggestedAction: "Edit the event to enter an exact date when known.",
        }));
        continue;
      }
      const payload = event.kind === jobStartedModule.kind
        ? jobStartedModule.parsePayload(event.payload)
        : jobChangedModule.parsePayload(event.payload);
      if (payload.gross !== undefined && payload.grossPeriod !== undefined) {
        const key = `${event.personId}|${payload.jobId}|${event.date}`;
        const bucket = jobPayByKey.get(key) ?? { personId: event.personId,
          ids: [],
          values: new Set<string>() };
        bucket.ids.push(event.id);
        bucket.values.add(`${payload.gross}:${payload.grossPeriod}`);
        jobPayByKey.set(key, bucket);
      }
      if (payload.weeklyHours !== undefined) {
        const key = `${event.personId}|${payload.jobId}|${event.date}`;
        const bucket = jobHoursByKey.get(key) ?? { personId: event.personId,
          ids: [],
          values: new Set<string>() };
        bucket.ids.push(event.id);
        bucket.values.add(String(payload.weeklyHours));
        jobHoursByKey.set(key, bucket);
      }
    }
    else if (event.kind === residenceMoveModule.kind) {
      if (!event.date || event.date.length < 10) {
        conflicts.push(Object.freeze({
          kind: TimelineConflictKind.IncompleteEventDate,
          personId: event.personId,
          eventIds: Object.freeze([event.id]),
          summary: `Move event (${event.date ?? "date unknown"}) uses an incomplete date and may make residence periods ambiguous.`,
          suggestedAction: "Edit the move event to enter an exact move date when known.",
        }));
        continue;
      }
      const move = residenceMoveModule.parsePayload(event.payload);
      const key = `${event.personId}|${event.date}`;
      const bucket = movesByKey.get(key) ?? { personId: event.personId,
        ids: [],
        locations: new Set<string>() };
      bucket.ids.push(event.id);
      bucket.locations.add(move.location.trim().toLowerCase());
      movesByKey.set(key, bucket);
    }
    else if (event.kind === cashEventModule.kind && event.date) {
      const cash = cashEventModule.parsePayload(event.payload);
      // Skip already reconciled planned entries and actual entries that already link to a planned entry
      if (settledPlans.has(event.id) || cash.reconcilesEventId !== undefined) {
        continue;
      }
      const key = `${event.personId}|${event.date}|${cash.direction}|${cash.amount}`;
      const bucket = cashByKey.get(key) ?? { personId: event.personId,
        ids: [],
        date: event.date,
        statuses: new Set<LifeEventStatus>() };
      bucket.ids.push(event.id);
      bucket.statuses.add(event.status);
      cashByKey.set(key, bucket);
    }
  }

  for (const [key, bucket] of jobPayByKey.entries()) {
    if (bucket.ids.length > 1 && bucket.values.size > 1) {
      const date = key.split("|")[2];
      conflicts.push(Object.freeze({
        kind: TimelineConflictKind.SameDayJobPayConflict,
        personId: bucket.personId,
        eventIds: Object.freeze(bucket.ids),
        summary: `Conflicting pay rates recorded for the same job on ${date}.`,
        suggestedAction: "Edit or remove one of the conflicting job entries so dated pay can be resolved unambiguously.",
      }));
    }
  }

  for (const [key, bucket] of jobHoursByKey.entries()) {
    if (bucket.ids.length > 1 && bucket.values.size > 1) {
      const date = key.split("|")[2];
      conflicts.push(Object.freeze({
        kind: TimelineConflictKind.SameDayJobHoursConflict,
        personId: bucket.personId,
        eventIds: Object.freeze(bucket.ids),
        summary: `Conflicting weekly hours recorded for the same job on ${date}.`,
        suggestedAction: "Edit or remove one of the conflicting job entries.",
      }));
    }
  }

  for (const [key, bucket] of movesByKey.entries()) {
    if (bucket.ids.length > 1 && bucket.locations.size > 1) {
      const date = key.split("|")[1];
      conflicts.push(Object.freeze({
        kind: TimelineConflictKind.SameDayMoveConflict,
        personId: bucket.personId,
        eventIds: Object.freeze(bucket.ids),
        summary: `Multiple moves to different locations recorded on ${date}.`,
        suggestedAction: "Keep only the effective move for that date or adjust the move dates.",
      }));
    }
  }

  for (const bucket of cashByKey.values()) {
    if (bucket.ids.length > 1) {
      const hasMixedStatus = bucket.statuses.has(LifeEventStatus.Planned) && bucket.statuses.has(LifeEventStatus.Actual);
      conflicts.push(Object.freeze({
        kind: TimelineConflictKind.PossibleDuplicateCash,
        personId: bucket.personId,
        eventIds: Object.freeze(bucket.ids),
        summary: hasMixedStatus
          ? `An unlinked planned and actual cash entry share the exact same date (${bucket.date}) and amount.`
          : `Multiple standalone cash entries share the exact same date (${bucket.date}) and amount.`,
        suggestedAction: hasMixedStatus
          ? "Edit the actual entry and link it via 'Reconciles planned entry' so it is counted once."
          : "Verify whether both entries are distinct transactions or remove the duplicate.",
      }));
    }
  }

  return Object.freeze(conflicts);
}
