import {
  type FullCalendarYear,
  type CalendarMonth,
  type EuroAmount,
  toEuroAmount,
  toFullCalendarYear,
  toCalendarMonth,
} from "#engine/types";
import {
  toSourceUrl,
} from "#engine/config/benefitRules";
import profiles from "../../data/benefitIncomeLimits.json" with { type: "json" };

/** Limits are selected by birth date, independently of the payroll provider year. */
export function getCoupleBenefitIncomeLimit(year: FullCalendarYear, month: CalendarMonth) {
  const selected = profiles.map((profile) => ({ ...profile,
    effectiveBirthYear: toFullCalendarYear(profile.effectiveBirthYear),
    effectiveBirthMonth: toCalendarMonth(profile.effectiveBirthMonth) }))
    .filter((profile) => profile.effectiveBirthYear * 12 + profile.effectiveBirthMonth <= year * 12 + month)
    .sort((a, b) => b.effectiveBirthYear - a.effectiveBirthYear || b.effectiveBirthMonth - a.effectiveBirthMonth)[0];
  if (!selected) {
    throw new TypeError("No verified couple income-eligibility profile exists before September 2021.");
  }
  const maximum = toEuroAmount(selected.coupleTaxableIncomeMaximum);
  if (maximum <= 0) {
    throw new TypeError("The household taxable-income maximum must be positive.");
  }
  return Object.freeze({ maximum,
    source: toSourceUrl(selected.source),
    relevantIncomeYear: toFullCalendarYear(year - 1),
    effectiveBirthYear: selected.effectiveBirthYear,
    effectiveBirthMonth: selected.effectiveBirthMonth });
}

export const IncomeEligibilityStatus = {
  Eligible: "ELIGIBLE",
  Ineligible: "INELIGIBLE",
  Unavailable: "UNAVAILABLE",
} as const;
export type IncomeEligibilityStatus = typeof IncomeEligibilityStatus[keyof typeof IncomeEligibilityStatus];

export function toIncomeEligibilityStatus(value: unknown): IncomeEligibilityStatus {
  if (!Object.values(IncomeEligibilityStatus).some((status) => status === value)) {
    throw new TypeError("Invalid income-eligibility status.");
  }
  return value as IncomeEligibilityStatus;
}

/** Equality remains eligible: BEEG excludes income strictly above the configured maximum. */
export function assessCoupleBenefitIncome(year: FullCalendarYear, month: CalendarMonth, taxableIncome?: EuroAmount) {
  const limit = getCoupleBenefitIncomeLimit(year, month);
  return Object.freeze({ ...limit,
    taxableIncome,
    status: taxableIncome === undefined ? IncomeEligibilityStatus.Unavailable
      : taxableIncome > limit.maximum ? IncomeEligibilityStatus.Ineligible : IncomeEligibilityStatus.Eligible });
}
