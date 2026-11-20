import {
  type Brand,
  type EuroCents,
  type GrossSalary,
  type SalaryPeriod,
  type WorkingHours,
  toEuroCents,
  toGrossSalary,
  toSalaryPeriod,
  toWorkingHours,
} from "#engine/types";
import {
  type LifeDate,
  toLifeDate,
} from "#engine/lifeProfile/person";
import {
  type LifeEventModule,
} from "#engine/lifeProfile/eventModules";
import {
  type LifeEvent,
  toLifeEventKind,
} from "#engine/lifeProfile/timeline";

export type LifeJobId = Brand<string, "LifeJobId">;

export const JobEndReason = {
  Resignation: "resignation",
  EmployerTermination: "employer-termination",
  MutualAgreement: "mutual-agreement",
  ContractEnd: "contract-end",
  Other: "other",
} as const;
export type JobEndReason = (typeof JobEndReason)[keyof typeof JobEndReason];

export function toJobEndReason(value: string): JobEndReason {
  if (!Object.values(JobEndReason).includes(value as JobEndReason)) {
    throw new TypeError("Invalid job end reason.");
  }
  return value as JobEndReason;
}

export const JobLeaveKind = {
  ParentalLeave: "parental-leave",
  Sabbatical: "sabbatical",
  UnpaidLeave: "unpaid-leave",
  GardenLeave: "garden-leave",
  MedicalLeave: "medical-leave",
} as const;
export type JobLeaveKind = (typeof JobLeaveKind)[keyof typeof JobLeaveKind];

export function toJobLeaveKind(value: string): JobLeaveKind {
  if (!Object.values(JobLeaveKind).includes(value as JobLeaveKind)) {
    throw new TypeError("Invalid job leave kind.");
  }
  return value as JobLeaveKind;
}

export interface JobStartedPayload {
  readonly jobId: LifeJobId;
  readonly employer: string;
  readonly gross?: GrossSalary;
  readonly grossPeriod?: SalaryPeriod;
  readonly weeklyHours?: WorkingHours;
}

export interface JobChangedPayload {
  readonly jobId: LifeJobId;
  readonly gross?: GrossSalary;
  readonly grossPeriod?: SalaryPeriod;
  readonly weeklyHours?: WorkingHours;
}

export interface JobEndedPayload {
  readonly jobId: LifeJobId;
  readonly reason: JobEndReason;
  readonly finalPayCents?: EuroCents;
}

export interface JobLeavePayload {
  readonly jobId: LifeJobId;
  readonly kind: JobLeaveKind;
  readonly endDate?: LifeDate;
}

export function toLifeJobId(value: string): LifeJobId {
  if (!value || value.trim() !== value) {
    throw new TypeError("Job ID must not be empty or contain surrounding whitespace.");
  }
  return value as LifeJobId;
}

function collectJobOwners(events: readonly LifeEvent<unknown>[]): Map<LifeJobId, string> | undefined {
  const jobs = new Map<LifeJobId, string>();
  for (const event of events) {
    if (event.kind === jobStartedModule.kind) {
      const job = jobStartedModule.parsePayload(event.payload);
      if (jobs.has(job.jobId)) {
        return undefined;
      }
      jobs.set(job.jobId, event.personId);
    }
  }
  return jobs;
}

/** Gross is an entered pay rate, not a calculated annual earnings total. */
export const jobStartedModule: LifeEventModule<JobStartedPayload> = Object.freeze({
  kind: toLifeEventKind("employment.started"),
  parsePayload(value: unknown): JobStartedPayload {
    if (typeof value !== "object" || value === null || Array.isArray(value)
      || Object.keys(value).some((key) => !["jobId", "employer", "gross", "grossPeriod", "weeklyHours"].includes(key))
      || !("jobId" in value) || typeof value.jobId !== "string"
      || !("employer" in value) || typeof value.employer !== "string" || !value.employer.trim()) {
      throw new TypeError("A job needs an identifier and employer.");
    }
    const raw = value as Record<string, unknown>;
    if ((raw.gross === undefined) !== (raw.grossPeriod === undefined)
      || (raw.gross !== undefined && typeof raw.gross !== "number")
      || (raw.grossPeriod !== undefined && typeof raw.grossPeriod !== "string")
      || (raw.weeklyHours !== undefined && typeof raw.weeklyHours !== "number")) {
      throw new TypeError("Provide a gross amount and its pay basis together.");
    }
    return Object.freeze({
      jobId: toLifeJobId(value.jobId),
      employer: value.employer,
      ...(typeof raw.gross === "number" && typeof raw.grossPeriod === "string"
        ? {
          gross: toGrossSalary(raw.gross),
          grossPeriod: toSalaryPeriod(raw.grossPeriod),
        }
        : {}),
      ...(typeof raw.weeklyHours === "number" ? { weeklyHours: toWorkingHours(raw.weeklyHours) } : {}),
    });
  },
});

/** Changes identify one existing job; omitted amounts are not zero. */
export const jobChangedModule: LifeEventModule<JobChangedPayload> = Object.freeze({
  kind: toLifeEventKind("employment.changed"),
  parsePayload(value: unknown): JobChangedPayload {
    if (typeof value !== "object" || value === null || Array.isArray(value)
      || Object.keys(value).some((key) => !["jobId", "gross", "grossPeriod", "weeklyHours"].includes(key))
      || !("jobId" in value) || typeof value.jobId !== "string") {
      throw new TypeError("A job change needs a job identifier.");
    }
    const raw = value as Record<string, unknown>;
    if ((raw.gross === undefined) !== (raw.grossPeriod === undefined)
      || (raw.gross !== undefined && typeof raw.gross !== "number")
      || (raw.grossPeriod !== undefined && typeof raw.grossPeriod !== "string")
      || (raw.weeklyHours !== undefined && typeof raw.weeklyHours !== "number")
      || (raw.gross === undefined && raw.weeklyHours === undefined)) {
      throw new TypeError("Enter a pay rate with its basis or working hours.");
    }
    return Object.freeze({
      jobId: toLifeJobId(value.jobId),
      ...(typeof raw.gross === "number" && typeof raw.grossPeriod === "string"
        ? {
          gross: toGrossSalary(raw.gross),
          grossPeriod: toSalaryPeriod(raw.grossPeriod),
        }
        : {}),
      ...(typeof raw.weeklyHours === "number" ? { weeklyHours: toWorkingHours(raw.weeklyHours) } : {}),
    });
  },
  validateTimeline(events: readonly LifeEvent<unknown>[]): boolean {
    const jobs = collectJobOwners(events);
    if (!jobs) {
      return false;
    }
    return events.every((event) => event.kind !== jobChangedModule.kind
      || jobs.get(jobChangedModule.parsePayload(event.payload).jobId) === event.personId);
  },
});

/** Records when an existing job ends (resignation, contract end, mutual agreement, or termination). */
export const jobEndedModule: LifeEventModule<JobEndedPayload> = Object.freeze({
  kind: toLifeEventKind("employment.ended"),
  parsePayload(value: unknown): JobEndedPayload {
    if (typeof value !== "object" || value === null || Array.isArray(value)
      || Object.keys(value).some((key) => !["jobId", "reason", "finalPayCents"].includes(key))
      || !("jobId" in value) || typeof value.jobId !== "string"
      || !("reason" in value) || typeof value.reason !== "string") {
      throw new TypeError("A job ending needs a job identifier and end reason.");
    }
    const raw = value as Record<string, unknown>;
    if (raw.finalPayCents !== undefined && (typeof raw.finalPayCents !== "number" || !Number.isSafeInteger(raw.finalPayCents) || raw.finalPayCents < 0)) {
      throw new TypeError("Final pay must be non-negative integer euro cents.");
    }
    return Object.freeze({
      jobId: toLifeJobId(value.jobId),
      reason: toJobEndReason(value.reason),
      ...(typeof raw.finalPayCents === "number" ? { finalPayCents: toEuroCents(raw.finalPayCents) } : {}),
    });
  },
  validateTimeline(events: readonly LifeEvent<unknown>[]): boolean {
    const jobs = collectJobOwners(events);
    if (!jobs) {
      return false;
    }
    const endedJobs = new Set<LifeJobId>();
    for (const event of events) {
      if (event.kind !== jobEndedModule.kind) {
        continue;
      }
      const ended = jobEndedModule.parsePayload(event.payload);
      if (jobs.get(ended.jobId) !== event.personId || endedJobs.has(ended.jobId)) {
        return false;
      }
      endedJobs.add(ended.jobId);
    }
    return true;
  },
});

/** Records a leave period (parental leave, sabbatical, unpaid, garden, or medical leave) linked to an existing job. */
export const jobLeaveModule: LifeEventModule<JobLeavePayload> = Object.freeze({
  kind: toLifeEventKind("employment.leave"),
  parsePayload(value: unknown): JobLeavePayload {
    if (typeof value !== "object" || value === null || Array.isArray(value)
      || Object.keys(value).some((key) => !["jobId", "kind", "endDate"].includes(key))
      || !("jobId" in value) || typeof value.jobId !== "string"
      || !("kind" in value) || typeof value.kind !== "string") {
      throw new TypeError("A job leave entry needs a job identifier and leave kind.");
    }
    const raw = value as Record<string, unknown>;
    if (raw.endDate !== undefined && typeof raw.endDate !== "string") {
      throw new TypeError("Leave end date must be a valid YYYY-MM-DD date.");
    }
    return Object.freeze({
      jobId: toLifeJobId(value.jobId),
      kind: toJobLeaveKind(value.kind),
      ...(typeof raw.endDate === "string" ? { endDate: toLifeDate(raw.endDate) } : {}),
    });
  },
  validateTimeline(events: readonly LifeEvent<unknown>[]): boolean {
    const jobs = collectJobOwners(events);
    if (!jobs) {
      return false;
    }
    return events.every((event) => event.kind !== jobLeaveModule.kind
      || jobs.get(jobLeaveModule.parsePayload(event.payload).jobId) === event.personId);
  },
});
