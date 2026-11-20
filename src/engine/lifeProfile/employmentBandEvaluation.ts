import employmentThresholdsJson from "../../data/employmentThresholds.json" with { type: "json" };
import {
  toSourceUrl,
} from "#engine/config/benefitRules";
import {
  FormulaId,
} from "#engine/formulas/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  type EuroAmount,
  SalaryPeriod,
  toEuroAmount,
} from "#engine/types";
import {
  type CalculationExplanation,
  ExplanationFormulaKind,
  ExplanationStatus,
  toFormulaVersion,
} from "#engine/lifeProfile/calculationExplanation";
import {
  type GrossRate,
} from "#engine/lifeProfile/employmentProjection";
import {
  type LifeDate,
  toLifeDate,
} from "#engine/lifeProfile/person";
import {
  type EffectiveRuleEntry,
  JurisdictionCode,
  RuleResolutionStatus,
  RuleUnsupportedReason,
  resolveEffectiveRule,
} from "#engine/lifeProfile/statutoryRuleResolver";
import {
  formatEurCents,
} from "#utils/currencyFormat";

export const EmploymentContributionBand = {
  Minijob: "minijob",
  Midijob: "midijob",
  Regular: "regular",
  Unknown: "unknown",
} as const;
export type EmploymentContributionBand = (typeof EmploymentContributionBand)[keyof typeof EmploymentContributionBand];

export function toEmploymentContributionBand(value: string): EmploymentContributionBand {
  if (!Object.values(EmploymentContributionBand).includes(value as EmploymentContributionBand)) {
    throw new TypeError("Invalid employment contribution band.");
  }
  return value as EmploymentContributionBand;
}

export interface EmploymentThresholdRuleTables {
  readonly marginalLimits: readonly EffectiveRuleEntry<EuroAmount>[];
  readonly transitionCeilings: readonly EffectiveRuleEntry<EuroAmount>[];
}

export interface EmploymentBandEvaluationInput {
  readonly grossRate?: GrossRate;
  readonly grossSourceLabel?: string;
  readonly date: LifeDate;
  readonly jurisdiction: JurisdictionCode;
  readonly allowProjection?: boolean;
  readonly ruleTables?: EmploymentThresholdRuleTables;
}

export interface EmploymentBandEvaluationResult {
  readonly band: EmploymentContributionBand;
  readonly label: string;
  readonly explanation: CalculationExplanation;
}

export const EMPLOYMENT_BAND_FORMULA_VERSION = toFormulaVersion("employment-band-sgb4-v1");

interface RawThreshold {
  readonly value: number;
  readonly label: string;
  readonly source: string;
}

interface RawThresholdYear {
  readonly marginal: RawThreshold;
  readonly transition: RawThreshold;
}

function buildDefaultEmploymentRuleTables(): EmploymentThresholdRuleTables {
  const profiles = employmentThresholdsJson as Readonly<Record<string, RawThresholdYear>>;
  const years = Object.keys(profiles).sort();
  const marginalLimits: EffectiveRuleEntry<EuroAmount>[] = [];
  const transitionCeilings: EffectiveRuleEntry<EuroAmount>[] = [];
  for (const year of years) {
    const entry = profiles[year];
    const effectiveFrom = toLifeDate(`${year}-01-01`);
    const effectiveTo = toLifeDate(`${year}-12-31`);
    marginalLimits.push(Object.freeze({
      jurisdiction: JurisdictionCode.GermanyFederal,
      effectiveFrom,
      effectiveTo,
      value: toEuroAmount(entry.marginal.value),
      label: entry.marginal.label,
      sourceUrl: toSourceUrl(entry.marginal.source),
      lawIds: Object.freeze([LawId.SGB4_20]),
      parameterId: ParameterId.Employment_MarginalLimitMonthly,
    }));
    transitionCeilings.push(Object.freeze({
      jurisdiction: JurisdictionCode.GermanyFederal,
      effectiveFrom,
      effectiveTo,
      value: toEuroAmount(entry.transition.value),
      label: entry.transition.label,
      sourceUrl: toSourceUrl(entry.transition.source),
      lawIds: Object.freeze([LawId.SGB4_20]),
      parameterId: ParameterId.Employment_TransitionCeilingMonthly,
    }));
  }
  return Object.freeze({
    marginalLimits: Object.freeze(marginalLimits),
    transitionCeilings: Object.freeze(transitionCeilings),
  });
}

export const DEFAULT_EMPLOYMENT_RULE_TABLES: EmploymentThresholdRuleTables = buildDefaultEmploymentRuleTables();

function describeUnsupportedRule(
  reason: RuleUnsupportedReason,
  requestedDate: LifeDate,
  earliestKnownDate?: LifeDate,
  latestKnownInterval?: { readonly effectiveFrom: LifeDate;
    readonly effectiveTo: LifeDate },
): string {
  if (reason === RuleUnsupportedReason.UnsupportedJurisdiction) {
    return "German statutory employment thresholds (§ 20 SGB IV) do not apply to the selected jurisdiction.";
  }
  if (reason === RuleUnsupportedReason.DateBeforeCoverage) {
    return `No verified statutory employment threshold covers ${requestedDate} (earliest verified rule starts ${earliestKnownDate ?? "later"}).`;
  }
  if (reason === RuleUnsupportedReason.DateInCoverageGap) {
    return `No verified statutory employment threshold covers ${requestedDate} because it falls outside verified rule intervals.`;
  }
  const latestText = latestKnownInterval
    ? `${latestKnownInterval.effectiveFrom} to ${latestKnownInterval.effectiveTo}`
    : "earlier years";
  return `No enacted statutory employment threshold covers ${requestedDate}. Enable explicit projection to preview using the latest verified rule (${latestText}).`;
}

function bandLabel(band: EmploymentContributionBand): string {
  if (band === EmploymentContributionBand.Minijob) {
    return "Minijob (marginal employment band)";
  }
  if (band === EmploymentContributionBand.Midijob) {
    return "Midijob (transition-zone band)";
  }
  if (band === EmploymentContributionBand.Regular) {
    return "Regular employment band";
  }
  return "Unknown (no supported rule or monthly gross rate)";
}

/**
 * Classifies a recorded monthly gross rate into Germany's statutory Minijob, Midijob,
 * or Regular employment contribution band with full effective-date, jurisdiction,
 * parameter, formula and law provenance.
 */
export function evaluateEmploymentBand(
  input: EmploymentBandEvaluationInput,
): EmploymentBandEvaluationResult {
  const tables = input.ruleTables ?? DEFAULT_EMPLOYMENT_RULE_TABLES;
  const allowProjection = input.allowProjection === true;
  const baseAssumptions = Object.freeze([
    "Compares one recorded monthly gross rate against federal German statutory monthly thresholds; does not combine multiple simultaneous jobs.",
    "Does not check student, short-term, pension-opt-out or sector-specific exemptions, and is not a binding social-security determination.",
    "Yearly gross rates are not converted automatically because working months and bonus pay counts are not assumed.",
  ]);
  const baseInputs = Object.freeze([
    {
      label: "Recorded gross rate",
      value: input.grossRate
        ? `${formatEurCents(input.grossRate.amount)} / ${input.grossRate.period === SalaryPeriod.Monthly ? "month" : "year"}`
        : "Not recorded",
      source: input.grossSourceLabel ?? "Timeline employment fact",
    },
    {
      label: "Evaluation date",
      value: input.date,
      source: "Selected view date",
    },
    {
      label: "Jurisdiction",
      value: input.jurisdiction === JurisdictionCode.GermanyFederal ? "Germany (federal · DE)" : "Other / unsupported jurisdiction",
      source: "Selected rule jurisdiction",
    },
    {
      label: "Future rule projection",
      value: allowProjection ? "Explicitly enabled" : "Disabled (enacted rules only)",
      source: "Explicit user setting",
    },
  ]);

  if (!input.grossRate || input.grossRate.period !== SalaryPeriod.Monthly || input.grossRate.amount <= 0) {
    const unsupportedReason = !input.grossRate
      ? "No gross pay rate is recorded for this job on the selected date."
      : input.grossRate.period !== SalaryPeriod.Monthly
        ? "Monthly threshold classification requires a monthly gross rate; yearly rates are not divided automatically."
        : "Monthly gross pay must be greater than zero to classify an employment band.";
    return Object.freeze({
      band: EmploymentContributionBand.Unknown,
      label: bandLabel(EmploymentContributionBand.Unknown),
      explanation: Object.freeze({
        kind: ExplanationFormulaKind.Statutory,
        status: ExplanationStatus.Unsupported,
        formulaName: "Statutory Employment Band Classification (Minijob / Midijob / Regular)",
        formulaExpression: "gross <= marginalLimit -> Minijob; marginalLimit < gross <= transitionCeiling -> Midijob; gross > transitionCeiling -> Regular",
        formulaVersion: EMPLOYMENT_BAND_FORMULA_VERSION,
        formulaId: FormulaId.TransitionZoneAssessmentBases,
        jurisdiction: input.jurisdiction,
        effectiveDate: input.date,
        unsupportedReason,
        inputs: baseInputs,
        parameters: Object.freeze([]),
        lawIds: Object.freeze([LawId.SGB4_20]),
        topicIds: Object.freeze(["minijob"]),
        assumptions: baseAssumptions,
      }),
    });
  }

  const marginalResolution = resolveEffectiveRule(tables.marginalLimits, {
    date: input.date,
    jurisdiction: input.jurisdiction,
    allowProjection,
  });
  const transitionResolution = resolveEffectiveRule(tables.transitionCeilings, {
    date: input.date,
    jurisdiction: input.jurisdiction,
    allowProjection,
  });

  const unsupportedResult = (
    failed: Extract<ReturnType<typeof resolveEffectiveRule<EuroAmount>>, { readonly status: typeof RuleResolutionStatus.Unsupported }>,
  ): EmploymentBandEvaluationResult => Object.freeze({
    band: EmploymentContributionBand.Unknown,
    label: bandLabel(EmploymentContributionBand.Unknown),
    explanation: Object.freeze({
      kind: ExplanationFormulaKind.Statutory,
      status: ExplanationStatus.Unsupported,
      formulaName: "Statutory Employment Band Classification (Minijob / Midijob / Regular)",
      formulaExpression: "gross <= marginalLimit -> Minijob; marginalLimit < gross <= transitionCeiling -> Midijob; gross > transitionCeiling -> Regular",
      formulaVersion: EMPLOYMENT_BAND_FORMULA_VERSION,
      formulaId: FormulaId.TransitionZoneAssessmentBases,
      jurisdiction: input.jurisdiction,
      effectiveDate: input.date,
      unsupportedReason: describeUnsupportedRule(
        failed.reason,
        failed.requestedDate,
        failed.earliestKnownDate,
        failed.latestKnownInterval,
      ),
      inputs: baseInputs,
      parameters: Object.freeze([]),
      lawIds: Object.freeze([LawId.SGB4_20]),
      topicIds: Object.freeze(["minijob"]),
      assumptions: baseAssumptions,
    }),
  });

  if (marginalResolution.status === RuleResolutionStatus.Unsupported) {
    return unsupportedResult(marginalResolution);
  }
  if (transitionResolution.status === RuleResolutionStatus.Unsupported) {
    return unsupportedResult(transitionResolution);
  }

  const monthlyGross = input.grossRate.amount;
  const marginalLimit = marginalResolution.entry.value;
  const transitionCeiling = transitionResolution.entry.value;
  const band = monthlyGross <= marginalLimit
    ? EmploymentContributionBand.Minijob
    : monthlyGross <= transitionCeiling
      ? EmploymentContributionBand.Midijob
      : EmploymentContributionBand.Regular;
  const isProjected = marginalResolution.status === RuleResolutionStatus.Projected
    || transitionResolution.status === RuleResolutionStatus.Projected;

  const parameters = Object.freeze([
    Object.freeze({
      label: marginalResolution.entry.label,
      value: `${formatEurCents(marginalLimit)} / month`,
      parameterId: marginalResolution.entry.parameterId,
      jurisdiction: marginalResolution.entry.jurisdiction,
      effectiveFrom: marginalResolution.entry.effectiveFrom,
      effectiveTo: marginalResolution.entry.effectiveTo,
      status: marginalResolution.status,
      sourceUrl: marginalResolution.entry.sourceUrl,
      lawIds: marginalResolution.entry.lawIds,
    }),
    Object.freeze({
      label: transitionResolution.entry.label,
      value: `${formatEurCents(transitionCeiling)} / month`,
      parameterId: transitionResolution.entry.parameterId,
      jurisdiction: transitionResolution.entry.jurisdiction,
      effectiveFrom: transitionResolution.entry.effectiveFrom,
      effectiveTo: transitionResolution.entry.effectiveTo,
      status: transitionResolution.status,
      sourceUrl: transitionResolution.entry.sourceUrl,
      lawIds: transitionResolution.entry.lawIds,
    }),
  ]);

  return Object.freeze({
    band,
    label: bandLabel(band),
    explanation: Object.freeze({
      kind: ExplanationFormulaKind.Statutory,
      status: isProjected ? ExplanationStatus.Projected : ExplanationStatus.Supported,
      formulaName: "Statutory Employment Band Classification (Minijob / Midijob / Regular)",
      formulaExpression: "gross <= marginalLimit -> Minijob; marginalLimit < gross <= transitionCeiling -> Midijob; gross > transitionCeiling -> Regular",
      formulaVersion: EMPLOYMENT_BAND_FORMULA_VERSION,
      formulaId: FormulaId.TransitionZoneAssessmentBases,
      jurisdiction: input.jurisdiction,
      effectiveDate: input.date,
      inputs: baseInputs,
      parameters,
      lawIds: Object.freeze([LawId.SGB4_20]),
      topicIds: Object.freeze(["minijob"]),
      assumptions: isProjected
        ? Object.freeze([
          `Projected beyond enacted rule coverage using the ${marginalResolution.entry.effectiveFrom} to ${marginalResolution.entry.effectiveTo} thresholds.`,
          ...baseAssumptions,
        ])
        : baseAssumptions,
    }),
  });
}
