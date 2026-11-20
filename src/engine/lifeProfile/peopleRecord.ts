import {
  type LifePerson,
  toLifeDate,
  toPersonId,
  toPersonRelationship,
} from "#engine/lifeProfile/person";

export const PEOPLE_STORAGE_KEY = "rechner:life-profile:people:v1";

export const PeopleRecordStatus = {
  Missing: "missing",
  Valid: "valid",
  Invalid: "invalid",
  Unsupported: "unsupported",
} as const;
export type PeopleRecordStatus = (typeof PeopleRecordStatus)[keyof typeof PeopleRecordStatus];

export interface PeopleRecord {
  readonly version: 1;
  readonly people: readonly LifePerson[];
}

export interface DecodedPeopleRecord {
  readonly status: PeopleRecordStatus;
  readonly record?: PeopleRecord;
}

function objectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

/** Refuses unknown fields so an older application cannot erase future data on save. */
export function decodePeopleRecord(raw: string | null): DecodedPeopleRecord {
  if (raw === null) {
    return { status: PeopleRecordStatus.Missing };
  }
  try {
    const data: unknown = JSON.parse(raw);
    if (!objectRecord(data) || !Number.isInteger(data.version)) {
      return { status: PeopleRecordStatus.Invalid };
    }
    if (data.version !== 1) {
      return { status: PeopleRecordStatus.Unsupported };
    }
    if (!hasOnlyKeys(data, ["version", "people"])) {
      return { status: PeopleRecordStatus.Unsupported };
    }
    if (!Array.isArray(data.people)) {
      return { status: PeopleRecordStatus.Invalid };
    }
    const people: LifePerson[] = [];
    const ids = new Set<string>();
    for (const person of data.people) {
      if (!objectRecord(person)) {
        return { status: PeopleRecordStatus.Invalid };
      }
      if (!hasOnlyKeys(person, ["id", "name", "birthDate", "relationship"])) {
        return { status: PeopleRecordStatus.Unsupported };
      }
      if (typeof person.id !== "string" || typeof person.name !== "string" || person.name.trim() === ""
        || (person.birthDate !== undefined && typeof person.birthDate !== "string")
        || (person.relationship !== undefined && typeof person.relationship !== "string")) {
        return { status: PeopleRecordStatus.Invalid };
      }
      const id = toPersonId(person.id);
      if (ids.has(id)) {
        return { status: PeopleRecordStatus.Invalid };
      }
      ids.add(id);
      people.push(Object.freeze({
        id,
        name: person.name,
        ...(person.birthDate === undefined ? {} : { birthDate: toLifeDate(person.birthDate) }),
        ...(person.relationship === undefined ? {} : { relationship: toPersonRelationship(person.relationship) }),
      }));
    }
    return {
      status: PeopleRecordStatus.Valid,
      record: Object.freeze({
        version: 1,
        people: Object.freeze(people),
      }),
    };
  }
  catch {
    return { status: PeopleRecordStatus.Invalid };
  }
}
