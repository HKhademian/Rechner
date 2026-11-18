import {
  type LifeDate,
  toLifeDate,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
  type LifeEventDate,
  type LifeEventId,
} from "#engine/lifeProfile/timeline";

export const ProjectedFactStatus = { Known: "known",
  Unknown: "unknown",
  Ambiguous: "ambiguous" } as const;
export type ProjectedFactStatus = (typeof ProjectedFactStatus)[keyof typeof ProjectedFactStatus];
export interface ProjectedFact<T> {
  readonly status: ProjectedFactStatus;
  readonly value?: T;
  readonly sourceEventId?: LifeEventId;
}
export interface DatedValue<T> {
  readonly event: LifeEvent<unknown>;
  readonly value: T;
}

/** Earliest and latest possible calendar days; unknown dates have no bounds. */
export function eventDateBounds(date: LifeEventDate | undefined): readonly [LifeDate, LifeDate] | undefined {
  if (!date) {
    return undefined;
  }
  if (date.length === 4) {
    return [toLifeDate(`${date}-01-01`), toLifeDate(`${date}-12-31`)];
  }
  if (date.length === 7) {
    const year = Number(date.slice(0, 4));
    const month = Number(date.slice(5, 7));
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return [toLifeDate(`${date}-01`), toLifeDate(`${date}-${days[month - 1]}`)];
  }
  const exact = toLifeDate(date);
  return [exact, exact];
}

export function selectDatedFact<T>(values: readonly DatedValue<T>[], asOf: LifeDate): ProjectedFact<T> {
  const possible = values.filter(({ event }) => {
    const interval = eventDateBounds(event.date);
    return !interval || interval[0] <= asOf;
  });
  if (possible.length === 0) {
    return { status: ProjectedFactStatus.Unknown };
  }
  // An unknown or partially elapsed date could still change the answer.
  if (possible.some(({ event }) => {
    const interval = eventDateBounds(event.date);
    return !interval || interval[1] > asOf;
  })) {
    return { status: ProjectedFactStatus.Ambiguous };
  }
  const latest = possible.filter((candidate) => !possible.some((other) => {
    if (candidate === other) {
      return false;
    }
    const candidateBounds = eventDateBounds(candidate.event.date);
    const otherBounds = eventDateBounds(other.event.date);
    return candidateBounds !== undefined && otherBounds !== undefined && otherBounds[0] > candidateBounds[1];
  }));
  if (latest.length !== 1) {
    return { status: ProjectedFactStatus.Ambiguous };
  }
  return { status: ProjectedFactStatus.Known,
    value: latest[0].value,
    sourceEventId: latest[0].event.id };
}

