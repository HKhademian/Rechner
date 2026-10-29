import {
  type Brand,
  toEuroAmount,
  toPercentageRate,
  toWorkingHours,
  toMonthDuration,
} from "#engine/types";
import defaults from "../../data/benefitRules.json" with { type: "json" };

/** A source is data provenance; an overridden value is an assumption, not official law. */
export type SourceUrl = Brand<string, "SourceUrl">;

export function toSourceUrl(value: unknown): SourceUrl {
  if (typeof value !== "string") {
    throw new TypeError("A statutory parameter needs an HTTPS source URL.");
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  }
  catch {
    throw new TypeError(`Invalid statutory source URL: ${value}`);
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new TypeError(`Invalid statutory source URL: ${value}`);
  }
  return value as SourceUrl;
}

export interface SourcedParameter<Value extends number> {
  readonly value: Value;
  readonly label: string;
  readonly source: SourceUrl;
  readonly overridden: boolean;
}

function nonnegativeMoney(value: number) {
  const amount = toEuroAmount(value);
  if (amount < 0) {
    throw new TypeError("A benefit rule monetary value cannot be negative.");
  }
  return amount;
}

function fraction(value: number) {
  // Config files use decimal fractions; do not silently interpret 2 as 2%.
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError("A benefit rule rate must be a fraction between 0 and 1.");
  }
  return toPercentageRate(value);
}

function integerMonths(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError("A benefit rule duration must be a positive integer month count.");
  }
  return toMonthDuration(value);
}

const constructors = {
  transitionFlatRate: fraction,
  standardHealthCareDeduction: fraction,
  standardPensionDeduction: fraction,
  standardUnemploymentDeduction: fraction,
  standardChurchTaxRate: fraction,
  olderBenefitExclusionLifeMonths: integerMonths,
  standardReplacementRate: fraction,
  minimumReplacementRate: fraction,
  maximumReplacementRate: fraction,
  lowIncomeThreshold: nonnegativeMoney,
  rateDecreaseThreshold: nonnegativeMoney,
  minimumRateThreshold: nonnegativeMoney,
  rateChangePerEuro: fraction,
  maximumAssessableNet: nonnegativeMoney,
  basisMinimum: nonnegativeMoney,
  basisMaximum: nonnegativeMoney,
  plusFraction: fraction,
  siblingMinimumBasis: nonnegativeMoney,
  siblingRate: fraction,
  siblingAgeLimitMonths: integerMonths,
  maximumWeeklyHours: toWorkingHours,
  partnershipMinimumHours: toWorkingHours,
  partnershipMaximumMonths: integerMonths,
  assessmentMonths: integerMonths,
  familyBasisMonths: integerMonths,
  additionalPartnerBasisMonths: integerMonths,
  minimumParentClaimMonths: integerMonths,
} as const;

export type BenefitRules = {
  readonly [Key in keyof typeof constructors]: SourcedParameter<ReturnType<(typeof constructors)[Key]>>;
};

/** Boundary parser: overrides retain the official reference and are labeled assumptions. */
export function createBenefitRules(overrides: unknown = {}): BenefitRules {
  if (typeof overrides !== "object" || overrides === null || Array.isArray(overrides)) {
    throw new TypeError("Benefit rule overrides must be an object.");
  }
  const input = overrides as Record<string, unknown>;
  for (const key of Object.keys(input)) {
    if (!Object.hasOwn(constructors, key)) {
      throw new TypeError(`Unknown benefit rule: ${key}`);
    }
  }
  const entries = Object.entries(constructors).map(([key, construct]) => {
    const name = key as keyof typeof constructors;
    const baseline = defaults[name];
    const override = input[name];
    const rawValue = override === undefined ? baseline.value : override;
    if (typeof rawValue !== "number") {
      throw new TypeError(`Benefit rule ${name} must be a number.`);
    }
    return [name, Object.freeze({
      value: construct(rawValue),
      label: baseline.label,
      source: toSourceUrl(baseline.source),
      overridden: rawValue !== baseline.value,
    })];
  });
  // Every key is constructed by its own validator before crossing the domain boundary.
  const rules = Object.fromEntries(entries) as BenefitRules;
  if (
    rules.basisMinimum.value > rules.basisMaximum.value ||
    rules.lowIncomeThreshold.value > rules.rateDecreaseThreshold.value ||
    rules.rateDecreaseThreshold.value >= rules.minimumRateThreshold.value ||
    rules.minimumReplacementRate.value > rules.standardReplacementRate.value ||
    rules.standardReplacementRate.value > rules.maximumReplacementRate.value ||
    rules.partnershipMinimumHours.value > rules.maximumWeeklyHours.value ||
    rules.plusFraction.value <= 0 ||
    rules.rateChangePerEuro.value <= 0
  ) {
    throw new TypeError("Benefit rule thresholds, rates, or limits are inconsistent.");
  }
  return Object.freeze(rules);
}

export const DEFAULT_BENEFIT_RULES = createBenefitRules();
