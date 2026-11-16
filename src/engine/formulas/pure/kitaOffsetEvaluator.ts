import {
  type MonthlyChildcareCostBreakdownItem,
  computeAnnualChildcareTaxDeduction,
  computeMonthlyChildcarePlanCosts,
  resolveChildcareTaxRulesForYear,
} from "#engine/benefits/childcare";
import {
  type AnnualTaxLiabilitySnapshot,
  computeAnnualDeductionTaxSavings,
  resolveTaxRulesForPlanningYear,
} from "#engine/formulas/pure/annualTaxDeltaHelper";
import {
  type EuroAmount,
  type FullCalendarYear,
  type GrossSalary,
  type PercentageRate,
  type FederalStateKitaPresetId,
  toEuroAmount,
  toFullCalendarYear,
  toPercentageRate,
} from "#engine/types";

export interface KitaOffsetInputs {
  readonly calendarYear: FullCalendarYear;
  readonly presetId: FederalStateKitaPresetId;
  readonly customMonthlyCareFeePerChildEur: EuroAmount;
  readonly monthlyMealFeePerChildEur: EuroAmount;
  readonly childAgesMonths: readonly number[];
  readonly careMonthsPerYear: number;
  readonly householdAnnualGrossEur: GrossSalary;
  readonly householdTaxableIncomeZvEEur: EuroAmount;
  readonly isMarriedJointAssessment: boolean;
  readonly hasChurchTax: boolean;
  readonly isBavariaOrBadenWuerttemberg: boolean;
  readonly deductibleFractionOverride?: PercentageRate;
  readonly maxAnnualDeductionPerChildOverride?: EuroAmount;
  readonly maxChildAgeYearsOverride?: number;
}

export interface KitaChildBreakdownRow {
  readonly childIndex: number;
  readonly ageMonths: number;
  readonly monthlyCareFeeEur: EuroAmount;
  readonly monthlyMealFeeEur: EuroAmount;
  readonly annualCareFeeEur: EuroAmount;
  readonly annualDeductibleEur: EuroAmount;
  readonly isFeeFreeByAge: boolean;
  readonly siblingCareRank: number;
}

export interface KitaOffsetEvaluationResult {
  readonly calendarYear: FullCalendarYear;
  readonly childcareRulesSourceYear: FullCalendarYear;
  readonly deductibleFraction: PercentageRate;
  readonly maxAnnualDeductionPerChildEur: EuroAmount;
  readonly maxChildAgeYears: number;
  readonly childrenCount: number;
  readonly careMonthsPerYear: number;
  readonly monthlyCareFeeTotalEur: EuroAmount;
  readonly monthlyMealFeeTotalEur: EuroAmount;
  readonly monthlyGrossOutflowEur: EuroAmount;
  readonly annualCareFeeTotalEur: EuroAmount;
  readonly annualMealFeeTotalEur: EuroAmount;
  readonly annualGrossOutflowEur: EuroAmount;
  readonly uncappedEligibleCareFeeDeductionEur: EuroAmount;
  readonly annualDeductibleSonderausgabenEur: EuroAmount;
  readonly annualTaxSavingsEur: EuroAmount;
  readonly monthlyTaxSavingsEur: EuroAmount;
  readonly netAnnualHouseholdCostEur: EuroAmount;
  readonly netMonthlyHouseholdCostEur: EuroAmount;
  readonly effectiveOffsetRate: PercentageRate;
  readonly baselineTax: AnnualTaxLiabilitySnapshot;
  readonly postDeductionTax: AnnualTaxLiabilitySnapshot;
  readonly perChildBreakdown: readonly KitaChildBreakdownRow[];
}

function roundToCent(amount: number): number {
  return Math.round(amount * 100 + Number.EPSILON * amount * 100) / 100;
}

/**
 * Evaluates monthly municipal/custom Kita care fees, non-deductible meal contributions,
 * § 10 Abs. 1 Nr. 5 EStG Sonderausgaben deduction, and the resulting annual/monthly tax refund
 * via the shared German income tax, solidarity surcharge, and church tax tariff.
 */
export function evaluateKitaFeeAndTaxOffset(
  inputs: Readonly<KitaOffsetInputs>,
): KitaOffsetEvaluationResult {
  if (!Number.isInteger(inputs.careMonthsPerYear) || inputs.careMonthsPerYear < 1 || inputs.careMonthsPerYear > 12) {
    throw new TypeError("Funded childcare months per year must be an integer between 1 and 12.");
  }
  if (!Number.isFinite(inputs.customMonthlyCareFeePerChildEur) || inputs.customMonthlyCareFeePerChildEur < 0) {
    throw new TypeError("Custom monthly childcare fee must be non-negative.");
  }
  if (!Number.isFinite(inputs.monthlyMealFeePerChildEur) || inputs.monthlyMealFeePerChildEur < 0) {
    throw new TypeError("Monthly meal contribution must be non-negative.");
  }
  if (!Number.isFinite(inputs.householdAnnualGrossEur) || inputs.householdAnnualGrossEur < 0) {
    throw new TypeError("Household annual gross income must be non-negative.");
  }
  if (!Number.isFinite(inputs.householdTaxableIncomeZvEEur) || inputs.householdTaxableIncomeZvEEur < 0) {
    throw new TypeError("Household taxable income (zvE) must be non-negative.");
  }
  if (inputs.childAgesMonths.length === 0 || inputs.childAgesMonths.length > 6) {
    throw new TypeError("Kita estimator requires between 1 and 6 children.");
  }

  const calendarYear = toFullCalendarYear(inputs.calendarYear);
  const childcareRules = resolveChildcareTaxRulesForYear(calendarYear);
  const deductibleFraction = inputs.deductibleFractionOverride ?? childcareRules.deductibleFraction;
  const maxAnnualDeductionPerChildEur = inputs.maxAnnualDeductionPerChildOverride ?? childcareRules.maxAnnualDeductionPerChild;
  const maxChildAgeYears = inputs.maxChildAgeYearsOverride ?? childcareRules.maxChildAgeYears;

  const activeChildren = inputs.childAgesMonths.map((ageMonths, idx) => {
    if (!Number.isFinite(ageMonths) || ageMonths < 0 || ageMonths > 216) {
      throw new TypeError("Child age in months must be between 0 and 216.");
    }
    return {
      childKey: `child-${idx + 1}`,
      ageMonths: Math.round(ageMonths),
    };
  });

  const carePlan = computeMonthlyChildcarePlanCosts(
    {
      enabled: true,
      presetId: inputs.presetId,
      customMonthlyFeePerChild: inputs.customMonthlyCareFeePerChildEur,
      startAgeMonths: 0,
      endAgeMonths: maxChildAgeYears * 12,
    },
    inputs.householdAnnualGrossEur,
    activeChildren,
  );

  const feeByChildKey = new Map<string, MonthlyChildcareCostBreakdownItem>(
    carePlan.perChildFees.map((item) => [item.childKey, item]),
  );

  const paidEntries = activeChildren.map((child) => {
    const planItem = feeByChildKey.get(child.childKey);
    const annualCareFee = toEuroAmount(
      roundToCent((planItem?.netMonthlyFee ?? 0) * inputs.careMonthsPerYear),
    );
    return {
      annualPaidFee: annualCareFee,
      childAgeYears: child.ageMonths / 12,
    };
  });

  const deductionResult = computeAnnualChildcareTaxDeduction(
    calendarYear,
    paidEntries,
    {
      deductibleFraction,
      maxAnnualDeductionPerChild: maxAnnualDeductionPerChildEur,
      maxChildAgeYears,
    },
  );

  const taxRules = resolveTaxRulesForPlanningYear(calendarYear);
  const churchTaxRate = inputs.hasChurchTax
    ? (inputs.isBavariaOrBadenWuerttemberg
      ? taxRules.parameters.churchRateBavariaBadenWuerttemberg.value
      : taxRules.parameters.churchRateOther.value)
    : toPercentageRate(0);

  const taxDelta = computeAnnualDeductionTaxSavings({
    baselineZvEEur: inputs.householdTaxableIncomeZvEEur,
    deductionEur: deductionResult.deductibleAmount,
    isMarriedJointAssessment: inputs.isMarriedJointAssessment,
    churchTaxRate,
    rules: taxRules,
  });

  const perChildBreakdown = activeChildren.map((child, idx): KitaChildBreakdownRow => {
    const planItem = feeByChildKey.get(child.childKey);
    const monthlyCareFeeEur = planItem?.netMonthlyFee ?? toEuroAmount(0);
    const monthlyMealFeeEur = inputs.monthlyMealFeePerChildEur;
    return Object.freeze({
      childIndex: idx + 1,
      ageMonths: child.ageMonths,
      monthlyCareFeeEur,
      monthlyMealFeeEur,
      annualCareFeeEur: paidEntries[idx].annualPaidFee,
      annualDeductibleEur: deductionResult.perChildDeductions[idx] ?? toEuroAmount(0),
      isFeeFreeByAge: planItem?.isFeeFreeByAge ?? false,
      siblingCareRank: planItem?.siblingCareRank ?? idx + 1,
    });
  });

  const monthlyCareFeeTotalEur = carePlan.totalMonthlyFee;
  const monthlyMealFeeTotalEur = toEuroAmount(
    roundToCent(inputs.monthlyMealFeePerChildEur * activeChildren.length),
  );
  const monthlyGrossOutflowEur = toEuroAmount(
    roundToCent(monthlyCareFeeTotalEur + monthlyMealFeeTotalEur),
  );
  const annualCareFeeTotalEur = toEuroAmount(
    roundToCent(monthlyCareFeeTotalEur * inputs.careMonthsPerYear),
  );
  const annualMealFeeTotalEur = toEuroAmount(
    roundToCent(monthlyMealFeeTotalEur * inputs.careMonthsPerYear),
  );
  const annualGrossOutflowEur = toEuroAmount(
    roundToCent(annualCareFeeTotalEur + annualMealFeeTotalEur),
  );
  const uncappedEligibleCareFeeDeductionEur = toEuroAmount(
    roundToCent(deductionResult.totalPaidEligibleFees * deductibleFraction),
  );

  const netAnnualHouseholdCostEur = toEuroAmount(
    roundToCent(Math.max(0, annualGrossOutflowEur - taxDelta.annualTaxSavingsEur)),
  );
  const netMonthlyHouseholdCostEur = toEuroAmount(
    roundToCent(netAnnualHouseholdCostEur / 12),
  );
  const effectiveOffsetRate = toPercentageRate(
    annualGrossOutflowEur > 0 ? taxDelta.annualTaxSavingsEur / annualGrossOutflowEur : 0,
  );

  return Object.freeze({
    calendarYear,
    childcareRulesSourceYear: childcareRules.sourceYear,
    deductibleFraction,
    maxAnnualDeductionPerChildEur,
    maxChildAgeYears,
    childrenCount: activeChildren.length,
    careMonthsPerYear: inputs.careMonthsPerYear,
    monthlyCareFeeTotalEur,
    monthlyMealFeeTotalEur,
    monthlyGrossOutflowEur,
    annualCareFeeTotalEur,
    annualMealFeeTotalEur,
    annualGrossOutflowEur,
    uncappedEligibleCareFeeDeductionEur,
    annualDeductibleSonderausgabenEur: deductionResult.deductibleAmount,
    annualTaxSavingsEur: taxDelta.annualTaxSavingsEur,
    monthlyTaxSavingsEur: taxDelta.monthlyTaxSavingsEur,
    netAnnualHouseholdCostEur,
    netMonthlyHouseholdCostEur,
    effectiveOffsetRate,
    baselineTax: taxDelta.baseline,
    postDeductionTax: taxDelta.reduced,
    perChildBreakdown: Object.freeze(perChildBreakdown),
  });
}
