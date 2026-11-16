import {
  type TaxRules,
} from "#engine/tax/taxRules";
import {
  getEmploymentThresholds,
} from "#engine/tax/employmentThresholds";
import {
  computeTransitionContributionBases,
} from "#engine/tax/transitionContributions";
import {
  computeGrossToNetBreakdown,
} from "#engine/tax/wageTax";
import {
  resolveTaxRulesForPlanningYear,
} from "#engine/formulas/pure/annualTaxDeltaHelper";
import {
  type ChildrenCount,
  type EuroAmount,
  type FullCalendarYear,
  type GrossSalary,
  type NetSalary,
  type PercentageRate,
  type TaxClass,
  toEuroAmount,
  toFullCalendarYear,
  toGrossSalary,
  toNetSalary,
  toPercentageRate,
} from "#engine/types";

export const EmploymentBand = {
  Zero: "zero",
  Minijob: "minijob",
  Midijob: "midijob",
  Regular: "regular",
} as const;
export type EmploymentBand = (typeof EmploymentBand)[keyof typeof EmploymentBand];

export function toEmploymentBand(value: string): EmploymentBand {
  if (!Object.values(EmploymentBand).includes(value as EmploymentBand)) {
    throw new TypeError(`Unknown employment band: ${value}`);
  }
  return value as EmploymentBand;
}

export const MinijobTaxMode = {
  EmployerFlat2Percent: "employer_flat_2pct",
  EmployeeTaxClass: "employee_tax_class",
} as const;
export type MinijobTaxMode = (typeof MinijobTaxMode)[keyof typeof MinijobTaxMode];

export function toMinijobTaxMode(value: string): MinijobTaxMode {
  if (!Object.values(MinijobTaxMode).includes(value as MinijobTaxMode)) {
    throw new TypeError(`Unknown minijob tax mode: ${value}`);
  }
  return value as MinijobTaxMode;
}

export interface MinijobTransitionInputs {
  readonly calendarYear: FullCalendarYear;
  readonly monthlyGrossEur: GrossSalary;
  readonly taxClass: TaxClass;
  readonly childrenCount: ChildrenCount;
  readonly hasChurchTax: boolean;
  readonly isBavariaOrBadenWuerttemberg: boolean;
  readonly inSaxony: boolean;
  readonly minijobPensionOptOut: boolean;
  readonly minijobTaxMode: MinijobTaxMode;
  readonly rulesOverride?: TaxRules;
}

export interface MinijobTransitionRow {
  readonly label: string;
  readonly monthlyGrossEur: GrossSalary;
  readonly employmentBand: EmploymentBand;
  readonly monthlyNetEur: NetSalary;
  readonly employeeSocialSecurityEur: EuroAmount;
  readonly employeeTaxEur: EuroAmount;
  readonly netRatio: PercentageRate;
  readonly employeeContributionBaseEur: GrossSalary;
  readonly pensionEntitlementBaseEur: GrossSalary;
}

export interface MinijobTransitionEvaluationResult {
  readonly calendarYear: FullCalendarYear;
  readonly taxRulesSourceYear: FullCalendarYear;
  readonly thresholdSourceYear: FullCalendarYear;
  readonly marginalLimitMonthlyEur: EuroAmount;
  readonly transitionCeilingMonthlyEur: EuroAmount;
  readonly transitionFactorF: PercentageRate;
  readonly current: MinijobTransitionRow;
  readonly healthInsuranceEur: EuroAmount;
  readonly careInsuranceEur: EuroAmount;
  readonly pensionInsuranceEur: EuroAmount;
  readonly unemploymentInsuranceEur: EuroAmount;
  readonly wageTaxEur: EuroAmount;
  readonly solidaritySurchargeEur: EuroAmount;
  readonly churchTaxEur: EuroAmount;
  readonly totalEmployeeDeductionsEur: EuroAmount;
  readonly estimatedEmployerMinijobLevyEur: EuroAmount;
  readonly midijobContributionSavingsPerMonthEur: EuroAmount;
  readonly milestoneComparisons: readonly MinijobTransitionRow[];
}

const MINIJOB_MIN_PENSION_BASE_EUR = 175;
const MINIJOB_EMPLOYER_PENSION_RATE = 0.15;
const MINIJOB_EMPLOYER_HEALTH_RATE = 0.13;
const MINIJOB_EMPLOYER_FLAT_TAX_RATE = 0.02;

function roundToCent(amount: number): number {
  return Math.round(amount * 100 + Number.EPSILON * amount * 100) / 100;
}

function classifyBand(
  monthlyGrossEur: number,
  marginalLimit: number,
  transitionCeiling: number,
): EmploymentBand {
  if (monthlyGrossEur <= 0) {
    return EmploymentBand.Zero;
  }
  if (monthlyGrossEur <= marginalLimit) {
    return EmploymentBand.Minijob;
  }
  if (monthlyGrossEur <= transitionCeiling) {
    return EmploymentBand.Midijob;
  }
  return EmploymentBand.Regular;
}

function evaluateSingleGrossPoint(
  label: string,
  monthlyGrossEur: GrossSalary,
  inputs: Readonly<MinijobTransitionInputs>,
  rules: TaxRules,
  marginalLimit: EuroAmount,
  transitionCeiling: EuroAmount,
) {
  const churchTaxRate = inputs.hasChurchTax
    ? (inputs.isBavariaOrBadenWuerttemberg
      ? rules.parameters.churchRateBavariaBadenWuerttemberg.value
      : rules.parameters.churchRateOther.value)
    : toPercentageRate(0);

  const payrollOptions = {
    saxony: inputs.inSaxony,
    churchTaxRate,
    expectedMonthlyEmploymentGross: monthlyGrossEur,
  };

  const band = classifyBand(monthlyGrossEur, marginalLimit, transitionCeiling);

  if (band === EmploymentBand.Zero) {
    const row: MinijobTransitionRow = Object.freeze({
      label,
      monthlyGrossEur: toGrossSalary(0),
      employmentBand: EmploymentBand.Zero,
      monthlyNetEur: toNetSalary(0),
      employeeSocialSecurityEur: toEuroAmount(0),
      employeeTaxEur: toEuroAmount(0),
      netRatio: toPercentageRate(0),
      employeeContributionBaseEur: toGrossSalary(0),
      pensionEntitlementBaseEur: toGrossSalary(0),
    });
    return {
      row,
      healthInsuranceEur: toEuroAmount(0),
      careInsuranceEur: toEuroAmount(0),
      pensionInsuranceEur: toEuroAmount(0),
      unemploymentInsuranceEur: toEuroAmount(0),
      wageTaxEur: toEuroAmount(0),
      solidaritySurchargeEur: toEuroAmount(0),
      churchTaxEur: toEuroAmount(0),
      estimatedEmployerMinijobLevyEur: toEuroAmount(0),
      midijobContributionSavingsPerMonthEur: toEuroAmount(0),
    };
  }

  if (band === EmploymentBand.Minijob) {
    const fullPensionRate = 2 * rules.parameters.pensionEmployeeRate.value;
    const topUpRate = Math.max(0, fullPensionRate - MINIJOB_EMPLOYER_PENSION_RATE);
    const pensionAssessedBase = Math.max(MINIJOB_MIN_PENSION_BASE_EUR, monthlyGrossEur);
    const pensionInsuranceEur = inputs.minijobPensionOptOut
      ? toEuroAmount(0)
      : toEuroAmount(roundToCent(pensionAssessedBase * topUpRate));

    let wageTaxEur = toEuroAmount(0);
    let solidaritySurchargeEur = toEuroAmount(0);
    let churchTaxEur = toEuroAmount(0);

    if (inputs.minijobTaxMode === MinijobTaxMode.EmployeeTaxClass) {
      const breakdown = computeGrossToNetBreakdown(
        monthlyGrossEur,
        inputs.taxClass,
        inputs.childrenCount,
        toEuroAmount(0),
        undefined,
        rules,
        payrollOptions,
      );
      wageTaxEur = breakdown.monthlyWageTax;
      solidaritySurchargeEur = breakdown.monthlySolidaritySurcharge;
      churchTaxEur = breakdown.monthlyChurchTax;
    }

    const employeeTaxEur = toEuroAmount(
      roundToCent(wageTaxEur + solidaritySurchargeEur + churchTaxEur),
    );
    const monthlyNetEur = toNetSalary(
      Math.max(0, roundToCent(monthlyGrossEur - pensionInsuranceEur - employeeTaxEur)),
    );
    const employerFlatTaxShare = inputs.minijobTaxMode === MinijobTaxMode.EmployerFlat2Percent
      ? MINIJOB_EMPLOYER_FLAT_TAX_RATE
      : 0;
    const estimatedEmployerMinijobLevyEur = toEuroAmount(
      roundToCent(
        monthlyGrossEur * (MINIJOB_EMPLOYER_HEALTH_RATE + MINIJOB_EMPLOYER_PENSION_RATE + employerFlatTaxShare),
      ),
    );

    const row: MinijobTransitionRow = Object.freeze({
      label,
      monthlyGrossEur,
      employmentBand: EmploymentBand.Minijob,
      monthlyNetEur,
      employeeSocialSecurityEur: pensionInsuranceEur,
      employeeTaxEur,
      netRatio: toPercentageRate(monthlyGrossEur > 0 ? monthlyNetEur / monthlyGrossEur : 0),
      employeeContributionBaseEur: toGrossSalary(inputs.minijobPensionOptOut ? 0 : pensionAssessedBase),
      pensionEntitlementBaseEur: toGrossSalary(inputs.minijobPensionOptOut ? 0 : monthlyGrossEur),
    });

    return {
      row,
      healthInsuranceEur: toEuroAmount(0),
      careInsuranceEur: toEuroAmount(0),
      pensionInsuranceEur,
      unemploymentInsuranceEur: toEuroAmount(0),
      wageTaxEur,
      solidaritySurchargeEur,
      churchTaxEur,
      estimatedEmployerMinijobLevyEur,
      midijobContributionSavingsPerMonthEur: toEuroAmount(0),
    };
  }

  const transitionBases = computeTransitionContributionBases(monthlyGrossEur, monthlyGrossEur, rules);
  const breakdown = computeGrossToNetBreakdown(
    monthlyGrossEur,
    inputs.taxClass,
    inputs.childrenCount,
    toEuroAmount(0),
    undefined,
    rules,
    payrollOptions,
  );

  // Compute unreduced baseline contributions when inside Midijob to show the § 20 SGB IV relief.
  let midijobContributionSavingsPerMonthEur = toEuroAmount(0);
  if (band === EmploymentBand.Midijob && transitionBases.employeeAssessment < monthlyGrossEur) {
    const standardRateWithoutMidijob =
      breakdown.healthInsuranceRate +
      breakdown.pensionInsuranceRate +
      breakdown.unemploymentInsuranceRate +
      breakdown.careInsuranceRate;
    const unreducedEstimate = roundToCent(monthlyGrossEur * standardRateWithoutMidijob);
    midijobContributionSavingsPerMonthEur = toEuroAmount(
      Math.max(0, roundToCent(unreducedEstimate - breakdown.totalSocialSecurity)),
    );
  }

  const row: MinijobTransitionRow = Object.freeze({
    label,
    monthlyGrossEur,
    employmentBand: band,
    monthlyNetEur: breakdown.monthlyNetTakeHome,
    employeeSocialSecurityEur: breakdown.totalSocialSecurity,
    employeeTaxEur: breakdown.totalTaxWithholding,
    netRatio: toPercentageRate(monthlyGrossEur > 0 ? breakdown.monthlyNetTakeHome / monthlyGrossEur : 0),
    employeeContributionBaseEur: transitionBases.employeeAssessment,
    pensionEntitlementBaseEur: monthlyGrossEur,
  });

  return {
    row,
    healthInsuranceEur: breakdown.healthInsurance,
    careInsuranceEur: breakdown.careInsurance,
    pensionInsuranceEur: breakdown.pensionInsurance,
    unemploymentInsuranceEur: breakdown.unemploymentInsurance,
    wageTaxEur: breakdown.monthlyWageTax,
    solidaritySurchargeEur: breakdown.monthlySolidaritySurcharge,
    churchTaxEur: breakdown.monthlyChurchTax,
    estimatedEmployerMinijobLevyEur: toEuroAmount(0),
    midijobContributionSavingsPerMonthEur,
  };
}

/**
 * Evaluates statutory Minijob (§ 8 SGB IV), Midijob Übergangsbereich (§ 20 Abs. 2 SGB IV),
 * and Regular employment (> €2,000) net take-home using the shared payroll & social contribution engines.
 */
export function evaluateMinijobMidijobTransition(
  inputs: Readonly<MinijobTransitionInputs>,
): MinijobTransitionEvaluationResult {
  if (!Number.isFinite(inputs.monthlyGrossEur) || inputs.monthlyGrossEur < 0) {
    throw new TypeError("Monthly gross pay must be non-negative.");
  }

  const calendarYear = toFullCalendarYear(inputs.calendarYear);
  const rules = inputs.rulesOverride ?? resolveTaxRulesForPlanningYear(calendarYear);
  const thresholds = getEmploymentThresholds(calendarYear);
  const marginalLimit = thresholds.marginal.value;
  const transitionCeiling = thresholds.transition.value;
  const factorInfo = computeTransitionContributionBases(
    toGrossSalary(marginalLimit + 1),
    toGrossSalary(marginalLimit + 1),
    rules,
  );

  const primary = evaluateSingleGrossPoint(
    "Selected monthly gross",
    inputs.monthlyGrossEur,
    inputs,
    rules,
    marginalLimit,
    transitionCeiling,
  );

  const midijobEntry = toGrossSalary(roundToCent(marginalLimit + 50));
  const midijobMidpoint = toGrossSalary(
    Math.min(transitionCeiling, Math.round((marginalLimit + transitionCeiling) / 2)),
  );
  const milestoneSpecs: readonly { readonly label: string;
    readonly gross: GrossSalary }[] = [
    { label: `Max Minijob (€${marginalLimit})`,
      gross: toGrossSalary(marginalLimit) },
    { label: `Midijob Entry (€${midijobEntry})`,
      gross: midijobEntry },
    { label: `Midijob Midpoint (€${midijobMidpoint})`,
      gross: midijobMidpoint },
    { label: `Midijob Ceiling (€${transitionCeiling})`,
      gross: toGrossSalary(transitionCeiling) },
  ];

  const milestoneComparisons = milestoneSpecs.map((spec) =>
    evaluateSingleGrossPoint(
      spec.label,
      spec.gross,
      inputs,
      rules,
      marginalLimit,
      transitionCeiling,
    ).row);

  const totalEmployeeDeductionsEur = toEuroAmount(
    roundToCent(primary.row.employeeSocialSecurityEur + primary.row.employeeTaxEur),
  );

  return Object.freeze({
    calendarYear,
    taxRulesSourceYear: rules.sourceYear,
    thresholdSourceYear: thresholds.sourceYear,
    marginalLimitMonthlyEur: marginalLimit,
    transitionCeilingMonthlyEur: transitionCeiling,
    transitionFactorF: factorInfo.factor,
    current: primary.row,
    healthInsuranceEur: primary.healthInsuranceEur,
    careInsuranceEur: primary.careInsuranceEur,
    pensionInsuranceEur: primary.pensionInsuranceEur,
    unemploymentInsuranceEur: primary.unemploymentInsuranceEur,
    wageTaxEur: primary.wageTaxEur,
    solidaritySurchargeEur: primary.solidaritySurchargeEur,
    churchTaxEur: primary.churchTaxEur,
    totalEmployeeDeductionsEur,
    estimatedEmployerMinijobLevyEur: primary.estimatedEmployerMinijobLevyEur,
    midijobContributionSavingsPerMonthEur: primary.midijobContributionSavingsPerMonthEur,
    milestoneComparisons: Object.freeze(milestoneComparisons),
  });
}
