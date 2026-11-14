import benefitIncomeLimitsJson from "../../data/benefitIncomeLimits.json" with { type: "json" };
import benefitRulesJson from "../../data/benefitRules.json" with { type: "json" };
import childcareRulesJson from "../../data/childcareRules.json" with { type: "json" };
import employmentThresholdsJson from "../../data/employmentThresholds.json" with { type: "json" };
import taxRulesJson from "../../data/taxRules.json" with { type: "json" };
import timelineConventionsJson from "../../data/timelineConventions.json" with { type: "json" };
import {
  toSourceUrl,
} from "#engine/config/benefitRules";
import {
  type LawId as LawIdType,
  LawId,
} from "#engine/laws/types";
import {
  type ParameterBounds,
  type ParameterDefinition,
  type ParameterDomain as ParameterDomainType,
  type ParameterId as ParameterIdType,
  type ParameterModificationResult,
  type ParameterMutability as ParameterMutabilityType,
  type ParameterUnit as ParameterUnitType,
  type ParameterYearEntry,
  type ResolvedParameterValue,
  ParameterDomain,
  ParameterFlagCode,
  ParameterId,
  ParameterMutability,
  ParameterUnit,
} from "#engine/parameters/types";
import {
  type TaxParameters,
} from "#engine/tax/taxRules";
import {
  type FullCalendarYear,
  toFullCalendarYear,
} from "#engine/types";

interface TaxParameterRaw {
  readonly value: number;
  readonly label: string;
  readonly source: string;
}

interface TaxYearRaw {
  readonly effectiveFrom: string;
  readonly parameters: Readonly<Record<string, TaxParameterRaw>>;
}

interface BenefitParameterRaw {
  readonly value: number;
  readonly label: string;
  readonly source: string;
}

interface EmploymentThresholdYearRaw {
  readonly marginal: BenefitParameterRaw;
  readonly transition: BenefitParameterRaw;
}

interface TimelineConventionRaw {
  readonly value: number;
  readonly label: string;
  readonly basis: string;
  readonly statutoryContext: string;
}

const taxProfiles = taxRulesJson as Readonly<Record<string, TaxYearRaw>>;
const childcareProfiles = childcareRulesJson as Readonly<Record<string, TaxYearRaw>>;
const benefitDefaults = benefitRulesJson as Readonly<Record<string, BenefitParameterRaw>>;
const employmentProfiles = employmentThresholdsJson as Readonly<Record<string, EmploymentThresholdYearRaw>>;
const conventionDefaults = timelineConventionsJson as Readonly<Record<string, TimelineConventionRaw>>;

const SORTED_CHILDCARE_YEARS: readonly FullCalendarYear[] = Object.freeze(
  Object.keys(childcareProfiles)
    .map(Number)
    .sort((a, b) => a - b)
    .map((year) => toFullCalendarYear(year)),
);

const LATEST_CHILDCARE_YEAR: FullCalendarYear = SORTED_CHILDCARE_YEARS[SORTED_CHILDCARE_YEARS.length - 1];

const SORTED_TAX_YEARS: readonly FullCalendarYear[] = Object.freeze(
  Object.keys(taxProfiles)
    .map(Number)
    .sort((a, b) => a - b)
    .map((year) => toFullCalendarYear(year)),
);

const LATEST_TAX_YEAR: FullCalendarYear = SORTED_TAX_YEARS[SORTED_TAX_YEARS.length - 1];

const SORTED_EMPLOYMENT_YEARS: readonly FullCalendarYear[] = Object.freeze(
  Object.keys(employmentProfiles)
    .map(Number)
    .sort((a, b) => a - b)
    .map((year) => toFullCalendarYear(year)),
);

function freezeDefinition(definition: ParameterDefinition): ParameterDefinition {
  const frozenYearEntries: Record<number, ParameterYearEntry> | undefined = definition.yearEntries
    ? (() => {
      const copy: Record<number, ParameterYearEntry> = {};
      for (const [yearKey, entry] of Object.entries(definition.yearEntries)) {
        if (entry) {
          copy[Number(yearKey)] = Object.freeze({ ...entry });
        }
      }
      return Object.freeze(copy);
    })()
    : undefined;

  return Object.freeze({
    ...definition,
    lawIds: Object.freeze([...definition.lawIds]),
    bounds: Object.freeze({ ...definition.bounds }),
    ...(frozenYearEntries ? { yearEntries: frozenYearEntries } : {}),
  });
}

function buildTaxParameter(
  id: ParameterIdType,
  taxKey: string,
  config: {
    readonly description: string;
    readonly domain: ParameterDomainType;
    readonly unit: ParameterUnitType;
    readonly mutability: ParameterMutabilityType;
    readonly lawIds: readonly LawIdType[];
    readonly bounds: ParameterBounds;
  },
): ParameterDefinition {
  const yearEntries: Record<number, ParameterYearEntry> = {};
  for (const year of SORTED_TAX_YEARS) {
    const raw = taxProfiles[String(year)].parameters[taxKey];
    yearEntries[year] = {
      year,
      value: raw.value,
      source: toSourceUrl(raw.source),
    };
  }
  const latest = taxProfiles[String(LATEST_TAX_YEAR)].parameters[taxKey];
  return freezeDefinition({
    id,
    label: latest.label,
    description: config.description,
    domain: config.domain,
    unit: config.unit,
    mutability: config.mutability,
    lawIds: config.lawIds,
    defaultValue: latest.value,
    source: toSourceUrl(latest.source),
    yearEntries,
    bounds: config.bounds,
  });
}

function buildChildcareParameter(
  id: ParameterIdType,
  childcareKey: string,
  config: {
    readonly description: string;
    readonly domain: ParameterDomainType;
    readonly unit: ParameterUnitType;
    readonly mutability: ParameterMutabilityType;
    readonly lawIds: readonly LawIdType[];
    readonly bounds: ParameterBounds;
  },
): ParameterDefinition {
  const yearEntries: Record<number, ParameterYearEntry> = {};
  for (const year of SORTED_CHILDCARE_YEARS) {
    const raw = childcareProfiles[String(year)].parameters[childcareKey];
    yearEntries[year] = {
      year,
      value: raw.value,
      source: toSourceUrl(raw.source),
    };
  }
  const latest = childcareProfiles[String(LATEST_CHILDCARE_YEAR)].parameters[childcareKey];
  return freezeDefinition({
    id,
    label: latest.label,
    description: config.description,
    domain: config.domain,
    unit: config.unit,
    mutability: config.mutability,
    lawIds: config.lawIds,
    defaultValue: latest.value,
    source: toSourceUrl(latest.source),
    ...(config.mutability === ParameterMutability.YearIndexed ? { yearEntries } : {}),
    bounds: config.bounds,
  });
}

function buildBenefitParameter(
  id: ParameterIdType,
  benefitKey: string,
  config: {
    readonly description: string;
    readonly domain?: ParameterDomainType;
    readonly unit: ParameterUnitType;
    readonly mutability: ParameterMutabilityType;
    readonly lawIds: readonly LawIdType[];
    readonly bounds: ParameterBounds;
  },
): ParameterDefinition {
  const baseline = benefitDefaults[benefitKey];
  return freezeDefinition({
    id,
    label: baseline.label,
    description: config.description,
    domain: config.domain ?? ParameterDomain.ParentalAllowance,
    unit: config.unit,
    mutability: config.mutability,
    lawIds: config.lawIds,
    defaultValue: baseline.value,
    source: toSourceUrl(baseline.source),
    bounds: config.bounds,
  });
}

function buildEmploymentThresholdParameter(
  id: ParameterIdType,
  thresholdKey: "marginal" | "transition",
  config: {
    readonly description: string;
    readonly lawIds: readonly LawIdType[];
    readonly bounds: ParameterBounds;
  },
): ParameterDefinition {
  const yearEntries: Record<number, ParameterYearEntry> = {};
  for (const year of SORTED_EMPLOYMENT_YEARS) {
    const raw = employmentProfiles[String(year)][thresholdKey];
    yearEntries[year] = {
      year,
      value: raw.value,
      source: toSourceUrl(raw.source),
    };
  }
  const latestYear = SORTED_EMPLOYMENT_YEARS[SORTED_EMPLOYMENT_YEARS.length - 1];
  const latest = employmentProfiles[String(latestYear)][thresholdKey];
  return freezeDefinition({
    id,
    label: latest.label,
    description: config.description,
    domain: ParameterDomain.SocialSecurity,
    unit: ParameterUnit.MoneyEur,
    mutability: ParameterMutability.YearIndexed,
    lawIds: config.lawIds,
    defaultValue: latest.value,
    source: toSourceUrl(latest.source),
    yearEntries,
    bounds: config.bounds,
  });
}

function buildBenefitIncomeLimitParameter(): ParameterDefinition {
  const yearEntries: Record<number, ParameterYearEntry> = {};
  const sorted = [...benefitIncomeLimitsJson].sort(
    (a, b) => a.effectiveBirthYear - b.effectiveBirthYear || a.effectiveBirthMonth - b.effectiveBirthMonth,
  );
  for (const entry of sorted) {
    const year = toFullCalendarYear(entry.effectiveBirthYear);
    yearEntries[year] = {
      year,
      value: entry.coupleTaxableIncomeMaximum,
      source: toSourceUrl(entry.source),
      note: `Effective for births from ${entry.effectiveBirthYear}-${String(entry.effectiveBirthMonth).padStart(2, "0")}`,
    };
  }
  const latest = sorted[sorted.length - 1];
  return freezeDefinition({
    id: ParameterId.Benefit_CoupleTaxableIncomeMaximum,
    label: "Couple taxable-income eligibility limit (EUR)",
    description: "Prior-year household taxable income threshold above which Elterngeld entitlement ceases (§ 1 Abs. 8 BEEG).",
    domain: ParameterDomain.ParentalAllowance,
    unit: ParameterUnit.MoneyEur,
    mutability: ParameterMutability.YearIndexed,
    lawIds: [LawId.BEEG_1, LawId.EStG_2],
    defaultValue: latest.coupleTaxableIncomeMaximum,
    source: toSourceUrl(latest.source),
    yearEntries,
    bounds: {
      min: 1,
      integerOnly: true,
    },
  });
}

function buildConventionParameter(
  id: ParameterIdType,
  conventionKey: string,
  lawIds: readonly LawIdType[],
  domain: ParameterDomainType,
): ParameterDefinition {
  const baseline = conventionDefaults[conventionKey];
  return freezeDefinition({
    id,
    label: baseline.label,
    description: baseline.basis,
    domain,
    unit: ParameterUnit.Months,
    mutability: ParameterMutability.Customizable,
    lawIds,
    defaultValue: baseline.value,
    source: toSourceUrl(baseline.statutoryContext),
    bounds: {
      min: 0,
      max: 36,
      integerOnly: true,
    },
  });
}

const MONEY_BOUNDS: ParameterBounds = { min: 0 };
const RATE_BOUNDS: ParameterBounds = { min: 0,
  max: 1 };
const POSITIVE_INT_MONTHS_BOUNDS: ParameterBounds = { min: 1,
  max: 120,
  integerOnly: true };

/**
 * Central frozen registry of all statutory, year-indexed, and customizable parameters
 * across every calculator in the workspace, cross-linked to typed `LawId`s.
 */
export const PARAMETER_REGISTRY: Readonly<Record<ParameterIdType, ParameterDefinition>> = Object.freeze({
  // Income Tax & Tariff Rules
  [ParameterId.Tax_BasicAllowance]: buildTaxParameter(ParameterId.Tax_BasicAllowance, "basicAllowance", {
    description: "Annual basic tax-free allowance (Grundfreibetrag) per adult under § 32a EStG.",
    domain: ParameterDomain.IncomeTax,
    unit: ParameterUnit.MoneyEur,
    mutability: ParameterMutability.YearIndexed,
    lawIds: [LawId.EStG_32a],
    bounds: MONEY_BOUNDS,
  }),
  [ParameterId.Tax_Progression1Ceiling]: buildTaxParameter(ParameterId.Tax_Progression1Ceiling, "progression1Ceiling", {
    description: "Upper income boundary of progression zone 1 under § 32a Abs. 1 Nr. 2 EStG.",
    domain: ParameterDomain.IncomeTax,
    unit: ParameterUnit.MoneyEur,
    mutability: ParameterMutability.YearIndexed,
    lawIds: [LawId.EStG_32a],
    bounds: MONEY_BOUNDS,
  }),
  [ParameterId.Tax_Progression2Ceiling]: buildTaxParameter(ParameterId.Tax_Progression2Ceiling, "progression2Ceiling", {
    description: "Upper income boundary of progression zone 2 before the 42% bracket under § 32a Abs. 1 Nr. 3 EStG.",
    domain: ParameterDomain.IncomeTax,
    unit: ParameterUnit.MoneyEur,
    mutability: ParameterMutability.YearIndexed,
    lawIds: [LawId.EStG_32a],
    bounds: MONEY_BOUNDS,
  }),
  [ParameterId.Tax_TopRateCeiling]: buildTaxParameter(ParameterId.Tax_TopRateCeiling, "topRateCeiling", {
    description: "Income ceiling above which the 45% Reichensteuer rate starts under § 32a Abs. 1 Nr. 5 EStG.",
    domain: ParameterDomain.IncomeTax,
    unit: ParameterUnit.MoneyEur,
    mutability: ParameterMutability.YearIndexed,
    lawIds: [LawId.EStG_32a],
    bounds: MONEY_BOUNDS,
  }),
  [ParameterId.Tax_Progression1Quadratic]: buildTaxParameter(ParameterId.Tax_Progression1Quadratic, "progression1Quadratic", {
    description: "Quadratic polynomial coefficient for progression zone 1 in § 32a EStG.",
    domain: ParameterDomain.IncomeTax,
    unit: ParameterUnit.MoneyEur,
    mutability: ParameterMutability.YearIndexed,
    lawIds: [LawId.EStG_32a],
    bounds: MONEY_BOUNDS,
  }),
  [ParameterId.Tax_Progression1Linear]: buildTaxParameter(ParameterId.Tax_Progression1Linear, "progression1Linear", {
    description: "Linear bracket coefficient for progression zone 1 in § 32a EStG.",
    domain: ParameterDomain.IncomeTax,
    unit: ParameterUnit.MoneyEur,
    mutability: ParameterMutability.YearIndexed,
    lawIds: [LawId.EStG_32a],
    bounds: MONEY_BOUNDS,
  }),
  [ParameterId.Tax_Progression2Quadratic]: buildTaxParameter(ParameterId.Tax_Progression2Quadratic, "progression2Quadratic", {
    description: "Quadratic polynomial coefficient for progression zone 2 in § 32a EStG.",
    domain: ParameterDomain.IncomeTax,
    unit: ParameterUnit.MoneyEur,
    mutability: ParameterMutability.YearIndexed,
    lawIds: [LawId.EStG_32a],
    bounds: MONEY_BOUNDS,
  }),
  [ParameterId.Tax_Progression2Linear]: buildTaxParameter(ParameterId.Tax_Progression2Linear, "progression2Linear", {
    description: "Linear bracket coefficient for progression zone 2 in § 32a EStG.",
    domain: ParameterDomain.IncomeTax,
    unit: ParameterUnit.MoneyEur,
    mutability: ParameterMutability.YearIndexed,
    lawIds: [LawId.EStG_32a],
    bounds: MONEY_BOUNDS,
  }),
  [ParameterId.Tax_Progression2Constant]: buildTaxParameter(ParameterId.Tax_Progression2Constant, "progression2Constant", {
    description: "Constant continuity offset entering progression zone 2 under § 32a EStG.",
    domain: ParameterDomain.IncomeTax,
    unit: ParameterUnit.MoneyEur,
    mutability: ParameterMutability.YearIndexed,
    lawIds: [LawId.EStG_32a],
    bounds: MONEY_BOUNDS,
  }),
  [ParameterId.Tax_TopRate]: buildTaxParameter(ParameterId.Tax_TopRate, "topRate", {
    description: "Marginal top tax rate (42%) for proportional zone 4 under § 32a Abs. 1 Nr. 4 EStG.",
    domain: ParameterDomain.IncomeTax,
    unit: ParameterUnit.PercentageRate,
    mutability: ParameterMutability.StatutoryFixed,
    lawIds: [LawId.EStG_32a],
    bounds: RATE_BOUNDS,
  }),
  [ParameterId.Tax_TopOffset]: buildTaxParameter(ParameterId.Tax_TopOffset, "topOffset", {
    description: "Continuity subtraction constant for the 42% bracket under § 32a Abs. 1 Nr. 4 EStG.",
    domain: ParameterDomain.IncomeTax,
    unit: ParameterUnit.MoneyEur,
    mutability: ParameterMutability.YearIndexed,
    lawIds: [LawId.EStG_32a],
    bounds: MONEY_BOUNDS,
  }),
  [ParameterId.Tax_HighestRate]: buildTaxParameter(ParameterId.Tax_HighestRate, "highestRate", {
    description: "Maximum statutory marginal income tax rate (45%) under § 32a Abs. 1 Nr. 5 EStG.",
    domain: ParameterDomain.IncomeTax,
    unit: ParameterUnit.PercentageRate,
    mutability: ParameterMutability.StatutoryFixed,
    lawIds: [LawId.EStG_32a],
    bounds: RATE_BOUNDS,
  }),
  [ParameterId.Tax_HighestOffset]: buildTaxParameter(ParameterId.Tax_HighestOffset, "highestOffset", {
    description: "Continuity subtraction constant for the 45% Reichensteuer bracket under § 32a EStG.",
    domain: ParameterDomain.IncomeTax,
    unit: ParameterUnit.MoneyEur,
    mutability: ParameterMutability.YearIndexed,
    lawIds: [LawId.EStG_32a],
    bounds: MONEY_BOUNDS,
  }),
  [ParameterId.Tax_TariffDivisor]: buildTaxParameter(ParameterId.Tax_TariffDivisor, "tariffDivisor", {
    description: "Statutory 10,000-euro scaling divisor used in § 32a EStG tariff formulas.",
    domain: ParameterDomain.IncomeTax,
    unit: ParameterUnit.MoneyEur,
    mutability: ParameterMutability.StatutoryFixed,
    lawIds: [LawId.EStG_32a],
    bounds: { min: 1 },
  }),
  [ParameterId.Tax_ProgressionRatePercentDecimalPlaces]: buildTaxParameter(
    ParameterId.Tax_ProgressionRatePercentDecimalPlaces,
    "progressionRatePercentDecimalPlaces",
    {
      description: "Mandatory truncation of special § 32b Progressionsvorbehalt tax rate percentage to four decimal places.",
      domain: ParameterDomain.IncomeTax,
      unit: ParameterUnit.DecimalPlaces,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.EStG_32b],
      bounds: { min: 0,
        max: 6,
        integerOnly: true },
    },
  ),
  [ParameterId.Tax_WorkExpenseAllowance]: buildTaxParameter(ParameterId.Tax_WorkExpenseAllowance, "workExpenseAllowance", {
    description: "Standard employee work-related expense allowance (Arbeitnehmer-Pauschbetrag) under § 9a Nr. 1a EStG.",
    domain: ParameterDomain.IncomeTax,
    unit: ParameterUnit.MoneyEur,
    mutability: ParameterMutability.YearIndexed,
    lawIds: [LawId.EStG_9a, LawId.EStG_2],
    bounds: MONEY_BOUNDS,
  }),
  [ParameterId.Tax_SpecialExpenseAllowance]: buildTaxParameter(ParameterId.Tax_SpecialExpenseAllowance, "specialExpenseAllowance", {
    description: "Standard lump-sum special expenses deduction (Sonderausgaben-Pauschbetrag) under § 10c EStG.",
    domain: ParameterDomain.IncomeTax,
    unit: ParameterUnit.MoneyEur,
    mutability: ParameterMutability.StatutoryFixed,
    lawIds: [LawId.EStG_10c],
    bounds: MONEY_BOUNDS,
  }),
  [ParameterId.Tax_SingleParentRelief]: buildTaxParameter(ParameterId.Tax_SingleParentRelief, "singleParentRelief", {
    description: "Base single-parent tax relief amount (Entlastungsbetrag für Alleinerziehende) under § 24b EStG.",
    domain: ParameterDomain.IncomeTax,
    unit: ParameterUnit.MoneyEur,
    mutability: ParameterMutability.YearIndexed,
    lawIds: [LawId.EStG_24b],
    bounds: MONEY_BOUNDS,
  }),
  [ParameterId.Tax_SingleParentExtraChildRelief]: buildTaxParameter(
    ParameterId.Tax_SingleParentExtraChildRelief,
    "singleParentExtraChildRelief",
    {
      description: "Additional § 24b EStG relief per extra qualifying child beyond the first.",
      domain: ParameterDomain.IncomeTax,
      unit: ParameterUnit.MoneyEur,
      mutability: ParameterMutability.YearIndexed,
      lawIds: [LawId.EStG_24b],
      bounds: MONEY_BOUNDS,
    },
  ),
  [ParameterId.Tax_ChurchRateBavariaBadenWuerttemberg]: buildTaxParameter(
    ParameterId.Tax_ChurchRateBavariaBadenWuerttemberg,
    "churchRateBavariaBadenWuerttemberg",
    {
      description: "Regional 8% church tax rate applicable in Bavaria and Baden-Württemberg.",
      domain: ParameterDomain.IncomeTax,
      unit: ParameterUnit.PercentageRate,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.EStG_39b, LawId.EStG_2],
      bounds: RATE_BOUNDS,
    },
  ),
  [ParameterId.Tax_ChurchRateOther]: buildTaxParameter(ParameterId.Tax_ChurchRateOther, "churchRateOther", {
    description: "Regional 9% church tax rate applicable across all federal states except Bavaria and Baden-Württemberg.",
    domain: ParameterDomain.IncomeTax,
    unit: ParameterUnit.PercentageRate,
    mutability: ParameterMutability.StatutoryFixed,
    lawIds: [LawId.EStG_39b, LawId.EStG_2],
    bounds: RATE_BOUNDS,
  }),
  [ParameterId.Tax_SolidarityRate]: buildTaxParameter(ParameterId.Tax_SolidarityRate, "solidarityRate", {
    description: "Full statutory Solidarity Surcharge rate (5.5% of assessed income tax) under § 4 SolzG.",
    domain: ParameterDomain.IncomeTax,
    unit: ParameterUnit.PercentageRate,
    mutability: ParameterMutability.StatutoryFixed,
    lawIds: [LawId.SolzG_4, LawId.SolzG_1],
    bounds: RATE_BOUNDS,
  }),
  [ParameterId.Tax_SolidarityMitigationRate]: buildTaxParameter(
    ParameterId.Tax_SolidarityMitigationRate,
    "solidarityMitigationRate",
    {
      description: "Phase-in mitigation factor (11.9% of income tax excess over exemption threshold) under § 4 Satz 2 SolzG.",
      domain: ParameterDomain.IncomeTax,
      unit: ParameterUnit.PercentageRate,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.SolzG_4, LawId.SolzG_3],
      bounds: RATE_BOUNDS,
    },
  ),
  [ParameterId.Tax_SolidarityExemptionSingle]: buildTaxParameter(
    ParameterId.Tax_SolidarityExemptionSingle,
    "solidarityExemptionSingle",
    {
      description: "Annual income-tax exemption threshold below which no Solidarity Surcharge applies (doubled for joint assessment) under § 3 SolzG.",
      domain: ParameterDomain.IncomeTax,
      unit: ParameterUnit.MoneyEur,
      mutability: ParameterMutability.YearIndexed,
      lawIds: [LawId.SolzG_3, LawId.EStG_26b],
      bounds: MONEY_BOUNDS,
    },
  ),
  [ParameterId.Tax_ChildAllowanceAnnual]: buildTaxParameter(ParameterId.Tax_ChildAllowanceAnnual, "childAllowanceAnnual", {
    description: "Combined annual Kinderfreibetrag + BEA allowance per child for both parents under § 32 Abs. 6 EStG.",
    domain: ParameterDomain.FamilyBenefits,
    unit: ParameterUnit.MoneyEur,
    mutability: ParameterMutability.YearIndexed,
    lawIds: [LawId.EStG_32, LawId.EStG_31],
    bounds: MONEY_BOUNDS,
  }),
  [ParameterId.Tax_ChildBenefitMonthly]: buildTaxParameter(ParameterId.Tax_ChildBenefitMonthly, "childBenefitMonthly", {
    description: "Statutory monthly tax-free Kindergeld amount per qualifying child under § 66 EStG.",
    domain: ParameterDomain.FamilyBenefits,
    unit: ParameterUnit.MoneyEur,
    mutability: ParameterMutability.YearIndexed,
    lawIds: [LawId.EStG_66, LawId.EStG_31, LawId.EStG_62],
    bounds: MONEY_BOUNDS,
  }),
  [ParameterId.Tax_HealthDeductibleFraction]: buildTaxParameter(
    ParameterId.Tax_HealthDeductibleFraction,
    "healthDeductibleFraction",
    {
      description: "Deductible basic health-care share (96% when sickness-benefit entitlement applies) under § 10 Abs. 1 Nr. 3a EStG.",
      domain: ParameterDomain.IncomeTax,
      unit: ParameterUnit.PercentageRate,
      mutability: ParameterMutability.YearIndexed,
      lawIds: [LawId.EStG_10],
      bounds: RATE_BOUNDS,
    },
  ),
  [ParameterId.Tax_PensionDeductibleFraction]: buildTaxParameter(
    ParameterId.Tax_PensionDeductibleFraction,
    "pensionDeductibleFraction",
    {
      description: "Full 100% Vorsorgeaufwendungen deductibility fraction for statutory pension contributions since 2023 under § 10 Abs. 3 EStG.",
      domain: ParameterDomain.IncomeTax,
      unit: ParameterUnit.PercentageRate,
      mutability: ParameterMutability.YearIndexed,
      lawIds: [LawId.EStG_10],
      bounds: RATE_BOUNDS,
    },
  ),
  [ParameterId.Tax_OtherInsuranceDeductionLimit]: buildTaxParameter(
    ParameterId.Tax_OtherInsuranceDeductionLimit,
    "otherInsuranceDeductionLimit",
    {
      description: "Annual €1,900 limit for other insurance expenses per employer-insured taxpayer under § 10 Abs. 4 EStG.",
      domain: ParameterDomain.IncomeTax,
      unit: ParameterUnit.MoneyEur,
      mutability: ParameterMutability.YearIndexed,
      lawIds: [LawId.EStG_10],
      bounds: MONEY_BOUNDS,
    },
  ),
  [ParameterId.Tax_AgeReliefMinimumAge]: buildTaxParameter(ParameterId.Tax_AgeReliefMinimumAge, "ageReliefMinimumAge", {
    description: "Completed age at start of calendar year required for § 24a EStG Altersentlastungsbetrag.",
    domain: ParameterDomain.IncomeTax,
    unit: ParameterUnit.Years,
    mutability: ParameterMutability.StatutoryFixed,
    lawIds: [LawId.EStG_24a],
    bounds: { min: 18,
      max: 120,
      integerOnly: true },
  }),
  [ParameterId.Tax_ChildcareDeductibleFraction]: buildChildcareParameter(
    ParameterId.Tax_ChildcareDeductibleFraction,
    "deductibleFraction",
    {
      description: "Share of verified childcare fees deductible as Sonderausgaben (2/3 through 2024; 80% from 2025 per JStG 2024) under § 10 Abs. 1 Nr. 5 EStG.",
      domain: ParameterDomain.IncomeTax,
      unit: ParameterUnit.PercentageRate,
      mutability: ParameterMutability.YearIndexed,
      lawIds: [LawId.EStG_10_1_5],
      bounds: RATE_BOUNDS,
    },
  ),
  [ParameterId.Tax_ChildcareMaxDeductionPerChild]: buildChildcareParameter(
    ParameterId.Tax_ChildcareMaxDeductionPerChild,
    "maxAnnualDeductionPerChild",
    {
      description: "Maximum annual childcare tax deduction per qualifying child under 14 (€4,000 through 2024; €4,800 from 2025) under § 10 Abs. 1 Nr. 5 EStG.",
      domain: ParameterDomain.IncomeTax,
      unit: ParameterUnit.MoneyEur,
      mutability: ParameterMutability.YearIndexed,
      lawIds: [LawId.EStG_10_1_5],
      bounds: MONEY_BOUNDS,
    },
  ),
  [ParameterId.Tax_ChildcareMaxAgeYears]: buildChildcareParameter(
    ParameterId.Tax_ChildcareMaxAgeYears,
    "maxChildAgeYears",
    {
      description: "Maximum child age threshold (< 14 years) qualifying for § 10 Abs. 1 Nr. 5 EStG childcare deductions.",
      domain: ParameterDomain.IncomeTax,
      unit: ParameterUnit.Years,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.EStG_10_1_5],
      bounds: { min: 1,
        max: 25,
        integerOnly: true },
    },
  ),

  // Social Security & Payroll Contribution Rules
  [ParameterId.Tax_HealthCapMonthly]: buildTaxParameter(ParameterId.Tax_HealthCapMonthly, "healthCapMonthly", {
    description: "Monthly contribution assessment ceiling (BBG KV/PV) for health and long-term care insurance.",
    domain: ParameterDomain.SocialSecurity,
    unit: ParameterUnit.MoneyEur,
    mutability: ParameterMutability.YearIndexed,
    lawIds: [LawId.SGB5_241, LawId.SGB11_55],
    bounds: { min: 1 },
  }),
  [ParameterId.Tax_PensionCapMonthly]: buildTaxParameter(ParameterId.Tax_PensionCapMonthly, "pensionCapMonthly", {
    description: "Unified nationwide monthly contribution assessment ceiling (BBG RV/AV) for pension and unemployment insurance.",
    domain: ParameterDomain.SocialSecurity,
    unit: ParameterUnit.MoneyEur,
    mutability: ParameterMutability.YearIndexed,
    lawIds: [LawId.SGB6_158, LawId.SGB3_341],
    bounds: { min: 1 },
  }),
  [ParameterId.Tax_TransitionFlatRate]: buildTaxParameter(ParameterId.Tax_TransitionFlatRate, "transitionFlatRate", {
    description: "Statutory 28% Midijob factor numerator governing transition-zone reduced employee contributions under § 20 Abs. 2a SGB IV.",
    domain: ParameterDomain.SocialSecurity,
    unit: ParameterUnit.PercentageRate,
    mutability: ParameterMutability.StatutoryFixed,
    lawIds: [LawId.SGB4_20, LawId.BVV_2],
    bounds: RATE_BOUNDS,
  }),
  [ParameterId.Tax_PriorYearBonusAllocationLastMonth]: buildTaxParameter(
    ParameterId.Tax_PriorYearBonusAllocationLastMonth,
    "priorYearBonusAllocationLastMonth",
    {
      description: "March rule cutoff month (month 3): bonuses paid Jan–Mar may fall under prior-year Märzklausel attribution per § 23a Abs. 4 SGB IV.",
      domain: ParameterDomain.SocialSecurity,
      unit: ParameterUnit.CalendarMonth,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.SGB4_23a],
      bounds: { min: 1,
        max: 12,
        integerOnly: true },
    },
  ),
  [ParameterId.Tax_HealthEmployeeRate]: buildTaxParameter(ParameterId.Tax_HealthEmployeeRate, "healthEmployeeRate", {
    description: "Employee half (7.3%) of the general 14.6% statutory health insurance contribution rate under § 241 SGB V.",
    domain: ParameterDomain.SocialSecurity,
    unit: ParameterUnit.PercentageRate,
    mutability: ParameterMutability.YearIndexed,
    lawIds: [LawId.SGB5_241, LawId.BVV_2],
    bounds: RATE_BOUNDS,
  }),
  [ParameterId.Tax_HealthSupplementTotalRate]: buildTaxParameter(
    ParameterId.Tax_HealthSupplementTotalRate,
    "healthSupplementTotalRate",
    {
      description: "Total health-insurer supplementary rate (Zusatzbeitrag, split 50/50 with employer); customizable to match personal Krankenkasse.",
      domain: ParameterDomain.SocialSecurity,
      unit: ParameterUnit.PercentageRate,
      mutability: ParameterMutability.Customizable,
      lawIds: [LawId.SGB5_241, LawId.BVV_2],
      bounds: { min: 0,
        max: 0.1 },
    },
  ),
  [ParameterId.Tax_PensionEmployeeRate]: buildTaxParameter(ParameterId.Tax_PensionEmployeeRate, "pensionEmployeeRate", {
    description: "Employee half (9.3%) of statutory pension insurance rate (18.6% total) under § 158 SGB VI.",
    domain: ParameterDomain.SocialSecurity,
    unit: ParameterUnit.PercentageRate,
    mutability: ParameterMutability.YearIndexed,
    lawIds: [LawId.SGB6_158, LawId.BVV_2],
    bounds: RATE_BOUNDS,
  }),
  [ParameterId.Tax_UnemploymentEmployeeRate]: buildTaxParameter(
    ParameterId.Tax_UnemploymentEmployeeRate,
    "unemploymentEmployeeRate",
    {
      description: "Employee half (1.3%) of statutory unemployment insurance rate (2.6% total) under § 341 SGB III.",
      domain: ParameterDomain.SocialSecurity,
      unit: ParameterUnit.PercentageRate,
      mutability: ParameterMutability.YearIndexed,
      lawIds: [LawId.SGB3_341, LawId.BVV_2],
      bounds: RATE_BOUNDS,
    },
  ),
  [ParameterId.Tax_CareEmployeeBaseRate]: buildTaxParameter(ParameterId.Tax_CareEmployeeBaseRate, "careEmployeeBaseRate", {
    description: "Employee standard half of statutory long-term care contribution under §§ 55, 58 SGB XI.",
    domain: ParameterDomain.SocialSecurity,
    unit: ParameterUnit.PercentageRate,
    mutability: ParameterMutability.YearIndexed,
    lawIds: [LawId.SGB11_55, LawId.SGB11_58],
    bounds: RATE_BOUNDS,
  }),
  [ParameterId.Tax_CareChildlessSurcharge]: buildTaxParameter(
    ParameterId.Tax_CareChildlessSurcharge,
    "careChildlessSurcharge",
    {
      description: "Employee-borne 0.6% surcharge on long-term care for childless insured persons aged 23+ under § 55 Abs. 3 SGB XI.",
      domain: ParameterDomain.SocialSecurity,
      unit: ParameterUnit.PercentageRate,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.SGB11_55],
      bounds: RATE_BOUNDS,
    },
  ),
  [ParameterId.Tax_CareChildDiscount]: buildTaxParameter(ParameterId.Tax_CareChildDiscount, "careChildDiscount", {
    description: "Employee care discount of 0.25% per qualifying child under age 25 from the 2nd to 5th child under § 55 Abs. 3 SGB XI.",
    domain: ParameterDomain.SocialSecurity,
    unit: ParameterUnit.PercentageRate,
    mutability: ParameterMutability.StatutoryFixed,
    lawIds: [LawId.SGB11_55],
    bounds: RATE_BOUNDS,
  }),
  [ParameterId.Tax_CareMaximumDiscountChildren]: buildTaxParameter(
    ParameterId.Tax_CareMaximumDiscountChildren,
    "careMaximumDiscountChildren",
    {
      description: "Maximum of 4 discounted children beyond the first child eligible for SGB XI § 55 rate relief.",
      domain: ParameterDomain.SocialSecurity,
      unit: ParameterUnit.ChildrenCount,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.SGB11_55],
      bounds: { min: 0,
        max: 10,
        integerOnly: true },
    },
  ),
  [ParameterId.Tax_CareChildAgeLimit]: buildTaxParameter(ParameterId.Tax_CareChildAgeLimit, "careChildAgeLimit", {
    description: "Maximum child age (25 years) qualifying for SGB XI § 55 care contribution discounts.",
    domain: ParameterDomain.SocialSecurity,
    unit: ParameterUnit.Years,
    mutability: ParameterMutability.StatutoryFixed,
    lawIds: [LawId.SGB11_55],
    bounds: { min: 1,
      max: 30,
      integerOnly: true },
  }),
  [ParameterId.Tax_CareChildlessMinimumAge]: buildTaxParameter(
    ParameterId.Tax_CareChildlessMinimumAge,
    "careChildlessMinimumAge",
    {
      description: "Minimum age (23 years) at which the childless long-term care surcharge starts under § 55 SGB XI.",
      domain: ParameterDomain.SocialSecurity,
      unit: ParameterUnit.Years,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.SGB11_55],
      bounds: { min: 18,
        max: 40,
        integerOnly: true },
    },
  ),
  [ParameterId.Tax_CareSaxonyExtraEmployeeRate]: buildTaxParameter(
    ParameterId.Tax_CareSaxonyExtraEmployeeRate,
    "careSaxonyExtraEmployeeRate",
    {
      description: "Saxony employee-only +0.5% base share offset under § 58 Abs. 3 SGB XI.",
      domain: ParameterDomain.SocialSecurity,
      unit: ParameterUnit.PercentageRate,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.SGB11_58],
      bounds: RATE_BOUNDS,
    },
  ),

  // Benefit Rules (BEEG / MuSchG / SGB)
  [ParameterId.Benefit_StandardReplacementRate]: buildBenefitParameter(
    ParameterId.Benefit_StandardReplacementRate,
    "standardReplacementRate",
    {
      description: "Standard 67% income replacement rate between €1,000 and €1,200 pre-birth net under § 2 Abs. 1 BEEG.",
      unit: ParameterUnit.PercentageRate,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_2],
      bounds: RATE_BOUNDS,
    },
  ),
  [ParameterId.Benefit_MinimumReplacementRate]: buildBenefitParameter(
    ParameterId.Benefit_MinimumReplacementRate,
    "minimumReplacementRate",
    {
      description: "Minimum 65% replacement rate above €1,240 pre-birth net under § 2 Abs. 2 BEEG.",
      unit: ParameterUnit.PercentageRate,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_2],
      bounds: RATE_BOUNDS,
    },
  ),
  [ParameterId.Benefit_MaximumReplacementRate]: buildBenefitParameter(
    ParameterId.Benefit_MaximumReplacementRate,
    "maximumReplacementRate",
    {
      description: "Maximum 100% replacement cap for low-income pre-birth net earners under § 2 Abs. 2 BEEG.",
      unit: ParameterUnit.PercentageRate,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_2],
      bounds: RATE_BOUNDS,
    },
  ),
  [ParameterId.Benefit_LowIncomeThreshold]: buildBenefitParameter(
    ParameterId.Benefit_LowIncomeThreshold,
    "lowIncomeThreshold",
    {
      description: "Pre-birth net threshold (€1,000) below which replacement climbs from 67% up toward 100% under § 2 BEEG.",
      unit: ParameterUnit.MoneyEur,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_2],
      bounds: MONEY_BOUNDS,
    },
  ),
  [ParameterId.Benefit_RateDecreaseThreshold]: buildBenefitParameter(
    ParameterId.Benefit_RateDecreaseThreshold,
    "rateDecreaseThreshold",
    {
      description: "Pre-birth net threshold (€1,200) above which replacement steps down from 67% toward 65% under § 2 BEEG.",
      unit: ParameterUnit.MoneyEur,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_2],
      bounds: MONEY_BOUNDS,
    },
  ),
  [ParameterId.Benefit_MinimumRateThreshold]: buildBenefitParameter(
    ParameterId.Benefit_MinimumRateThreshold,
    "minimumRateThreshold",
    {
      description: "Pre-birth net threshold (€1,240) at which replacement reaches the 65% floor under § 2 BEEG.",
      unit: ParameterUnit.MoneyEur,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_2],
      bounds: MONEY_BOUNDS,
    },
  ),
  [ParameterId.Benefit_RateChangePerEuro]: buildBenefitParameter(
    ParameterId.Benefit_RateChangePerEuro,
    "rateChangePerEuro",
    {
      description: "0.05 percentage point shift per euro in the €1,000–€1,240 BEEG replacement transition scale.",
      unit: ParameterUnit.PercentageRate,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_2],
      bounds: RATE_BOUNDS,
    },
  ),
  [ParameterId.Benefit_MaximumAssessableNet]: buildBenefitParameter(
    ParameterId.Benefit_MaximumAssessableNet,
    "maximumAssessableNet",
    {
      description: "Statutory €2,770 ceiling on monthly pre-birth BEEG assessable income under § 2 Abs. 1 Satz 3 BEEG.",
      unit: ParameterUnit.MoneyEur,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_2],
      bounds: MONEY_BOUNDS,
    },
  ),
  [ParameterId.Benefit_BasisMinimum]: buildBenefitParameter(
    ParameterId.Benefit_BasisMinimum,
    "basisMinimum",
    {
      description: "Guaranteed €300/month minimum Basiselterngeld floor (halved to €150 for Plus) under § 2 Abs. 4 BEEG.",
      unit: ParameterUnit.MoneyEur,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_2, LawId.BEEG_4a],
      bounds: MONEY_BOUNDS,
    },
  ),
  [ParameterId.Benefit_BasisMaximum]: buildBenefitParameter(
    ParameterId.Benefit_BasisMaximum,
    "basisMaximum",
    {
      description: "Statutory €1,800/month maximum Basiselterngeld cap (before sibling bonus) under § 2 Abs. 1 BEEG.",
      unit: ParameterUnit.MoneyEur,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_2],
      bounds: MONEY_BOUNDS,
    },
  ),
  [ParameterId.Benefit_PlusFraction]: buildBenefitParameter(
    ParameterId.Benefit_PlusFraction,
    "plusFraction",
    {
      description: "ElterngeldPlus 50% cap relative to the parent's full no-income Basis entitlement under § 4a Abs. 2 BEEG.",
      unit: ParameterUnit.PercentageRate,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_4a, LawId.BEEG_2],
      bounds: RATE_BOUNDS,
    },
  ),
  [ParameterId.Benefit_SiblingMinimumBasis]: buildBenefitParameter(
    ParameterId.Benefit_SiblingMinimumBasis,
    "siblingMinimumBasis",
    {
      description: "Minimum €75 Basis (€37.50 Plus) Geschwisterbonus addition when positive Elterngeld qualifies under § 2a BEEG.",
      unit: ParameterUnit.MoneyEur,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_2a, LawId.BEEG_4a],
      bounds: MONEY_BOUNDS,
    },
  ),
  [ParameterId.Benefit_SiblingRate]: buildBenefitParameter(
    ParameterId.Benefit_SiblingRate,
    "siblingRate",
    {
      description: "10% statutory Geschwisterbonus supplement under § 2a Abs. 1 BEEG.",
      unit: ParameterUnit.PercentageRate,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_2a],
      bounds: RATE_BOUNDS,
    },
  ),
  [ParameterId.Benefit_SiblingAgeLimitMonths]: buildBenefitParameter(
    ParameterId.Benefit_SiblingAgeLimitMonths,
    "siblingAgeLimitMonths",
    {
      description: "Age limit (< 36 months) for 1 qualifying older sibling to trigger § 2a BEEG Geschwisterbonus.",
      unit: ParameterUnit.Months,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_2a],
      bounds: POSITIVE_INT_MONTHS_BOUNDS,
    },
  ),
  [ParameterId.Benefit_SiblingMultipleAgeLimitMonths]: buildBenefitParameter(
    ParameterId.Benefit_SiblingMultipleAgeLimitMonths,
    "siblingMultipleAgeLimitMonths",
    {
      description: "Age limit (< 72 months) when 2+ qualifying older siblings trigger § 2a BEEG Geschwisterbonus.",
      unit: ParameterUnit.Months,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_2a],
      bounds: POSITIVE_INT_MONTHS_BOUNDS,
    },
  ),
  [ParameterId.Benefit_SiblingMultipleMinimumCount]: buildBenefitParameter(
    ParameterId.Benefit_SiblingMultipleMinimumCount,
    "siblingMultipleMinimumCount",
    {
      description: "Minimum 2 qualifying older siblings required for the higher 72-month § 2a BEEG age limit.",
      unit: ParameterUnit.ChildrenCount,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_2a],
      bounds: { min: 1,
        max: 10,
        integerOnly: true },
    },
  ),
  [ParameterId.Benefit_MaximumWeeklyHours]: buildBenefitParameter(
    ParameterId.Benefit_MaximumWeeklyHours,
    "maximumWeeklyHours",
    {
      description: "Statutory 32-hour/week maximum average working limit during Elterngeld receipt under § 1 Abs. 6 BEEG.",
      unit: ParameterUnit.HoursPerWeek,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_1, LawId.BEEG_4b],
      bounds: { min: 1,
        max: 60 },
    },
  ),
  [ParameterId.Benefit_PartnershipMinimumHours]: buildBenefitParameter(
    ParameterId.Benefit_PartnershipMinimumHours,
    "partnershipMinimumHours",
    {
      description: "Minimum 24-hour/week working threshold required from both parents for Partnerschaftsbonus under § 4b BEEG.",
      unit: ParameterUnit.HoursPerWeek,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_4b, LawId.BEEG_1],
      bounds: { min: 1,
        max: 60 },
    },
  ),
  [ParameterId.Benefit_PartnershipMinimumMonths]: buildBenefitParameter(
    ParameterId.Benefit_PartnershipMinimumMonths,
    "partnershipMinimumMonths",
    {
      description: "Minimum 2 consecutive life-months required to claim § 4b BEEG Partnership Bonus.",
      unit: ParameterUnit.Months,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_4b],
      bounds: POSITIVE_INT_MONTHS_BOUNDS,
    },
  ),
  [ParameterId.Benefit_PartnershipMaximumMonths]: buildBenefitParameter(
    ParameterId.Benefit_PartnershipMaximumMonths,
    "partnershipMaximumMonths",
    {
      description: "Maximum 4 consecutive life-months eligible per parent under § 4b BEEG Partnership Bonus.",
      unit: ParameterUnit.Months,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_4b],
      bounds: POSITIVE_INT_MONTHS_BOUNDS,
    },
  ),
  [ParameterId.Benefit_AssessmentMonths]: buildBenefitParameter(
    ParameterId.Benefit_AssessmentMonths,
    "assessmentMonths",
    {
      description: "12 eligible pre-birth calendar months inspected to establish BEEG income baseline under § 2b BEEG.",
      unit: ParameterUnit.Months,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_2b, LawId.BEEG_2c],
      bounds: POSITIVE_INT_MONTHS_BOUNDS,
    },
  ),
  [ParameterId.Benefit_FamilyBasisMonths]: buildBenefitParameter(
    ParameterId.Benefit_FamilyBasisMonths,
    "familyBasisMonths",
    {
      description: "Base 12 monthly Basiselterngeld budget (convertible 1:2 into ElterngeldPlus) under § 4 Abs. 3 BEEG.",
      unit: ParameterUnit.Months,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_4, LawId.BEEG_4a],
      bounds: POSITIVE_INT_MONTHS_BOUNDS,
    },
  ),
  [ParameterId.Benefit_AdditionalPartnerBasisMonths]: buildBenefitParameter(
    ParameterId.Benefit_AdditionalPartnerBasisMonths,
    "additionalPartnerBasisMonths",
    {
      description: "2 additional partner bonus Basiselterngeld months when both parents claim income replacement under § 4 Abs. 3 BEEG.",
      unit: ParameterUnit.Months,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_4],
      bounds: POSITIVE_INT_MONTHS_BOUNDS,
    },
  ),
  [ParameterId.Benefit_MinimumParentClaimMonths]: buildBenefitParameter(
    ParameterId.Benefit_MinimumParentClaimMonths,
    "minimumParentClaimMonths",
    {
      description: "Minimum 2-month claim rule per parent under § 4 Abs. 2 BEEG.",
      unit: ParameterUnit.Months,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_4],
      bounds: POSITIVE_INT_MONTHS_BOUNDS,
    },
  ),
  [ParameterId.Benefit_StandardHealthCareDeduction]: buildBenefitParameter(
    ParameterId.Benefit_StandardHealthCareDeduction,
    "standardHealthCareDeduction",
    {
      description: "Flat 9% BEEG standardized health and long-term care deduction under § 2f Abs. 1 Nr. 1 BEEG.",
      unit: ParameterUnit.PercentageRate,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_2f],
      bounds: RATE_BOUNDS,
    },
  ),
  [ParameterId.Benefit_StandardPensionDeduction]: buildBenefitParameter(
    ParameterId.Benefit_StandardPensionDeduction,
    "standardPensionDeduction",
    {
      description: "Flat 10% BEEG standardized pension deduction under § 2f Abs. 1 Nr. 2 BEEG.",
      unit: ParameterUnit.PercentageRate,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_2f],
      bounds: RATE_BOUNDS,
    },
  ),
  [ParameterId.Benefit_StandardUnemploymentDeduction]: buildBenefitParameter(
    ParameterId.Benefit_StandardUnemploymentDeduction,
    "standardUnemploymentDeduction",
    {
      description: "Flat 2% BEEG standardized unemployment deduction under § 2f Abs. 1 Nr. 3 BEEG.",
      unit: ParameterUnit.PercentageRate,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_2f],
      bounds: RATE_BOUNDS,
    },
  ),
  [ParameterId.Benefit_StandardChurchTaxRate]: buildBenefitParameter(
    ParameterId.Benefit_StandardChurchTaxRate,
    "standardChurchTaxRate",
    {
      description: "Uniform 8% BEEG standardized church tax rate applied when church-tax liable under § 2e Abs. 5 BEEG.",
      unit: ParameterUnit.PercentageRate,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_2e],
      bounds: RATE_BOUNDS,
    },
  ),
  [ParameterId.Benefit_OlderBenefitExclusionLifeMonths]: buildBenefitParameter(
    ParameterId.Benefit_OlderBenefitExclusionLifeMonths,
    "olderBenefitExclusionLifeMonths",
    {
      description: "Up to 14 life-months of earlier-child Elterngeld excluded from a later child's lookback under § 2b Abs. 1 Nr. 2 BEEG.",
      unit: ParameterUnit.Months,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.BEEG_2b],
      bounds: POSITIVE_INT_MONTHS_BOUNDS,
    },
  ),
  [ParameterId.Benefit_TransitionFlatRate]: buildBenefitParameter(
    ParameterId.Benefit_TransitionFlatRate,
    "transitionFlatRate",
    {
      description: "28% flat statutory Midijob factor numerator applied for BEEG transition-zone earners under § 20 SGB IV.",
      unit: ParameterUnit.PercentageRate,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.SGB4_20, LawId.BEEG_2f],
      bounds: RATE_BOUNDS,
    },
  ),
  [ParameterId.Benefit_MaternityAverageMonths]: buildBenefitParameter(
    ParameterId.Benefit_MaternityAverageMonths,
    "maternityAverageMonths",
    {
      description: "3 settled calendar months prior to protection averaged for Mutterschaftsgeld reference pay under § 20 MuSchG.",
      domain: ParameterDomain.MaternityProtection,
      unit: ParameterUnit.Months,
      mutability: ParameterMutability.StatutoryFixed,
      lawIds: [LawId.MuSchG_20, LawId.MuSchG_19],
      bounds: POSITIVE_INT_MONTHS_BOUNDS,
    },
  ),
  [ParameterId.Benefit_CoupleTaxableIncomeMaximum]: buildBenefitIncomeLimitParameter(),

  // Employment Corridor Thresholds
  [ParameterId.Employment_MarginalLimitMonthly]: buildEmploymentThresholdParameter(
    ParameterId.Employment_MarginalLimitMonthly,
    "marginal",
    {
      description: "Minijob monthly gross threshold (Geringfügigkeitsgrenze) dividing tax/BEEG standardized social treatment under § 20 SGB IV.",
      lawIds: [LawId.SGB4_20, LawId.BEEG_2f],
      bounds: { min: 1 },
    },
  ),
  [ParameterId.Employment_TransitionCeilingMonthly]: buildEmploymentThresholdParameter(
    ParameterId.Employment_TransitionCeilingMonthly,
    "transition",
    {
      description: "Midijob upper monthly ceiling (€2,000) above which regular employee social contributions apply under § 20 Abs. 2 SGB IV.",
      lawIds: [LawId.SGB4_20],
      bounds: { min: 1 },
    },
  ),

  // Customizable Planning Conventions
  [ParameterId.Convention_MaternityPreBirthMonths]: buildConventionParameter(
    ParameterId.Convention_MaternityPreBirthMonths,
    "maternityPreBirthMonths",
    [LawId.MuSchG_3, LawId.MuSchG_19],
    ParameterDomain.MaternityProtection,
  ),
  [ParameterId.Convention_MaternityPostBirthMonths]: buildConventionParameter(
    ParameterId.Convention_MaternityPostBirthMonths,
    "maternityPostBirthMonths",
    [LawId.MuSchG_3, LawId.BEEG_3],
    ParameterDomain.MaternityProtection,
  ),
  [ParameterId.Convention_MotherOrdinaryPlusMonths]: buildConventionParameter(
    ParameterId.Convention_MotherOrdinaryPlusMonths,
    "motherOrdinaryPlusMonths",
    [LawId.BEEG_4a, LawId.BEEG_4],
    ParameterDomain.PlanningAssumptions,
  ),
  [ParameterId.Convention_PartnershipBonusMonths]: buildConventionParameter(
    ParameterId.Convention_PartnershipBonusMonths,
    "partnershipBonusMonths",
    [LawId.BEEG_4b, LawId.BEEG_4],
    ParameterDomain.PlanningAssumptions,
  ),
  [ParameterId.Planning_AnnualInflationRate]: freezeDefinition({
    id: ParameterId.Planning_AnnualInflationRate,
    label: "Annual Inflation Rate (Purchasing Power Discount)",
    description: "Customizable annual CPI inflation assumption used to discount future nominal cash flows into real today's EUR purchasing power.",
    domain: ParameterDomain.PlanningAssumptions,
    unit: ParameterUnit.PercentageRate,
    mutability: ParameterMutability.Customizable,
    lawIds: [LawId.InflG, LawId.EStG_32a],
    defaultValue: 0.02,
    source: toSourceUrl("https://www.destatis.de/EN/Themes/Economy/Prices/Consumer-Price-Index/_node.html"),
    bounds: {
      min: 0,
      max: 0.25,
    },
  }),
  [ParameterId.Planning_AnnualWageGrowthRate]: freezeDefinition({
    id: ParameterId.Planning_AnnualWageGrowthRate,
    label: "Annual Nominal Wage Growth Rate",
    description: "Optional customizable annual compounding salary growth rate applied across multi-year parental planning timelines (0% default).",
    domain: ParameterDomain.PlanningAssumptions,
    unit: ParameterUnit.PercentageRate,
    mutability: ParameterMutability.Customizable,
    lawIds: [LawId.EStG_19, LawId.InflG],
    defaultValue: 0,
    source: toSourceUrl("https://www.gesetze-im-internet.de/estg/__19.html"),
    bounds: {
      min: 0,
      max: 0.25,
    },
  }),
  [ParameterId.Planning_AnnualBracketIndexRate]: freezeDefinition({
    id: ParameterId.Planning_AnnualBracketIndexRate,
    label: "Future Tax Bracket Indexing Rate (Post-2026)",
    description: "Optional annual upward shift applied to § 32a EStG Grundfreibetrag and tariff ceilings for unverified future years beyond published law (0% default).",
    domain: ParameterDomain.PlanningAssumptions,
    unit: ParameterUnit.PercentageRate,
    mutability: ParameterMutability.Customizable,
    lawIds: [LawId.InflG, LawId.EStG_32a],
    defaultValue: 0,
    source: toSourceUrl("https://www.recht.bund.de/bgbl/1/2024/449/regelungstext.pdf?__blob=publicationFile&v=3"),
    bounds: {
      min: 0,
      max: 0.25,
    },
  }),
});

/** Looks up a typed `ParameterDefinition` by `ParameterId`. */
export function getParameterDefinition(id: ParameterIdType): ParameterDefinition {
  return PARAMETER_REGISTRY[id];
}

/** Exhaustive compile-time mapping from `TaxParameters` keys to typed `ParameterId`s. */
export const TAX_KEY_TO_PARAMETER_ID: Readonly<Record<keyof TaxParameters, ParameterIdType>> = Object.freeze({
  progressionRatePercentDecimalPlaces: ParameterId.Tax_ProgressionRatePercentDecimalPlaces,
  basicAllowance: ParameterId.Tax_BasicAllowance,
  progression1Ceiling: ParameterId.Tax_Progression1Ceiling,
  progression2Ceiling: ParameterId.Tax_Progression2Ceiling,
  topRateCeiling: ParameterId.Tax_TopRateCeiling,
  progression1Quadratic: ParameterId.Tax_Progression1Quadratic,
  progression1Linear: ParameterId.Tax_Progression1Linear,
  progression2Quadratic: ParameterId.Tax_Progression2Quadratic,
  progression2Linear: ParameterId.Tax_Progression2Linear,
  progression2Constant: ParameterId.Tax_Progression2Constant,
  topRate: ParameterId.Tax_TopRate,
  topOffset: ParameterId.Tax_TopOffset,
  highestRate: ParameterId.Tax_HighestRate,
  highestOffset: ParameterId.Tax_HighestOffset,
  tariffDivisor: ParameterId.Tax_TariffDivisor,
  healthCapMonthly: ParameterId.Tax_HealthCapMonthly,
  pensionCapMonthly: ParameterId.Tax_PensionCapMonthly,
  transitionFlatRate: ParameterId.Tax_TransitionFlatRate,
  priorYearBonusAllocationLastMonth: ParameterId.Tax_PriorYearBonusAllocationLastMonth,
  healthEmployeeRate: ParameterId.Tax_HealthEmployeeRate,
  healthDeductibleFraction: ParameterId.Tax_HealthDeductibleFraction,
  ageReliefMinimumAge: ParameterId.Tax_AgeReliefMinimumAge,
  healthSupplementTotalRate: ParameterId.Tax_HealthSupplementTotalRate,
  pensionEmployeeRate: ParameterId.Tax_PensionEmployeeRate,
  unemploymentEmployeeRate: ParameterId.Tax_UnemploymentEmployeeRate,
  careEmployeeBaseRate: ParameterId.Tax_CareEmployeeBaseRate,
  careChildlessSurcharge: ParameterId.Tax_CareChildlessSurcharge,
  careChildDiscount: ParameterId.Tax_CareChildDiscount,
  careMaximumDiscountChildren: ParameterId.Tax_CareMaximumDiscountChildren,
  careChildAgeLimit: ParameterId.Tax_CareChildAgeLimit,
  careChildlessMinimumAge: ParameterId.Tax_CareChildlessMinimumAge,
  careSaxonyExtraEmployeeRate: ParameterId.Tax_CareSaxonyExtraEmployeeRate,
  pensionDeductibleFraction: ParameterId.Tax_PensionDeductibleFraction,
  otherInsuranceDeductionLimit: ParameterId.Tax_OtherInsuranceDeductionLimit,
  workExpenseAllowance: ParameterId.Tax_WorkExpenseAllowance,
  specialExpenseAllowance: ParameterId.Tax_SpecialExpenseAllowance,
  singleParentRelief: ParameterId.Tax_SingleParentRelief,
  singleParentExtraChildRelief: ParameterId.Tax_SingleParentExtraChildRelief,
  churchRateBavariaBadenWuerttemberg: ParameterId.Tax_ChurchRateBavariaBadenWuerttemberg,
  churchRateOther: ParameterId.Tax_ChurchRateOther,
  solidarityRate: ParameterId.Tax_SolidarityRate,
  solidarityMitigationRate: ParameterId.Tax_SolidarityMitigationRate,
  solidarityExemptionSingle: ParameterId.Tax_SolidarityExemptionSingle,
  childAllowanceAnnual: ParameterId.Tax_ChildAllowanceAnnual,
  childBenefitMonthly: ParameterId.Tax_ChildBenefitMonthly,
});

/** Resolves the primary statutory `LawId` governing a `TaxParameters` field. */
export function getTaxParameterPrimaryLawId(
  taxKey: keyof TaxParameters,
): LawIdType {
  return PARAMETER_REGISTRY[TAX_KEY_TO_PARAMETER_ID[taxKey]].lawIds[0];
}

/** Returns all parameter definitions in deterministic registry order. */
export function getAllParameterDefinitions(): readonly ParameterDefinition[] {
  return Object.values(PARAMETER_REGISTRY);
}

/** Returns all calendar years available across year-indexed parameters. */
export function getAvailableParameterYears(): readonly FullCalendarYear[] {
  const years = new Set<number>();
  for (const def of getAllParameterDefinitions()) {
    if (def.yearEntries) {
      for (const yearKey of Object.keys(def.yearEntries)) {
        years.add(Number(yearKey));
      }
    }
  }
  return Object.freeze(
    [...years].sort((a, b) => a - b).map((year) => toFullCalendarYear(year)),
  );
}

/** Returns every parameter explicitly governed by `lawId`. */
export function getParametersByLaw(lawId: LawIdType): readonly ParameterDefinition[] {
  return getAllParameterDefinitions().filter((def) => def.lawIds.includes(lawId));
}

/** Returns every parameter belonging to `domain`. */
export function getParametersByDomain(domain: ParameterDomainType): readonly ParameterDefinition[] {
  return getAllParameterDefinitions().filter((def) => def.domain === domain);
}

/** Resolves a parameter's baseline and active value for `requestedYear` and optional override map. */
export function resolveParameterForYear(
  id: ParameterIdType,
  requestedYear: FullCalendarYear = LATEST_TAX_YEAR,
  overrides: Readonly<Partial<Record<ParameterIdType, number>>> = {},
): ResolvedParameterValue {
  const definition = getParameterDefinition(id);
  let baselineValue = definition.defaultValue;
  let source = definition.source;
  let sourceYear: FullCalendarYear | undefined;
  let projected = false;

  if (definition.yearEntries) {
    const years = Object.keys(definition.yearEntries)
      .map(Number)
      .sort((a, b) => a - b);
    const matchingYear = years.filter((year) => year <= requestedYear).pop() ?? years[0];
    if (matchingYear !== undefined) {
      const entry = definition.yearEntries[toFullCalendarYear(matchingYear)];
      if (entry) {
        baselineValue = entry.value;
        source = entry.source;
        sourceYear = entry.year;
        projected = requestedYear !== entry.year;
      }
    }
  }

  const editable = definition.mutability === ParameterMutability.Customizable;
  const candidateOverride = editable ? overrides[id] : undefined;
  const activeValue = candidateOverride !== undefined ? candidateOverride : baselineValue;
  const overridden = editable && candidateOverride !== undefined && candidateOverride !== baselineValue;

  return Object.freeze({
    definition,
    requestedYear,
    sourceYear,
    baselineValue,
    activeValue,
    source,
    projected,
    overridden,
    editable,
  });
}

/**
 * Validates and attempts a value modification for `id`.
 * Unmodifiable parameters (`StatutoryFixed` or `YearIndexed`) always fail with an explicit
 * `ParameterModificationFlag` citing their governing `LawId`s.
 */
export function attemptParameterModification(
  id: ParameterIdType,
  nextValue: number,
): ParameterModificationResult {
  const def = getParameterDefinition(id);

  if (def.mutability === ParameterMutability.StatutoryFixed) {
    return {
      ok: false,
      flag: {
        parameterId: id,
        parameterLabel: def.label,
        code: ParameterFlagCode.StatutoryFixedLocked,
        attemptedValue: nextValue,
        message: `"${def.label}" is fixed by federal statute and cannot be modified by user overrides.`,
        lawIds: def.lawIds,
      },
    };
  }

  if (def.mutability === ParameterMutability.YearIndexed) {
    return {
      ok: false,
      flag: {
        parameterId: id,
        parameterLabel: def.label,
        code: ParameterFlagCode.YearIndexedLocked,
        attemptedValue: nextValue,
        message: `"${def.label}" is a published year-indexed statutory value. Switch the active tax/rule year instead of manually editing it.`,
        lawIds: def.lawIds,
      },
    };
  }

  if (!Number.isFinite(nextValue)) {
    return {
      ok: false,
      flag: {
        parameterId: id,
        parameterLabel: def.label,
        code: ParameterFlagCode.InvalidBounds,
        attemptedValue: nextValue,
        message: `"${def.label}" requires a finite numeric value.`,
        lawIds: def.lawIds,
      },
    };
  }

  const { min, max, integerOnly } = def.bounds;
  if (nextValue < min || (max !== undefined && nextValue > max) || (integerOnly && !Number.isInteger(nextValue))) {
    const rangeHint = max !== undefined ? `between ${min} and ${max}` : `at least ${min}`;
    const typeHint = integerOnly ? "whole number " : "";
    return {
      ok: false,
      flag: {
        parameterId: id,
        parameterLabel: def.label,
        code: ParameterFlagCode.InvalidBounds,
        attemptedValue: nextValue,
        message: `"${def.label}" must be a ${typeHint}value ${rangeHint}.`,
        lawIds: def.lawIds,
      },
    };
  }

  return {
    ok: true,
    value: nextValue,
  };
}

/** Searches and filters resolved parameters for a given calendar year and override map. */
export function searchParameters(
  query: string,
  filters: {
    readonly domain?: ParameterDomainType;
    readonly mutability?: ParameterMutabilityType;
    readonly year?: FullCalendarYear;
  } = {},
  overrides: Readonly<Partial<Record<ParameterIdType, number>>> = {},
): readonly ResolvedParameterValue[] {
  const year = filters.year ?? LATEST_TAX_YEAR;
  const normalized = query.trim().toLowerCase();

  return getAllParameterDefinitions()
    .filter((def) => {
      if (filters.domain && def.domain !== filters.domain) {
        return false;
      }
      if (filters.mutability && def.mutability !== filters.mutability) {
        return false;
      }
      if (!normalized) {
        return true;
      }
      return (
        def.label.toLowerCase().includes(normalized) ||
        def.description.toLowerCase().includes(normalized) ||
        def.id.toLowerCase().includes(normalized) ||
        def.lawIds.some((lawId) => lawId.toLowerCase().includes(normalized))
      );
    })
    .map((def) => resolveParameterForYear(def.id, year, overrides));
}

/** Formats a numeric parameter value according to its typed `ParameterUnit`. */
export function formatParameterValue(
  value: number,
  unit: ParameterUnitType,
): string {
  switch (unit) {
    case ParameterUnit.MoneyEur:
      return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
      }).format(value);
    case ParameterUnit.PercentageRate:
      return `${(value * 100).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
      })}%`;
    case ParameterUnit.HoursPerWeek:
      return `${value} h/wk`;
    case ParameterUnit.Months:
      return `${value} mo`;
    case ParameterUnit.CalendarMonth:
      return `Month ${value}`;
    case ParameterUnit.Years:
      return `${value} yr`;
    case ParameterUnit.ChildrenCount:
      return `${value} child${value === 1 ? "" : "ren"}`;
    case ParameterUnit.DecimalPlaces:
      return `${value} dp`;
  }
}
