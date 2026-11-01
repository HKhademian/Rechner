import {
  type GrossSalary,
  type EuroAmount,
  toEuroAmount,
  toFullCalendarYear,
  toPercentageRate,
} from "#engine/types";
import {
  type AgeYears,
  type TaxRules,
  toAgeYears,
} from "#engine/tax/taxRules";
import {
  toSourceUrl,
} from "#engine/config/benefitRules";
import configuration from "../../data/ageReliefRules.json" with { type: "json" };

/** Cohorts are permanent personal limits, not the rate for the current payroll year. */
export function createAgeReliefRules(input: unknown = configuration) {
  if (typeof input !== "object" || input === null || !("source" in input) || !("cohorts" in input) || !Array.isArray(input.cohorts) || input.cohorts.length === 0) {
    throw new TypeError("Age-relief rules need a source and a nonempty cohort table.");
  }
  const source = toSourceUrl(input.source);
  const cohorts = input.cohorts.map((entry: unknown) => {
    if (typeof entry !== "object" || entry === null || !("firstYear" in entry) || !("rate" in entry) || !("maximum" in entry) ||
      typeof entry.firstYear !== "number" || typeof entry.rate !== "number" || typeof entry.maximum !== "number" ||
      !Number.isFinite(entry.rate) || entry.rate < 0 || entry.rate > 1 || !Number.isFinite(entry.maximum) || entry.maximum < 0) {
      throw new TypeError("Invalid age-relief cohort.");
    }
    return Object.freeze({ firstYear: toFullCalendarYear(entry.firstYear),
      rate: toPercentageRate(entry.rate),
      maximum: toEuroAmount(entry.maximum) });
  });
  if (cohorts.some((entry, index) => index > 0 && entry.firstYear !== cohorts[index - 1].firstYear + 1) || cohorts.at(-1)!.rate !== 0 || cohorts.at(-1)!.maximum !== 0) {
    throw new TypeError("Age-relief cohorts must be consecutive and end with a zero allowance.");
  }
  return Object.freeze({ source,
    cohorts: Object.freeze(cohorts) });
}

export const DEFAULT_AGE_RELIEF_RULES = createAgeReliefRules();

/** Ordinary wages only: pension receipts and other income are outside this payroll model. */
export function computeEmploymentAgeRelief(
  gross: GrossSalary,
  ageAtYearStart: AgeYears | undefined,
  rules: TaxRules,
  reliefRules: ReturnType<typeof createAgeReliefRules> = DEFAULT_AGE_RELIEF_RULES,
): EuroAmount {
  if (!Number.isFinite(gross) || gross < 0) {
    throw new TypeError("Age relief needs non-negative finite wages.");
  }
  if (ageAtYearStart === undefined || toAgeYears(ageAtYearStart) < rules.parameters.ageReliefMinimumAge.value) {
    return toEuroAmount(0);
  }
  // Same age-on-1-January convention as PAP AJAHR. Earlier cohorts retain the first limit.
  const firstYear = rules.calendarYear - ageAtYearStart + rules.parameters.ageReliefMinimumAge.value;
  const cohort = reliefRules.cohorts.find((entry) => entry.firstYear >= firstYear) ?? reliefRules.cohorts.at(-1)!;
  return toEuroAmount(Math.min(gross * cohort.rate, cohort.maximum));
}
