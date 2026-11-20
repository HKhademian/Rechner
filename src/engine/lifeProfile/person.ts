import {
  type Brand,
} from "#engine/types";

export type PersonId = Brand<string, "PersonId">;
export type LifeDate = Brand<string, "LifeDate">;
export type CompletedYears = Brand<number, "CompletedYears">;

export const PersonRelationship = {
  Self: "self",
  Partner: "partner",
  Child: "child",
  Other: "other",
} as const;
export type PersonRelationship = (typeof PersonRelationship)[keyof typeof PersonRelationship];

export function toPersonRelationship(value: string): PersonRelationship {
  if (!Object.values(PersonRelationship).includes(value as PersonRelationship)) {
    throw new TypeError("Person relationship must be self, partner, child, or other.");
  }
  return value as PersonRelationship;
}

export interface LifePerson {
  readonly id: PersonId;
  readonly name: string;
  readonly birthDate?: LifeDate;
  readonly relationship?: PersonRelationship;
}

export interface UpcomingBirthday {
  readonly personId: PersonId;
  readonly name: string;
  readonly relationship?: PersonRelationship;
  readonly nextBirthday: LifeDate;
  readonly daysUntil: number;
  readonly turningAge: CompletedYears;
}

export function toPersonId(value: string): PersonId {
  if (value.trim().length === 0 || value !== value.trim()) {
    throw new TypeError("Person ID must not be empty or contain surrounding whitespace.");
  }
  return value as PersonId;
}

/** Validates a calendar date without timezone-dependent parsing. */
export function toLifeDate(value: string): LifeDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError("Date must use YYYY-MM-DD.");
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) {
    throw new TypeError("Date must be a valid Gregorian calendar date.");
  }
  return value as LifeDate;
}

/** Returns completed calendar years; leap-day birthdays advance on March 1 in non-leap years. */
export function completedYearsOn(birthDate: LifeDate | undefined, onDate: LifeDate): CompletedYears | undefined {
  if (birthDate === undefined || onDate < birthDate) {
    return undefined;
  }
  const years = Number(onDate.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return (years - (onDate.slice(5) < birthDate.slice(5) ? 1 : 0)) as CompletedYears;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function birthdayInYear(birthDate: LifeDate, year: number): LifeDate {
  const monthDay = birthDate.slice(5);
  if (monthDay === "02-29" && !isLeapYear(year)) {
    return toLifeDate(`${String(year).padStart(4, "0")}-03-01`);
  }
  return toLifeDate(`${String(year).padStart(4, "0")}-${monthDay}`);
}

function dayDiff(from: LifeDate, to: LifeDate): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

/** Lists upcoming household birthdays sorted by soonest date within `withinDays` (default 366). */
export function upcomingBirthdays(
  people: readonly LifePerson[],
  asOf: LifeDate,
  withinDays = 366,
): readonly UpcomingBirthday[] {
  const asOfYear = Number(asOf.slice(0, 4));
  const results: UpcomingBirthday[] = [];
  for (const person of people) {
    if (!person.birthDate || person.birthDate > asOf) {
      continue;
    }
    const birthYear = Number(person.birthDate.slice(0, 4));
    let candidate = birthdayInYear(person.birthDate, asOfYear);
    if (candidate < asOf) {
      candidate = birthdayInYear(person.birthDate, asOfYear + 1);
    }
    const daysUntil = dayDiff(asOf, candidate);
    if (daysUntil > withinDays) {
      continue;
    }
    const turningAge = (Number(candidate.slice(0, 4)) - birthYear) as CompletedYears;
    results.push(Object.freeze({
      personId: person.id,
      name: person.name,
      ...(person.relationship ? { relationship: person.relationship } : {}),
      nextBirthday: candidate,
      daysUntil,
      turningAge,
    }));
  }
  results.sort((left, right) => left.daysUntil - right.daysUntil || left.name.localeCompare(right.name));
  return Object.freeze(results);
}
