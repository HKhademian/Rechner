import {
  type Brand,
  type FullCalendarYear,
  toEuroAmount,
  toPercentageRate,
  toChildrenCount,
  toFullCalendarYear,
} from "#engine/types";
import {
  type SourceUrl,
  type SourcedParameter,
  toSourceUrl,
} from "#engine/config/benefitRules";
import profiles from "../../data/taxRules.json" with { type: "json" };

export type AgeYears = Brand<number, "AgeYears">;

export function toAgeYears(value: number): AgeYears {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("Age must be a non-negative whole number of years.");
  }
  return value as AgeYears;
}

function money(value: number) {
  const amount = toEuroAmount(value);
  if (amount < 0) {
    throw new TypeError("A tax rule amount cannot be negative.");
  }
  return amount;
}

function fraction(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError("A tax rule rate must be a decimal fraction between 0 and 1.");
  }
  return toPercentageRate(value);
}

const constructors = {
  basicAllowance: money,
  progression1Ceiling: money,
  progression2Ceiling: money,
  topRateCeiling: money,
  progression1Quadratic: money,
  progression1Linear: money,
  progression2Quadratic: money,
  progression2Linear: money,
  progression2Constant: money,
  topRate: fraction,
  topOffset: money,
  highestRate: fraction,
  highestOffset: money,
  tariffDivisor: money,
  healthCapMonthly: money,
  pensionCapMonthly: money,
  healthEmployeeRate: fraction,
  healthDeductibleFraction: fraction,
  ageReliefMinimumAge: toAgeYears,
  healthSupplementTotalRate: fraction,
  pensionEmployeeRate: fraction,
  unemploymentEmployeeRate: fraction,
  careEmployeeBaseRate: fraction,
  careChildlessSurcharge: fraction,
  careChildDiscount: fraction,
  careMaximumDiscountChildren: toChildrenCount,
  careChildAgeLimit: toAgeYears,
  careChildlessMinimumAge: toAgeYears,
  careSaxonyExtraEmployeeRate: fraction,
  workExpenseAllowance: money,
  specialExpenseAllowance: money,
  singleParentRelief: money,
  singleParentExtraChildRelief: money,
  churchRateBavariaBadenWuerttemberg: fraction,
  churchRateOther: fraction,
  solidarityRate: fraction,
  solidarityMitigationRate: fraction,
  solidarityExemptionSingle: money,
  childAllowanceAnnual: money,
  childBenefitMonthly: money,
} as const;

export type TaxParameters = {
  readonly [Key in keyof typeof constructors]: SourcedParameter<ReturnType<(typeof constructors)[Key]>>;
};

export type TaxPublicationDate = Brand<string, "TaxPublicationDate">;

export function toTaxPublicationDate(value: string): TaxPublicationDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value) {
    throw new TypeError("Invalid PAP publication date.");
  }
  return value as TaxPublicationDate;
}

export interface TaxRules {
  readonly papPublication: { readonly date: TaxPublicationDate;
    readonly source: SourceUrl };
  readonly calendarYear: FullCalendarYear;
  readonly sourceYear: FullCalendarYear;
  readonly effectiveFrom: string;
  readonly projected: boolean;
  readonly parameters: TaxParameters;
}

export const DEFAULT_TAX_YEAR = toFullCalendarYear(Math.max(...Object.keys(profiles).map(Number)));

/** Explicit latest-known-rules projection, never an invented future statutory profile. */
export function createTaxRules(
  calendarYear: FullCalendarYear = DEFAULT_TAX_YEAR,
  overrides: unknown = {},
): TaxRules {
  const requested = toFullCalendarYear(calendarYear);
  const year = Object.keys(profiles).map(Number).filter((value) => value <= requested).sort((a, b) => b - a)[0];
  if (year === undefined) {
    throw new TypeError(`No verified tax rules available for ${requested}.`);
  }
  if (typeof overrides !== "object" || overrides === null || Array.isArray(overrides)) {
    throw new TypeError("Tax parameter overrides must be an object.");
  }
  const input = overrides as Record<string, unknown>;
  for (const key of Object.keys(input)) {
    if (!Object.hasOwn(constructors, key)) {
      throw new TypeError(`Unknown tax parameter: ${key}`);
    }
  }
  const profile = profiles[String(year) as keyof typeof profiles];
  const entries = Object.entries(constructors).map(([key, construct]) => {
    const name = key as keyof typeof constructors;
    const baseline = profile.parameters[name];
    const raw = input[name] === undefined ? baseline.value : input[name];
    if (typeof raw !== "number") {
      throw new TypeError(`Tax parameter ${name} must be a number.`);
    }
    return [name, Object.freeze({
      value: construct(raw),
      label: baseline.label,
      source: toSourceUrl(baseline.source),
      overridden: raw !== baseline.value,
    })];
  });
  const parameters = Object.fromEntries(entries) as TaxParameters;
  if (
    parameters.basicAllowance.value >= parameters.progression1Ceiling.value ||
    parameters.progression1Ceiling.value >= parameters.progression2Ceiling.value ||
    parameters.progression2Ceiling.value >= parameters.topRateCeiling.value ||
    parameters.tariffDivisor.value <= 0 ||
    parameters.healthCapMonthly.value <= 0 ||
    parameters.pensionCapMonthly.value <= 0 ||
    parameters.careChildDiscount.value * parameters.careMaximumDiscountChildren.value > parameters.careEmployeeBaseRate.value
  ) {
    throw new TypeError("Tax parameter thresholds or contribution limits are inconsistent.");
  }
  return Object.freeze({
    calendarYear: requested,
    sourceYear: toFullCalendarYear(year),
    effectiveFrom: profile.effectiveFrom,
    papPublication: Object.freeze({ date: toTaxPublicationDate(profile.papPublication.date),
      source: toSourceUrl(profile.papPublication.source) }),
    projected: requested !== year,
    parameters: Object.freeze(parameters),
  });
}

export const DEFAULT_TAX_RULES = createTaxRules();
