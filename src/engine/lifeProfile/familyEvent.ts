import {
  type Brand,
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

export type FamilyPregnancyId = Brand<string, "FamilyPregnancyId">;

export function toFamilyPregnancyId(value: string): FamilyPregnancyId {
  if (!value || value.trim() !== value) {
    throw new TypeError("Pregnancy ID must not be empty or contain surrounding whitespace.");
  }
  return value as FamilyPregnancyId;
}

export interface PregnancyPayload {
  readonly pregnancyId: FamilyPregnancyId;
  readonly expectedDueDate?: LifeDate;
  readonly multipleCount?: number;
  readonly label?: string;
}

export interface ExpectedBirthPayload {
  readonly pregnancyId: FamilyPregnancyId;
  readonly multipleCount?: number;
}

export interface ActualBirthPayload {
  readonly pregnancyId: FamilyPregnancyId;
  readonly childName?: string;
  readonly multipleCount?: number;
}

function collectPregnancyOwners(events: readonly LifeEvent<unknown>[]): Map<FamilyPregnancyId, string> | undefined {
  const owners = new Map<FamilyPregnancyId, string>();
  for (const event of events) {
    if (event.kind === pregnancyStartedModule.kind) {
      const parsed = pregnancyStartedModule.parsePayload(event.payload);
      if (owners.has(parsed.pregnancyId)) {
        return undefined;
      }
      owners.set(parsed.pregnancyId, event.personId);
    }
  }
  return owners;
}

function validateMultipleCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > 6) {
    throw new TypeError("Multiple count must be an integer between 1 and 6.");
  }
  return value;
}

/** Records a pregnancy milestone that expected and actual birth milestones can link to. */
export const pregnancyStartedModule: LifeEventModule<PregnancyPayload> = Object.freeze({
  kind: toLifeEventKind("family.pregnancy"),
  parsePayload(value: unknown): PregnancyPayload {
    if (typeof value !== "object" || value === null || Array.isArray(value)
      || Object.keys(value).some((key) => !["pregnancyId", "expectedDueDate", "multipleCount", "label"].includes(key))
      || !("pregnancyId" in value) || typeof value.pregnancyId !== "string") {
      throw new TypeError("A pregnancy entry needs a pregnancy identifier.");
    }
    const raw = value as Record<string, unknown>;
    if ((raw.expectedDueDate !== undefined && typeof raw.expectedDueDate !== "string")
      || (raw.label !== undefined && (typeof raw.label !== "string" || !raw.label.trim()))) {
      throw new TypeError("Check expected due date and pregnancy label.");
    }
    return Object.freeze({
      pregnancyId: toFamilyPregnancyId(value.pregnancyId),
      ...(typeof raw.expectedDueDate === "string" ? { expectedDueDate: toLifeDate(raw.expectedDueDate) } : {}),
      ...(raw.multipleCount !== undefined ? { multipleCount: validateMultipleCount(raw.multipleCount) } : {}),
      ...(typeof raw.label === "string" ? { label: raw.label.trim() } : {}),
    });
  },
});

/** Records an expected birth milestone linked to an existing pregnancy for the same person. */
export const expectedBirthModule: LifeEventModule<ExpectedBirthPayload> = Object.freeze({
  kind: toLifeEventKind("family.expected-birth"),
  parsePayload(value: unknown): ExpectedBirthPayload {
    if (typeof value !== "object" || value === null || Array.isArray(value)
      || Object.keys(value).some((key) => !["pregnancyId", "multipleCount"].includes(key))
      || !("pregnancyId" in value) || typeof value.pregnancyId !== "string") {
      throw new TypeError("An expected birth milestone needs a linked pregnancy identifier.");
    }
    const raw = value as Record<string, unknown>;
    return Object.freeze({
      pregnancyId: toFamilyPregnancyId(value.pregnancyId),
      ...(raw.multipleCount !== undefined ? { multipleCount: validateMultipleCount(raw.multipleCount) } : {}),
    });
  },
  validateTimeline(events: readonly LifeEvent<unknown>[]): boolean {
    const owners = collectPregnancyOwners(events);
    if (!owners) {
      return false;
    }
    return events.every((event) => event.kind !== expectedBirthModule.kind
      || owners.get(expectedBirthModule.parsePayload(event.payload).pregnancyId) === event.personId);
  },
});

/** Records an actual birth milestone linked to an existing pregnancy (at most one actual birth per pregnancy). */
export const actualBirthModule: LifeEventModule<ActualBirthPayload> = Object.freeze({
  kind: toLifeEventKind("family.actual-birth"),
  parsePayload(value: unknown): ActualBirthPayload {
    if (typeof value !== "object" || value === null || Array.isArray(value)
      || Object.keys(value).some((key) => !["pregnancyId", "childName", "multipleCount"].includes(key))
      || !("pregnancyId" in value) || typeof value.pregnancyId !== "string") {
      throw new TypeError("An actual birth milestone needs a linked pregnancy identifier.");
    }
    const raw = value as Record<string, unknown>;
    if (raw.childName !== undefined && (typeof raw.childName !== "string" || !raw.childName.trim())) {
      throw new TypeError("Child name cannot be blank when provided.");
    }
    return Object.freeze({
      pregnancyId: toFamilyPregnancyId(value.pregnancyId),
      ...(typeof raw.childName === "string" ? { childName: raw.childName.trim() } : {}),
      ...(raw.multipleCount !== undefined ? { multipleCount: validateMultipleCount(raw.multipleCount) } : {}),
    });
  },
  validateTimeline(events: readonly LifeEvent<unknown>[]): boolean {
    const owners = collectPregnancyOwners(events);
    if (!owners) {
      return false;
    }
    const birthed = new Set<FamilyPregnancyId>();
    for (const event of events) {
      if (event.kind !== actualBirthModule.kind) {
        continue;
      }
      const parsed = actualBirthModule.parsePayload(event.payload);
      if (owners.get(parsed.pregnancyId) !== event.personId || birthed.has(parsed.pregnancyId)) {
        return false;
      }
      birthed.add(parsed.pregnancyId);
    }
    return true;
  },
});
