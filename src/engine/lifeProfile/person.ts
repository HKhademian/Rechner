import {
  type Brand,
} from "#engine/types";

export type PersonId = Brand<string, "PersonId">;
export type LifeDate = Brand<string, "LifeDate">;
export type CompletedYears = Brand<number, "CompletedYears">;

export interface LifePerson {
  readonly id: PersonId;
  readonly name: string;
  readonly birthDate?: LifeDate;
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
