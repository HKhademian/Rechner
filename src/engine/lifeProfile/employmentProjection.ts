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
  type LifeEventId,
  LifeEventStatus,
} from "#engine/lifeProfile/timeline";
import {
  type JobLeaveKind,
  type LifeJobId,
  jobChangedModule,
  jobEndedModule,
  jobLeaveModule,
  jobStartedModule,
} from "#engine/lifeProfile/employmentEvent";
import {
  type DatedValue,
  type ProjectedFact,
  ProjectedFactStatus,
  eventDateBounds,
  selectDatedFact,
} from "#engine/lifeProfile/datedFacts";

export {
  ProjectedFactStatus,
} from "#engine/lifeProfile/datedFacts";

export interface GrossRate {
  readonly amount: GrossSalary;
  readonly period: SalaryPeriod;
}

export interface ActiveJobLeave {
  readonly kind: JobLeaveKind;
  readonly eventId: LifeEventId;
  readonly endDate?: LifeDate;
}

export interface JobAtDate {
  readonly jobId: LifeJobId;
  readonly employer: string;
  readonly startEventId: LifeEventId;
  readonly existence: ProjectedFactStatus;
  readonly gross: ProjectedFact<GrossRate>;
  readonly weeklyHours: ProjectedFact<WorkingHours>;
  readonly activeLeave?: ActiveJobLeave;
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
    const startBounds = eventDateBounds(start.date);
    if (startBounds && startBounds[0] > asOf) {
      return [];
    }
    const endEvent = relevant.find((event) => event.kind === jobEndedModule.kind
      && jobEndedModule.parsePayload(event.payload).jobId === job.jobId);
    const endBounds = endEvent ? eventDateBounds(endEvent.date) : undefined;
    if (endEvent && endBounds && endBounds[1] < asOf) {
      return [];
    }
    const endAmbiguous = Boolean(endEvent) && (!endBounds || (endBounds[0] <= asOf && endBounds[1] >= asOf && endBounds[0] !== endBounds[1]));
    const endBeforeStart = Boolean(endEvent && startBounds && endBounds && endBounds[1] < startBounds[0]);

    const changes = relevant.filter((event) => event.kind === jobChangedModule.kind
      && jobChangedModule.parsePayload(event.payload).jobId === job.jobId);
    const inconsistent = endBeforeStart || changes.some((change) => {
      const changeBounds = eventDateBounds(change.date);
      return startBounds && changeBounds && changeBounds[1] < startBounds[0];
    });
    const gross: DatedValue<GrossRate>[] = [];
    const hours: DatedValue<WorkingHours>[] = [];
    if (job.gross !== undefined && job.grossPeriod !== undefined) {
      gross.push({
        event: start,
        value: {
          amount: job.gross,
          period: job.grossPeriod,
        },
      });
    }
    if (job.weeklyHours !== undefined) {
      hours.push({
        event: start,
        value: job.weeklyHours,
      });
    }
    for (const event of changes) {
      const change = jobChangedModule.parsePayload(event.payload);
      if (change.gross !== undefined && change.grossPeriod !== undefined) {
        gross.push({
          event,
          value: {
            amount: change.gross,
            period: change.grossPeriod,
          },
        });
      }
      if (change.weeklyHours !== undefined) {
        hours.push({
          event,
          value: change.weeklyHours,
        });
      }
    }

    const leaves = relevant.filter((event) => event.kind === jobLeaveModule.kind
      && jobLeaveModule.parsePayload(event.payload).jobId === job.jobId);
    let activeLeave: ActiveJobLeave | undefined;
    for (const leaveEvent of leaves) {
      const leaveBounds = eventDateBounds(leaveEvent.date);
      if (!leaveBounds || leaveBounds[1] > asOf) {
        continue;
      }
      const leave = jobLeaveModule.parsePayload(leaveEvent.payload);
      if (!leave.endDate || leave.endDate >= asOf) {
        activeLeave = {
          kind: leave.kind,
          eventId: leaveEvent.id,
          ...(leave.endDate ? { endDate: leave.endDate } : {}),
        };
      }
    }

    const existence = !startBounds || startBounds[1] > asOf || inconsistent || endAmbiguous
      ? ProjectedFactStatus.Ambiguous
      : ProjectedFactStatus.Known;
    return [{
      jobId: job.jobId,
      employer: job.employer,
      startEventId: start.id,
      existence,
      gross: existence === ProjectedFactStatus.Known ? selectDatedFact(gross, asOf) : { status: ProjectedFactStatus.Ambiguous },
      weeklyHours: existence === ProjectedFactStatus.Known ? selectDatedFact(hours, asOf) : { status: ProjectedFactStatus.Ambiguous },
      ...(activeLeave ? { activeLeave } : {}),
    }];
  });
}
