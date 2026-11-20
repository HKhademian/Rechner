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

export const ResidencePermitKind = {
  EuBlueCard: "eu-blue-card",
  SkilledWorker: "skilled-worker",
  Student: "student",
  FamilyReunion: "family-reunion",
  OpportunityCard: "opportunity-card",
  PermanentResidency: "permanent-residency",
  Other: "other",
} as const;
export type ResidencePermitKind = (typeof ResidencePermitKind)[keyof typeof ResidencePermitKind];

export function toResidencePermitKind(value: string): ResidencePermitKind {
  if (!Object.values(ResidencePermitKind).includes(value as ResidencePermitKind)) {
    throw new TypeError("Invalid residence permit kind.");
  }
  return value as ResidencePermitKind;
}

export const ApplicationTarget = {
  PermitRenewal: "permit-renewal",
  PermanentResidency: "permanent-residency",
  Citizenship: "citizenship",
  Visa: "visa",
} as const;
export type ApplicationTarget = (typeof ApplicationTarget)[keyof typeof ApplicationTarget];

export function toApplicationTarget(value: string): ApplicationTarget {
  if (!Object.values(ApplicationTarget).includes(value as ApplicationTarget)) {
    throw new TypeError("Invalid application target.");
  }
  return value as ApplicationTarget;
}

export const ApplicationMilestoneStage = {
  Preparing: "preparing",
  Submitted: "submitted",
  AppointmentBooked: "appointment-booked",
  Approved: "approved",
  Rejected: "rejected",
} as const;
export type ApplicationMilestoneStage = (typeof ApplicationMilestoneStage)[keyof typeof ApplicationMilestoneStage];

export function toApplicationMilestoneStage(value: string): ApplicationMilestoneStage {
  if (!Object.values(ApplicationMilestoneStage).includes(value as ApplicationMilestoneStage)) {
    throw new TypeError("Invalid application milestone stage.");
  }
  return value as ApplicationMilestoneStage;
}

export interface ResidencePermitPayload {
  readonly permitKind: ResidencePermitKind;
  readonly issueDate?: LifeDate;
  readonly expiryDate?: LifeDate;
  readonly countryCode?: string;
  readonly label?: string;
}

export interface ResidenceInterruptionPayload {
  readonly days: number;
  readonly reason: string;
  readonly returnDate?: LifeDate;
}

export interface ResidenceMilestonePayload {
  readonly target: ApplicationTarget;
  readonly stage: ApplicationMilestoneStage;
  readonly title: string;
}

/** Records a residence permit period with optional issue and expiry dates. */
export const residencePermitModule: LifeEventModule<ResidencePermitPayload> = Object.freeze({
  kind: toLifeEventKind("residence.permit"),
  parsePayload(value: unknown): ResidencePermitPayload {
    if (typeof value !== "object" || value === null || Array.isArray(value)
      || Object.keys(value).some((key) => !["permitKind", "issueDate", "expiryDate", "countryCode", "label"].includes(key))
      || !("permitKind" in value) || typeof value.permitKind !== "string") {
      throw new TypeError("A residence permit needs a valid permit kind.");
    }
    const raw = value as Record<string, unknown>;
    if ((raw.issueDate !== undefined && typeof raw.issueDate !== "string")
      || (raw.expiryDate !== undefined && typeof raw.expiryDate !== "string")
      || (raw.countryCode !== undefined && (typeof raw.countryCode !== "string" || !/^[A-Z]{2}$/.test(raw.countryCode)))
      || (raw.label !== undefined && (typeof raw.label !== "string" || !raw.label.trim()))) {
      throw new TypeError("Check permit dates, ISO country code and label.");
    }
    const issueDate = typeof raw.issueDate === "string" ? toLifeDate(raw.issueDate) : undefined;
    const expiryDate = typeof raw.expiryDate === "string" ? toLifeDate(raw.expiryDate) : undefined;
    if (issueDate && expiryDate && expiryDate < issueDate) {
      throw new TypeError("Permit expiry date cannot be earlier than issue date.");
    }
    return Object.freeze({
      permitKind: toResidencePermitKind(value.permitKind),
      ...(issueDate ? { issueDate } : {}),
      ...(expiryDate ? { expiryDate } : {}),
      ...(typeof raw.countryCode === "string" ? { countryCode: raw.countryCode } : {}),
      ...(typeof raw.label === "string" ? { label: raw.label.trim() } : {}),
    });
  },
});

/** Records an absence or interruption in residence that may affect continuity checks. */
export const residenceInterruptionModule: LifeEventModule<ResidenceInterruptionPayload> = Object.freeze({
  kind: toLifeEventKind("residence.interruption"),
  parsePayload(value: unknown): ResidenceInterruptionPayload {
    if (typeof value !== "object" || value === null || Array.isArray(value)
      || Object.keys(value).some((key) => !["days", "reason", "returnDate"].includes(key))
      || !("days" in value) || typeof value.days !== "number" || !Number.isSafeInteger(value.days) || value.days < 1 || value.days > 3650
      || !("reason" in value) || typeof value.reason !== "string" || !value.reason.trim()) {
      throw new TypeError("A residence interruption needs a positive day count and reason.");
    }
    const raw = value as Record<string, unknown>;
    if (raw.returnDate !== undefined && typeof raw.returnDate !== "string") {
      throw new TypeError("Return date must be a valid YYYY-MM-DD date.");
    }
    return Object.freeze({
      days: value.days,
      reason: value.reason.trim(),
      ...(typeof raw.returnDate === "string" ? { returnDate: toLifeDate(raw.returnDate) } : {}),
    });
  },
});

/** Records a visa, permit renewal, permanent residency or citizenship application milestone. */
export const residenceMilestoneModule: LifeEventModule<ResidenceMilestonePayload> = Object.freeze({
  kind: toLifeEventKind("residence.milestone"),
  parsePayload(value: unknown): ResidenceMilestonePayload {
    if (typeof value !== "object" || value === null || Array.isArray(value)
      || Object.keys(value).some((key) => !["target", "stage", "title"].includes(key))
      || !("target" in value) || typeof value.target !== "string"
      || !("stage" in value) || typeof value.stage !== "string"
      || !("title" in value) || typeof value.title !== "string" || !value.title.trim()) {
      throw new TypeError("An application milestone needs a target, stage and title.");
    }
    return Object.freeze({
      target: toApplicationTarget(value.target),
      stage: toApplicationMilestoneStage(value.stage),
      title: value.title.trim(),
    });
  },
});
