import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  PersonRelationship,
  toPersonRelationship,
} from "#engine/lifeProfile/person";
import {
  createScopedStateStore,
} from "#engine/storage/scopedStateStore";

export interface StandaloneFamilyMember {
  readonly id: string;
  readonly name: string;
  readonly relationship: PersonRelationship;
  readonly birthDate: string;
}

export interface FamilyMilestonesState {
  readonly asOfDate: string;
  readonly members: readonly StandaloneFamilyMember[];
  readonly hasPregnancyOrBirth: boolean;
  readonly milestoneStage: "expected" | "actual";
  readonly birthOrDueDate: string;
  readonly multipleCount: number;
  readonly childName: string;
  readonly primaryAnnualGrossEur: number;
  readonly partnerAnnualGrossEur: number;
}

const DEFAULT_STATE: FamilyMilestonesState = {
  asOfDate: "2026-04-01",
  members: [
    {
      id: "member-self",
      name: "Parent A",
      relationship: PersonRelationship.Self,
      birthDate: "1992-05-14",
    },
    {
      id: "member-partner",
      name: "Parent B",
      relationship: PersonRelationship.Partner,
      birthDate: "1993-09-22",
    },
    {
      id: "member-child-1",
      name: "First Child",
      relationship: PersonRelationship.Child,
      birthDate: "2023-07-10",
    },
  ],
  hasPregnancyOrBirth: true,
  milestoneStage: "expected",
  birthOrDueDate: "2026-10-15",
  multipleCount: 1,
  childName: "",
  primaryAnnualGrossEur: 68000,
  partnerAnnualGrossEur: 52000,
};

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}

function parseMember(raw: unknown, index: number): StandaloneFamilyMember | undefined {
  if (typeof raw !== "object" || raw === null) {
    return undefined;
  }
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === "string" && obj.name.trim() ? obj.name.trim() : `Member ${index + 1}`;
  let relationship: PersonRelationship = PersonRelationship.Other;
  if (typeof obj.relationship === "string") {
    try {
      relationship = toPersonRelationship(obj.relationship);
    }
    catch {
      relationship = PersonRelationship.Other;
    }
  }
  return {
    id: typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : `member-${index + 1}`,
    name,
    relationship,
    birthDate: isIsoDate(obj.birthDate) ? obj.birthDate : "",
  };
}

function parseState(raw: unknown): FamilyMilestonesState {
  if (typeof raw !== "object" || raw === null) {
    return DEFAULT_STATE;
  }
  const obj = raw as Record<string, unknown>;
  const members = Array.isArray(obj.members)
    ? obj.members.map(parseMember).filter((item): item is StandaloneFamilyMember => item !== undefined)
    : DEFAULT_STATE.members;

  return {
    asOfDate: isIsoDate(obj.asOfDate) ? obj.asOfDate : DEFAULT_STATE.asOfDate,
    members: members.length > 0 ? members : DEFAULT_STATE.members,
    hasPregnancyOrBirth: typeof obj.hasPregnancyOrBirth === "boolean" ? obj.hasPregnancyOrBirth : DEFAULT_STATE.hasPregnancyOrBirth,
    milestoneStage: obj.milestoneStage === "actual" ? "actual" : "expected",
    birthOrDueDate: isIsoDate(obj.birthOrDueDate) ? obj.birthOrDueDate : DEFAULT_STATE.birthOrDueDate,
    multipleCount: clampInt(obj.multipleCount, 1, 6, DEFAULT_STATE.multipleCount),
    childName: typeof obj.childName === "string" ? obj.childName : DEFAULT_STATE.childName,
    primaryAnnualGrossEur: clampInt(obj.primaryAnnualGrossEur, 0, 500000, DEFAULT_STATE.primaryAnnualGrossEur),
    partnerAnnualGrossEur: clampInt(obj.partnerAnnualGrossEur, 0, 500000, DEFAULT_STATE.partnerAnnualGrossEur),
  };
}

export const familyMilestonesStore = createScopedStateStore<FamilyMilestonesState>({
  appId: AppId.FamilyMilestones,
  field: "state",
  createDefault: () => DEFAULT_STATE,
  parse: parseState,
});
