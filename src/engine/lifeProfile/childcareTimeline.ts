import {
  type EuroCents,
  toEuroCents,
} from "#engine/types";
import {
  type LifeDate,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
  type LifeEventId,
  LifeEventStatus,
} from "#engine/lifeProfile/timeline";
import {
  type ChildcarePlanPayload,
  ChildcareApplicationStatus,
  childcarePlanModule,
} from "#engine/lifeProfile/childcareEvent";

export const ChildcareDeadlineKind = {
  Application: "application",
  Enrollment: "enrollment",
  DesiredStart: "desired-start",
} as const;
export type ChildcareDeadlineKind = (typeof ChildcareDeadlineKind)[keyof typeof ChildcareDeadlineKind];

export interface ChildcareDeadlineItem {
  readonly eventId: LifeEventId;
  readonly providerName: string;
  readonly kind: ChildcareDeadlineKind;
  readonly date: LifeDate;
  readonly daysUntil: number;
  readonly overdue: boolean;
}

export interface ChildcareOptionSummary {
  readonly eventId: LifeEventId;
  readonly payload: ChildcarePlanPayload;
  readonly totalMonthlyCents: EuroCents;
  readonly annualTotalCents: EuroCents;
}

export interface ChildcareTimelineSummary {
  readonly options: readonly ChildcareOptionSummary[];
  readonly deadlines: readonly ChildcareDeadlineItem[];
  readonly enrolledMonthlyTotalCents: EuroCents;
  readonly enrolledAnnualTotalCents: EuroCents;
  readonly minShortlistedMonthlyCents?: EuroCents;
  readonly maxShortlistedMonthlyCents?: EuroCents;
}

function dayDiff(from: LifeDate, to: LifeDate): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

/** Aggregates recorded Kita, Krippe and school options, deadlines and monthly/annual costs. */
export function summarizeChildcareTimeline(input: {
  readonly events: readonly LifeEvent<unknown>[];
  readonly asOf: LifeDate;
  readonly includePlanned: boolean;
}): ChildcareTimelineSummary {
  const relevant = input.events.filter((event) => event.kind === childcarePlanModule.kind
    && (input.includePlanned || event.status === LifeEventStatus.Actual));

  const options: ChildcareOptionSummary[] = [];
  const deadlines: ChildcareDeadlineItem[] = [];
  let enrolledMonthly = 0;
  const candidateMonthlyCosts: number[] = [];

  for (const event of relevant) {
    const payload = childcarePlanModule.parsePayload(event.payload);
    const monthly = (payload.monthlyFeeCents ?? 0) + (payload.monthlyMealCents ?? 0);
    const totalMonthlyCents = toEuroCents(monthly);
    const annualTotalCents = toEuroCents(monthly * 12);

    options.push(Object.freeze({
      eventId: event.id,
      payload,
      totalMonthlyCents,
      annualTotalCents,
    }));

    if (payload.applicationStatus === ChildcareApplicationStatus.Enrolled) {
      enrolledMonthly += monthly;
    }
    else if (payload.applicationStatus !== ChildcareApplicationStatus.Declined && monthly > 0) {
      candidateMonthlyCosts.push(monthly);
    }

    if (payload.applicationDeadline && payload.applicationStatus === ChildcareApplicationStatus.Shortlisted) {
      const daysUntil = dayDiff(input.asOf, payload.applicationDeadline);
      deadlines.push(Object.freeze({
        eventId: event.id,
        providerName: payload.providerName,
        kind: ChildcareDeadlineKind.Application,
        date: payload.applicationDeadline,
        daysUntil,
        overdue: daysUntil < 0,
      }));
    }
    if (payload.enrollmentDeadline && payload.applicationStatus !== ChildcareApplicationStatus.Enrolled
      && payload.applicationStatus !== ChildcareApplicationStatus.Declined) {
      const daysUntil = dayDiff(input.asOf, payload.enrollmentDeadline);
      deadlines.push(Object.freeze({
        eventId: event.id,
        providerName: payload.providerName,
        kind: ChildcareDeadlineKind.Enrollment,
        date: payload.enrollmentDeadline,
        daysUntil,
        overdue: daysUntil < 0,
      }));
    }
    if (payload.desiredStartDate && payload.applicationStatus !== ChildcareApplicationStatus.Declined) {
      const daysUntil = dayDiff(input.asOf, payload.desiredStartDate);
      deadlines.push(Object.freeze({
        eventId: event.id,
        providerName: payload.providerName,
        kind: ChildcareDeadlineKind.DesiredStart,
        date: payload.desiredStartDate,
        daysUntil,
        overdue: daysUntil < 0,
      }));
    }
  }

  deadlines.sort((left, right) => left.daysUntil - right.daysUntil || left.providerName.localeCompare(right.providerName));

  return Object.freeze({
    options: Object.freeze(options),
    deadlines: Object.freeze(deadlines),
    enrolledMonthlyTotalCents: toEuroCents(enrolledMonthly),
    enrolledAnnualTotalCents: toEuroCents(enrolledMonthly * 12),
    ...(candidateMonthlyCosts.length > 0
      ? {
        minShortlistedMonthlyCents: toEuroCents(Math.min(...candidateMonthlyCosts)),
        maxShortlistedMonthlyCents: toEuroCents(Math.max(...candidateMonthlyCosts)),
      }
      : {}),
  });
}
