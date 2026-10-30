import {
  type HouseholdTaxableIncomeInput,
  toEuroAmount,
  toFullCalendarYear,
} from "#engine/types";

/** Optional personal evidence, never an override of the verified tariff or eligibility limit. */
export function parseHouseholdTaxableIncome(value: unknown): readonly HouseholdTaxableIncomeInput[] {
  if (value === undefined) {
    return Object.freeze([]);
  }
  if (!Array.isArray(value)) {
    throw new TypeError("Household taxable-income evidence must be an array of year/income records.");
  }
  const years = new Set<number>();
  return Object.freeze(value.map((entry) => {
    if (!entry || typeof entry !== "object" || typeof entry.calendarYear !== "number" || typeof entry.taxableIncome !== "number") {
      throw new TypeError("Each taxable-income record needs a numeric calendarYear and taxableIncome.");
    }
    const calendarYear = toFullCalendarYear(entry.calendarYear);
    const taxableIncome = toEuroAmount(entry.taxableIncome);
    if (years.has(calendarYear)) {
      throw new TypeError(`Duplicate household taxable-income evidence for ${calendarYear}.`);
    }
    years.add(calendarYear);
    return Object.freeze({ calendarYear,
      taxableIncome });
  }));
}
