import {
  type EuroCents,
  toEuroCents,
} from "#engine/types";
import {
  type LifeDate,
  toLifeDate,
} from "#engine/lifeProfile/person";
import {
  type LifeEventModule,
} from "#engine/lifeProfile/eventModules";
import {
  toLifeEventKind,
} from "#engine/lifeProfile/timeline";

export const ChildcareFacilityKind = {
  Krippe: "krippe",
  Kita: "kita",
  Tagespflege: "tagespflege",
  Grundschule: "grundschule",
  Hort: "hort",
  SecondarySchool: "secondary-school",
} as const;
export type ChildcareFacilityKind = (typeof ChildcareFacilityKind)[keyof typeof ChildcareFacilityKind];

export function toChildcareFacilityKind(value: string): ChildcareFacilityKind {
  if (!Object.values(ChildcareFacilityKind).includes(value as ChildcareFacilityKind)) {
    throw new TypeError("Invalid childcare facility kind.");
  }
  return value as ChildcareFacilityKind;
}

export const ChildcareApplicationStatus = {
  Shortlisted: "shortlisted",
  Applied: "applied",
  Waitlisted: "waitlisted",
  Offered: "offered",
  Enrolled: "enrolled",
  Declined: "declined",
} as const;
export type ChildcareApplicationStatus = (typeof ChildcareApplicationStatus)[keyof typeof ChildcareApplicationStatus];

export function toChildcareApplicationStatus(value: string): ChildcareApplicationStatus {
  if (!Object.values(ChildcareApplicationStatus).includes(value as ChildcareApplicationStatus)) {
    throw new TypeError("Invalid childcare application status.");
  }
  return value as ChildcareApplicationStatus;
}

export interface ChildcarePlanPayload {
  readonly facilityKind: ChildcareFacilityKind;
  readonly providerName: string;
  readonly municipality?: string;
  readonly desiredStartDate?: LifeDate;
  readonly applicationDeadline?: LifeDate;
  readonly enrollmentDeadline?: LifeDate;
  readonly applicationStatus: ChildcareApplicationStatus;
  readonly monthlyFeeCents?: EuroCents;
  readonly monthlyMealCents?: EuroCents;
}

const ALLOWED_KEYS = [
  "facilityKind",
  "providerName",
  "municipality",
  "desiredStartDate",
  "applicationDeadline",
  "enrollmentDeadline",
  "applicationStatus",
  "monthlyFeeCents",
  "monthlyMealCents",
] as const;

function parseOptionalNonNegativeCents(value: unknown, field: string): EuroCents | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${field} must be non-negative integer euro cents.`);
  }
  return toEuroCents(value);
}

/** Records a Krippe, Kita, Tagespflege or school option, application status, deadlines and monthly costs. */
export const childcarePlanModule: LifeEventModule<ChildcarePlanPayload> = Object.freeze({
  kind: toLifeEventKind("childcare.plan"),
  parsePayload(value: unknown): ChildcarePlanPayload {
    if (typeof value !== "object" || value === null || Array.isArray(value)
      || Object.keys(value).some((key) => !(ALLOWED_KEYS as readonly string[]).includes(key))
      || !("facilityKind" in value) || typeof value.facilityKind !== "string"
      || !("providerName" in value) || typeof value.providerName !== "string" || !value.providerName.trim()
      || !("applicationStatus" in value) || typeof value.applicationStatus !== "string") {
      throw new TypeError("A childcare/school option needs a facility kind, provider name and application status.");
    }
    const raw = value as Record<string, unknown>;
    if ((raw.municipality !== undefined && (typeof raw.municipality !== "string" || !raw.municipality.trim()))
      || (raw.desiredStartDate !== undefined && typeof raw.desiredStartDate !== "string")
      || (raw.applicationDeadline !== undefined && typeof raw.applicationDeadline !== "string")
      || (raw.enrollmentDeadline !== undefined && typeof raw.enrollmentDeadline !== "string")) {
      throw new TypeError("Check municipality and YYYY-MM-DD dates for childcare/school option.");
    }
    const monthlyFeeCents = parseOptionalNonNegativeCents(raw.monthlyFeeCents, "monthlyFeeCents");
    const monthlyMealCents = parseOptionalNonNegativeCents(raw.monthlyMealCents, "monthlyMealCents");

    return Object.freeze({
      facilityKind: toChildcareFacilityKind(value.facilityKind),
      providerName: value.providerName.trim(),
      ...(typeof raw.municipality === "string" ? { municipality: raw.municipality.trim() } : {}),
      ...(typeof raw.desiredStartDate === "string" ? { desiredStartDate: toLifeDate(raw.desiredStartDate) } : {}),
      ...(typeof raw.applicationDeadline === "string" ? { applicationDeadline: toLifeDate(raw.applicationDeadline) } : {}),
      ...(typeof raw.enrollmentDeadline === "string" ? { enrollmentDeadline: toLifeDate(raw.enrollmentDeadline) } : {}),
      applicationStatus: toChildcareApplicationStatus(value.applicationStatus),
      ...(monthlyFeeCents !== undefined ? { monthlyFeeCents } : {}),
      ...(monthlyMealCents !== undefined ? { monthlyMealCents } : {}),
    });
  },
});
