import {
  type GrossSalary,
  type SalaryPeriod,
  type WorkingHours,
} from "#engine/types";
import {
  type LifeDate,
  type PersonId,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
  type LifeEventDate,
  type LifeEventId,
  LifeEventStatus,
} from "#engine/lifeProfile/timeline";
import {
  type LifeJobId,
  jobChangedModule,
  jobStartedModule,
} from "#engine/lifeProfile/employmentEvent";

export const ProjectedFactStatus = { Known: "known",
  Unknown: "unknown",
  Ambiguous: "ambiguous" } as const;
export type ProjectedFactStatus = (typeof ProjectedFactStatus)[keyof typeof ProjectedFactStatus];
export interface ProjectedFact<T> {
  readonly status: ProjectedFactStatus;
  readonly value?: T;
  readonly sourceEventId?: LifeEventId;
}
export interface GrossRate {
  readonly amount: GrossSalary;
  readonly period: SalaryPeriod;
}
export interface JobAtDate {
  readonly jobId: LifeJobId;
  readonly employer: string;
  readonly startEventId: LifeEventId;
  readonly existence: ProjectedFactStatus;
  readonly gross: ProjectedFact<GrossRate>;
  readonly weeklyHours: ProjectedFact<WorkingHours>;
}

interface DatedValue<T> {
  readonly event: LifeEvent<unknown>;
  readonly value: T;
}

/** Earliest and latest possible calendar days; unknown dates have no bounds. */
function bounds(date: LifeEventDate | undefined): readonly [string, string] | undefined {
  if (!date) {
    return undefined;
  }
  if (date.length === 4) {
    return [`${date}-01-01`, `${date}-12-31`];
  }
  if (date.length === 7) {
    const year = Number(date.slice(0, 4));
    const month = Number(date.slice(5, 7));
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return [`${date}-01`, `${date}-${days[month - 1]}`];
  }
  return [date, date];
}

function selectFact<T>(values: readonly DatedValue<T>[], asOf: LifeDate): ProjectedFact<T> {
  const possible = values.filter(({ event }) => {
    const interval = bounds(event.date);
    return !interval || interval[0] <= asOf;
  });
  if (possible.length === 0) {
    return { status: ProjectedFactStatus.Unknown };
  }
  // An unknown or partially elapsed date could still change the answer.
  if (possible.some(({ event }) => {
    const interval = bounds(event.date);
    return !interval || interval[1] > asOf;
  })) {
    return { status: ProjectedFactStatus.Ambiguous };
  }
  const latest = possible.filter((candidate) => !possible.some((other) => {
    if (candidate === other) {
      return false;
    }
    const candidateBounds = bounds(candidate.event.date);
    const otherBounds = bounds(other.event.date);
    return candidateBounds !== undefined && otherBounds !== undefined && otherBounds[0] > candidateBounds[1];
  }));
  if (latest.length !== 1) {
    return { status: ProjectedFactStatus.Ambiguous };
  }
  return { status: ProjectedFactStatus.Known,
    value: latest[0].value,
    sourceEventId: latest[0].event.id };
}

/** Only projects entered facts; it does not calculate annual earnings or payroll. */
export function projectEmploymentAtDate(
  events: readonly LifeEvent<unknown>[],
  personId: PersonId,
  asOf: LifeDate,
  includePlanned: boolean,
): readonly JobAtDate[] {
  const relevant = events.filter((event) => event.personId === personId
    && (includePlanned || event.status === LifeEventStatus.Actual));
  return relevant.filter((event) => event.kind === jobStartedModule.kind).flatMap((start) => {
    const job = jobStartedModule.parsePayload(start.payload);
    const startBounds = bounds(start.date);
    if (startBounds && startBounds[0] > asOf) {
      return [];
    }
    const changes = relevant.filter((event) => event.kind === jobChangedModule.kind
      && jobChangedModule.parsePayload(event.payload).jobId === job.jobId);
    const inconsistent = changes.some((change) => {
      const changeBounds = bounds(change.date);
      return startBounds && changeBounds && changeBounds[1] < startBounds[0];
    });
    const gross: DatedValue<GrossRate>[] = [];
    const hours: DatedValue<WorkingHours>[] = [];
    if (job.gross !== undefined && job.grossPeriod !== undefined) {
      gross.push({ event: start,
        value: { amount: job.gross,
          period: job.grossPeriod } });
    }
    if (job.weeklyHours !== undefined) {
      hours.push({ event: start,
        value: job.weeklyHours });
    }
    for (const event of changes) {
      const change = jobChangedModule.parsePayload(event.payload);
      if (change.gross !== undefined && change.grossPeriod !== undefined) {
        gross.push({ event,
          value: { amount: change.gross,
            period: change.grossPeriod } });
      }
      if (change.weeklyHours !== undefined) {
        hours.push({ event,
          value: change.weeklyHours });
      }
    }
    const existence = !startBounds || startBounds[1] > asOf || inconsistent ? ProjectedFactStatus.Ambiguous : ProjectedFactStatus.Known;
    return [{ jobId: job.jobId,
      employer: job.employer,
      startEventId: start.id,
      existence,
      gross: existence === ProjectedFactStatus.Known ? selectFact(gross, asOf) : { status: ProjectedFactStatus.Ambiguous },
      weeklyHours: existence === ProjectedFactStatus.Known ? selectFact(hours, asOf) : { status: ProjectedFactStatus.Ambiguous } }];
  });
}
