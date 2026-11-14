import {
  type IncomeTaxTariffConstants,
} from "#engine/formulas/pure/incomeTaxFormulas";
import {
  type EuroAmount,
  type PercentageRate,
  toEuroAmount,
} from "#engine/types";

/**
 * Tier 1 Pure Mathematical Inflation, Wage Growth & § 32a Bracket Indexing Formulas (Context-Unaware).
 */

export interface PurchasingPowerDiscountFormulaInputs {
  readonly nominalAmount: EuroAmount;
  readonly annualInflationRate: PercentageRate;
  readonly elapsedMonths: number;
}

export interface PurchasingPowerDiscountFormulaResult {
  readonly purchasingPowerFactor: number;
  readonly realAmount: EuroAmount;
}

export interface CompoundedWageGrowthFormulaInputs {
  readonly baseAmount: EuroAmount;
  readonly annualGrowthRate: PercentageRate;
  readonly yearsElapsed: number;
}

export interface IndexedTaxBracketsFormulaInputs {
  readonly baseTariff: IncomeTaxTariffConstants;
  readonly annualIndexRate: PercentageRate;
  readonly yearsElapsed: number;
}

function roundToCent(amount: number): number {
  return Math.round(amount * 100 + Number.EPSILON * Math.abs(amount) * 100) / 100;
}

/**
 * Discounts a future nominal cash flow back into Month-1 real purchasing power using
 * compound monthly discounting `(1 + r) ^ (elapsedMonths / 12)`.
 * Preserves sign cleanly for both inflows (+) and outflows (-).
 */
export function evaluatePurchasingPowerDiscountFormula(
  inputs: Readonly<PurchasingPowerDiscountFormulaInputs>,
): PurchasingPowerDiscountFormulaResult {
  if (!Number.isFinite(inputs.nominalAmount)) {
    throw new TypeError("Nominal cash flow must be a finite number.");
  }
  if (!Number.isFinite(inputs.annualInflationRate) || inputs.annualInflationRate < 0 || inputs.annualInflationRate >= 1) {
    throw new TypeError("Annual inflation rate must be within [0, 1).");
  }
  if (!Number.isFinite(inputs.elapsedMonths) || inputs.elapsedMonths < 0) {
    throw new TypeError("Elapsed months must be non-negative.");
  }

  if (inputs.annualInflationRate === 0 || inputs.elapsedMonths === 0) {
    return Object.freeze({
      purchasingPowerFactor: 1,
      realAmount: inputs.nominalAmount,
    });
  }

  const purchasingPowerFactor = 1 / ((1 + inputs.annualInflationRate) ** (inputs.elapsedMonths / 12));
  return Object.freeze({
    purchasingPowerFactor,
    realAmount: toEuroAmount(roundToCent(inputs.nominalAmount * purchasingPowerFactor)),
  });
}

/**
 * Evaluates annual compounding nominal wage growth `baseAmount * (1 + g)^yearsElapsed`.
 */
export function evaluateCompoundedWageGrowthFormula(
  inputs: Readonly<CompoundedWageGrowthFormulaInputs>,
): EuroAmount {
  if (!Number.isFinite(inputs.baseAmount) || inputs.baseAmount < 0) {
    throw new TypeError("Base salary amount must be non-negative.");
  }
  if (!Number.isFinite(inputs.annualGrowthRate) || inputs.annualGrowthRate < 0 || inputs.annualGrowthRate >= 1) {
    throw new TypeError("Annual wage growth rate must be within [0, 1).");
  }
  if (!Number.isFinite(inputs.yearsElapsed) || inputs.yearsElapsed < 0) {
    throw new TypeError("Years elapsed must be non-negative.");
  }

  if (inputs.annualGrowthRate === 0 || inputs.yearsElapsed === 0 || inputs.baseAmount === 0) {
    return inputs.baseAmount;
  }

  return toEuroAmount(
    roundToCent(inputs.baseAmount * ((1 + inputs.annualGrowthRate) ** inputs.yearsElapsed)),
  );
}

/**
 * Projects § 32a Abs. 1 EStG tax tariff thresholds upward by `(1 + indexRate)^yearsElapsed`
 * while analytically recomputing polynomial coefficients (`progressionZone1QuadraticCoefficient`,
 * `progressionZone2QuadraticCoefficient`) and continuity offsets (`progressionZone2ConstantOffset`,
 * `topMarginalOffset`, `highestMarginalOffset`) so marginal rates and zone boundaries remain
 * continuously smooth without bracket creep (kalte Progression).
 */
export function evaluateIndexedTaxBracketsFormula(
  inputs: Readonly<IndexedTaxBracketsFormulaInputs>,
): IncomeTaxTariffConstants {
  if (!Number.isFinite(inputs.annualIndexRate) || inputs.annualIndexRate < 0 || inputs.annualIndexRate >= 1) {
    throw new TypeError("Annual bracket index rate must be within [0, 1).");
  }
  if (!Number.isInteger(inputs.yearsElapsed) || inputs.yearsElapsed < 0) {
    throw new TypeError("Years elapsed for bracket indexing must be a non-negative integer.");
  }

  const base = inputs.baseTariff;
  if (inputs.annualIndexRate === 0 || inputs.yearsElapsed === 0) {
    return Object.freeze({ ...base });
  }

  const factor = (1 + inputs.annualIndexRate) ** inputs.yearsElapsed;
  const basicAllowance = toEuroAmount(Math.round(base.basicAllowance * factor));
  const progressionZone1Ceiling = toEuroAmount(Math.round(base.progressionZone1Ceiling * factor));
  const progressionZone2Ceiling = toEuroAmount(Math.round(base.progressionZone2Ceiling * factor));
  const topRateCeiling = toEuroAmount(Math.round(base.topRateCeiling * factor));
  const divisor = base.tariffDivisor;

  const zone1Span = Math.max(1, progressionZone1Ceiling - basicAllowance);
  const zone2Span = Math.max(1, progressionZone2Ceiling - progressionZone1Ceiling);

  const l1 = base.progressionZone1LinearCoefficient;
  const l2 = base.progressionZone2LinearCoefficient;
  const q1 = roundToCent(((l2 - l1) * divisor) / (2 * zone1Span));

  const delta1 = zone1Span / divisor;
  const c2 = roundToCent((q1 * delta1 + l1) * delta1);

  const q2 = roundToCent(((base.topMarginalRate * divisor - l2) * divisor) / (2 * zone2Span));

  const delta2 = zone2Span / divisor;
  const taxAtZone2Ceiling = (q2 * delta2 + l2) * delta2 + c2;
  const topOffset = roundToCent(base.topMarginalRate * progressionZone2Ceiling - taxAtZone2Ceiling);
  const highestOffset = roundToCent(
    (base.highestMarginalRate - base.topMarginalRate) * topRateCeiling + topOffset,
  );

  return Object.freeze({
    basicAllowance,
    progressionZone1Ceiling,
    progressionZone2Ceiling,
    topRateCeiling,
    tariffDivisor: divisor,
    progressionZone1QuadraticCoefficient: q1,
    progressionZone1LinearCoefficient: l1,
    progressionZone2QuadraticCoefficient: q2,
    progressionZone2LinearCoefficient: l2,
    progressionZone2ConstantOffset: toEuroAmount(c2),
    topMarginalRate: base.topMarginalRate,
    topMarginalOffset: toEuroAmount(topOffset),
    highestMarginalRate: base.highestMarginalRate,
    highestMarginalOffset: toEuroAmount(highestOffset),
  });
}
