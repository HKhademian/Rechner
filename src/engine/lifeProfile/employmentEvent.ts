import {
  type Brand,
  type GrossSalary,
  type SalaryPeriod,
  type WorkingHours,
  toGrossSalary,
  toSalaryPeriod,
  toWorkingHours,
} from "#engine/types";
import {
  type LifeEventModule,
} from "#engine/lifeProfile/eventModules";
import {
  type LifeEvent,
  toLifeEventKind,
} from "#engine/lifeProfile/timeline";

export type LifeJobId = Brand<string, "LifeJobId">;

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

export function toLifeJobId(value: string): LifeJobId {
  if (!value || value.trim() !== value) {
    throw new TypeError("Job ID must not be empty or contain surrounding whitespace.");
  }
  return value as LifeJobId;
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
    return Object.freeze({ jobId: toLifeJobId(value.jobId),
      employer: value.employer,
      ...(typeof raw.gross === "number" && typeof raw.grossPeriod === "string"
        ? { gross: toGrossSalary(raw.gross),
          grossPeriod: toSalaryPeriod(raw.grossPeriod) } : {}),
      ...(typeof raw.weeklyHours === "number" ? { weeklyHours: toWorkingHours(raw.weeklyHours) } : {}) });
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
    return Object.freeze({ jobId: toLifeJobId(value.jobId),
      ...(typeof raw.gross === "number" && typeof raw.grossPeriod === "string"
        ? { gross: toGrossSalary(raw.gross),
          grossPeriod: toSalaryPeriod(raw.grossPeriod) } : {}),
      ...(typeof raw.weeklyHours === "number" ? { weeklyHours: toWorkingHours(raw.weeklyHours) } : {}) });
  },
  validateTimeline(events: readonly LifeEvent<unknown>[]): boolean {
    const jobs = new Map<LifeJobId, string>();
    for (const event of events) {
      if (event.kind === jobStartedModule.kind) {
        const job = jobStartedModule.parsePayload(event.payload);
        if (jobs.has(job.jobId)) {
          return false;
        }
        jobs.set(job.jobId, event.personId);
      }
    }
    return events.every((event) => event.kind !== jobChangedModule.kind
      || jobs.get(jobChangedModule.parsePayload(event.payload).jobId) === event.personId);
  },
});
