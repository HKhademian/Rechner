import {
  type EuroAmount,
  type PercentageRate,
  toEuroAmount,
} from "#engine/types";

/**
 * Tier 1 Pure Mathematical Childcare & § 10 Abs. 1 Nr. 5 EStG Deduction Formulas (Context-Unaware).
 *
 * All rates, age caps, income brackets, and sibling discounts are passed explicitly as named inputs.
 */

export interface ChildPaidFeeEntry {
  readonly annualPaidFee: EuroAmount;
  readonly childAgeYears: number;
}

export interface ChildcareTaxDeductionFormulaInputs {
  readonly paidFeesPerChild: readonly ChildPaidFeeEntry[];
  readonly deductibleFraction: PercentageRate;
  readonly maxAnnualDeductionPerChild: EuroAmount;
  readonly maxChildAgeYears: number;
}

export interface ChildcareTaxDeductionFormulaResult {
  readonly deductibleAmount: EuroAmount;
  readonly eligibleChildrenCount: number;
  readonly totalPaidEligibleFees: EuroAmount;
  readonly perChildDeductions: readonly EuroAmount[];
}

export interface MunicipalDaycareIncomeBracket {
  readonly maxAnnualGrossIncome: number | null;
  readonly monthlyFee: number;
}

export interface MunicipalDaycareFeeFormulaInputs {
  readonly householdAnnualGrossIncome: EuroAmount;
  readonly childAgeMonths: number;
  readonly siblingCareRank: number;
  readonly feeFreeFromAgeMonths: number | null;
  readonly siblingDiscountRateSecondChild: PercentageRate;
  readonly siblingDiscountRateThirdPlusChild: PercentageRate;
  /** Optional bracket-index step-down for 2nd child (e.g. Munich S580 § 7 Abs. 3 Nr. 2: 1 income bracket lower). */
  readonly siblingStepDownBrackets?: number;
  readonly incomeBrackets: readonly MunicipalDaycareIncomeBracket[];
}

export interface MunicipalDaycareFeeFormulaResult {
  readonly baseBracketFee: EuroAmount;
  readonly discountRateApplied: PercentageRate | 0;
  readonly netMonthlyFee: EuroAmount;
  readonly isFeeFreeByAge: boolean;
}

function roundToCent(amount: number): number {
  return Math.round(amount * 100 + Number.EPSILON * amount * 100) / 100;
}

/**
 * Evaluates annual deductible childcare expenses (Kinderbetreuungskosten) as
 * Sonderausgaben under § 10 Abs. 1 Nr. 5 EStG (2/3 capped at €4,000 through 2024;
 * 80% capped at €4,800 from 2025 per JStG 2024) for children under `maxChildAgeYears`.
 */
export function evaluateChildcareTaxDeductionFormula(
  inputs: Readonly<ChildcareTaxDeductionFormulaInputs>,
): ChildcareTaxDeductionFormulaResult {
  if (!Number.isFinite(inputs.maxAnnualDeductionPerChild) || inputs.maxAnnualDeductionPerChild < 0) {
    throw new TypeError("Maximum annual childcare deduction must be non-negative.");
  }
  if (!Number.isFinite(inputs.maxChildAgeYears) || inputs.maxChildAgeYears <= 0) {
    throw new TypeError("Maximum qualifying child age must be positive.");
  }

  const perChildDeductions: EuroAmount[] = [];
  let totalPaidEligibleFees = 0;
  let totalDeductible = 0;
  let eligibleChildrenCount = 0;

  for (const child of inputs.paidFeesPerChild) {
    if (!Number.isFinite(child.annualPaidFee) || child.annualPaidFee < 0) {
      throw new TypeError("Annual paid childcare fee must be non-negative.");
    }
    if (!Number.isFinite(child.childAgeYears) || child.childAgeYears < 0) {
      throw new TypeError("Child age in years must be non-negative.");
    }

    if (child.childAgeYears < inputs.maxChildAgeYears && child.annualPaidFee > 0) {
      eligibleChildrenCount += 1;
      totalPaidEligibleFees += child.annualPaidFee;
      const uncapped = roundToCent(child.annualPaidFee * inputs.deductibleFraction);
      const capped = Math.min(inputs.maxAnnualDeductionPerChild, uncapped);
      const euroCapped = toEuroAmount(capped);
      perChildDeductions.push(euroCapped);
      totalDeductible += euroCapped;
    }
    else {
      perChildDeductions.push(toEuroAmount(0));
    }
  }

  return Object.freeze({
    deductibleAmount: toEuroAmount(roundToCent(totalDeductible)),
    eligibleChildrenCount,
    totalPaidEligibleFees: toEuroAmount(roundToCent(totalPaidEligibleFees)),
    perChildDeductions: Object.freeze(perChildDeductions),
  });
}

/**
 * Evaluates the monthly parental fee contribution (Elternbeitrag) for one child
 * in an illustrative or official municipal income-tiered daycare schedule with
 * sibling discounts / bracket step-downs and statutory fee-free age thresholds.
 */
export function evaluateMunicipalDaycareFeeFormula(
  inputs: Readonly<MunicipalDaycareFeeFormulaInputs>,
): MunicipalDaycareFeeFormulaResult {
  if (!Number.isFinite(inputs.householdAnnualGrossIncome) || inputs.householdAnnualGrossIncome < 0) {
    throw new TypeError("Household annual gross income must be non-negative.");
  }
  if (!Number.isFinite(inputs.childAgeMonths) || inputs.childAgeMonths < 0) {
    throw new TypeError("Child age in months must be non-negative.");
  }
  if (!Number.isInteger(inputs.siblingCareRank) || inputs.siblingCareRank < 1) {
    throw new TypeError("Sibling care rank must be a whole integer >= 1.");
  }
  if (inputs.incomeBrackets.length === 0) {
    throw new TypeError("Municipal daycare table requires at least one income bracket.");
  }

  const foundIndex = inputs.incomeBrackets.findIndex(
    (bracket) =>
      bracket.maxAnnualGrossIncome === null ||
      inputs.householdAnnualGrossIncome <= bracket.maxAnnualGrossIncome,
  );
  const matchedIndex = foundIndex >= 0 ? foundIndex : inputs.incomeBrackets.length - 1;
  const matchedBracket = inputs.incomeBrackets[matchedIndex];

  const baseBracketFee = toEuroAmount(matchedBracket.monthlyFee);
  if (
    inputs.feeFreeFromAgeMonths !== null &&
    inputs.childAgeMonths >= inputs.feeFreeFromAgeMonths
  ) {
    return Object.freeze({
      baseBracketFee,
      discountRateApplied: 0,
      netMonthlyFee: toEuroAmount(0),
      isFeeFreeByAge: true,
    });
  }

  if (
    inputs.siblingCareRank === 2 &&
    inputs.siblingStepDownBrackets !== undefined &&
    inputs.siblingStepDownBrackets > 0
  ) {
    const steppedIndex = Math.max(0, matchedIndex - inputs.siblingStepDownBrackets);
    const steppedFee = toEuroAmount(inputs.incomeBrackets[steppedIndex].monthlyFee);
    const effectiveDiscount = baseBracketFee > 0
      ? Math.max(0, Math.min(1, roundToCent((baseBracketFee - steppedFee) / baseBracketFee)))
      : 0;
    return Object.freeze({
      baseBracketFee,
      discountRateApplied: effectiveDiscount as PercentageRate | 0,
      netMonthlyFee: steppedFee,
      isFeeFreeByAge: false,
    });
  }

  let discountRate: PercentageRate | 0 = 0;
  if (inputs.siblingCareRank === 2) {
    discountRate = inputs.siblingDiscountRateSecondChild;
  }
  else if (inputs.siblingCareRank >= 3) {
    discountRate = inputs.siblingDiscountRateThirdPlusChild;
  }

  const netFee = Math.max(0, roundToCent(baseBracketFee * (1 - discountRate)));
  return Object.freeze({
    baseBracketFee,
    discountRateApplied: discountRate,
    netMonthlyFee: toEuroAmount(netFee),
    isFeeFreeByAge: false,
  });
}
