import {
  type Brand,
  type EuroAmount,
  type NetSalary,
  type PercentageRate,
  WageTaxZone,
  toEuroAmount,
} from "#engine/types";

/**
 * Tier 1 Pure Mathematical Income Tax Formulas (Context-Unaware).
 *
 * Every function in this module is strictly pure, immutable, and stateless:
 * all statutory thresholds, progression coefficients, surcharge rates, and caps
 * must be passed explicitly as named properties. Zero imports from registries,
 * JSON rule files, calculation contexts, or stores are permitted here.
 */

/**
 * Branded fractional special progression tax rate (0..1) truncated to statutory precision (§ 32b EStG).
 */
export type ProgressionTaxRate = Brand<number, "ProgressionTaxRate">;

/**
 * Validates and constructs a branded `ProgressionTaxRate`.
 */
export function toProgressionTaxRate(value: number): ProgressionTaxRate {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError("A progression tax rate must be a finite fraction from zero to one.");
  }
  return value as ProgressionTaxRate;
}

/**
 * Complete named statutory constants required by the German progressive income tax tariff (§ 32a Abs. 1 EStG).
 */
export interface IncomeTaxTariffConstants {
  readonly basicAllowance: EuroAmount;
  readonly progressionZone1Ceiling: EuroAmount;
  readonly progressionZone2Ceiling: EuroAmount;
  readonly topRateCeiling: EuroAmount;
  readonly tariffDivisor: EuroAmount;
  readonly progressionZone1QuadraticCoefficient: number;
  readonly progressionZone1LinearCoefficient: number;
  readonly progressionZone2QuadraticCoefficient: number;
  readonly progressionZone2LinearCoefficient: number;
  readonly progressionZone2ConstantOffset: EuroAmount;
  readonly topMarginalRate: PercentageRate;
  readonly topMarginalOffset: EuroAmount;
  readonly highestMarginalRate: PercentageRate;
  readonly highestMarginalOffset: EuroAmount;
}

/**
 * Named inputs for evaluating the statutory tax tariff zone (§ 32a Abs. 1 EStG).
 */
export interface IncomeTaxZoneFormulaInputs extends IncomeTaxTariffConstants {
  readonly annualTaxableIncome: number;
}

/**
 * Named inputs for evaluating annual German income tax (§ 32a Abs. 1 EStG).
 */
export interface AnnualIncomeTaxFormulaInputs extends IncomeTaxTariffConstants {
  readonly annualTaxableIncome: number;
}

/**
 * Named inputs for spousal splitting income tax (§ 32a Abs. 5 EStG).
 */
export interface SplittingTaxTariffFormulaInputs extends IncomeTaxTariffConstants {
  readonly primarySpouseTaxableIncome: number;
  readonly secondarySpouseTaxableIncome: number;
}

/**
 * Named inputs for joint progression-clause income tax (§§ 32a(5), 32b EStG).
 */
export interface ProgressionRateTaxFormulaInputs extends IncomeTaxTariffConstants {
  readonly taxableIncome: EuroAmount;
  readonly progressionIncome: EuroAmount;
  readonly ratePrecisionDecimalPlaces: number;
}

/**
 * Pure mathematical output of § 32b EStG progression-rate calculation.
 */
export interface ProgressionRateTaxFormulaResult {
  readonly incomeTax: EuroAmount;
  readonly rateIncome: EuroAmount;
  readonly hypotheticalTax: EuroAmount;
  readonly specialRate: ProgressionTaxRate | undefined;
}

/**
 * Named inputs for solidarity surcharge determination (§ 4 SolzG 1995).
 */
export interface SolidaritySurchargeFormulaInputs {
  readonly annualIncomeTax: EuroAmount;
  readonly singleAssessmentExemptionThreshold: EuroAmount;
  readonly isJointAssessment: boolean;
  readonly solidarityRate: PercentageRate;
  readonly mitigationZoneRate: PercentageRate;
}

/**
 * Named inputs for monthly tax-class swap withholding cashflow variance (§ 38b EStG).
 */
export interface SwapWithholdingVarianceFormulaInputs {
  readonly primaryClass3MonthlyNet: NetSalary;
  readonly primaryClass5MonthlyNet: NetSalary;
  readonly secondaryClass3MonthlyNet: NetSalary;
  readonly secondaryClass5MonthlyNet: NetSalary;
}

/**
 * Classifies floored annual taxable income into its § 32a Abs. 1 EStG tariff zone.
 */
export function evaluateIncomeTaxZoneFormula(
  inputs: Readonly<IncomeTaxZoneFormulaInputs>,
): WageTaxZone {
  const flooredIncome = Math.floor(inputs.annualTaxableIncome);
  if (flooredIncome <= inputs.basicAllowance) {
    return WageTaxZone.Zone1Null;
  }
  if (flooredIncome <= inputs.progressionZone1Ceiling) {
    return WageTaxZone.Zone2Progression1;
  }
  if (flooredIncome <= inputs.progressionZone2Ceiling) {
    return WageTaxZone.Zone3Progression2;
  }
  if (flooredIncome <= inputs.topRateCeiling) {
    return WageTaxZone.Zone4Proportional42;
  }
  return WageTaxZone.Zone5Reichensteuer45;
}

/**
 * Evaluates annual German income tax under § 32a Abs. 1 EStG.
 * Floors taxable income to whole euros before tariff evaluation and floors resulting tax to whole euros.
 */
export function evaluateIncomeTaxTariffFormula(
  inputs: Readonly<AnnualIncomeTaxFormulaInputs>,
): EuroAmount {
  if (!Number.isFinite(inputs.annualTaxableIncome)) {
    throw new TypeError("Annual taxable income must be finite.");
  }
  const flooredIncome = Math.max(0, Math.floor(inputs.annualTaxableIncome));
  if (flooredIncome <= inputs.basicAllowance) {
    return toEuroAmount(0);
  }

  let unroundedTax: number;
  if (flooredIncome <= inputs.progressionZone1Ceiling) {
    const scaledDelta = (flooredIncome - inputs.basicAllowance) / inputs.tariffDivisor;
    unroundedTax =
      (inputs.progressionZone1QuadraticCoefficient * scaledDelta + inputs.progressionZone1LinearCoefficient) *
      scaledDelta;
  }
  else if (flooredIncome <= inputs.progressionZone2Ceiling) {
    const scaledDelta = (flooredIncome - inputs.progressionZone1Ceiling) / inputs.tariffDivisor;
    unroundedTax =
      (inputs.progressionZone2QuadraticCoefficient * scaledDelta + inputs.progressionZone2LinearCoefficient) *
      scaledDelta +
      inputs.progressionZone2ConstantOffset;
  }
  else if (flooredIncome <= inputs.topRateCeiling) {
    unroundedTax = inputs.topMarginalRate * flooredIncome - inputs.topMarginalOffset;
  }
  else {
    unroundedTax = inputs.highestMarginalRate * flooredIncome - inputs.highestMarginalOffset;
  }

  return toEuroAmount(Math.max(0, Math.floor(unroundedTax)));
}

/**
 * Evaluates spousal joint splitting tariff under § 32a Abs. 5 EStG: `2 * Tariff((ZvE_1 + ZvE_2) / 2)`.
 */
export function evaluateSplittingTaxTariffFormula(
  inputs: Readonly<SplittingTaxTariffFormulaInputs>,
): EuroAmount {
  const combinedTaxableIncome = Math.max(
    0,
    inputs.primarySpouseTaxableIncome + inputs.secondarySpouseTaxableIncome,
  );
  const halfTaxableIncome = combinedTaxableIncome / 2;
  const halfTariffTax = evaluateIncomeTaxTariffFormula({
    ...inputs,
    annualTaxableIncome: halfTaxableIncome,
  });
  return toEuroAmount(halfTariffTax * 2);
}

/**
 * Evaluates joint splitting tax with positive progression-clause income (§§ 32a(5), 32b EStG).
 * Truncates the special rate to `ratePrecisionDecimalPlaces` percent decimal places via integer arithmetic.
 */
export function evaluateProgressionRateTaxFormula(
  inputs: Readonly<ProgressionRateTaxFormulaInputs>,
): ProgressionRateTaxFormulaResult {
  if (![inputs.taxableIncome, inputs.progressionIncome].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new TypeError("This progression model requires non-negative taxable income and benefits.");
  }
  if (!Number.isSafeInteger(inputs.ratePrecisionDecimalPlaces) || inputs.ratePrecisionDecimalPlaces < 0 || inputs.ratePrecisionDecimalPlaces > 6) {
    throw new TypeError("Tax-rate decimal places must be a whole count from zero to six.");
  }

  const flooredTaxable = Math.floor(inputs.taxableIncome);
  const combinedRateIncome = Math.floor(flooredTaxable + inputs.progressionIncome);
  const hypotheticalTax = toEuroAmount(
    2 * evaluateIncomeTaxTariffFormula({
      ...inputs,
      annualTaxableIncome: combinedRateIncome / 2,
    }),
  );

  if (inputs.progressionIncome === 0 || combinedRateIncome === 0) {
    return Object.freeze({
      incomeTax: hypotheticalTax,
      rateIncome: toEuroAmount(combinedRateIncome),
      hypotheticalTax,
      specialRate: undefined,
    });
  }

  // Two additional decimal places convert percentage precision into fractional-rate precision.
  const rateScale = 10 ** (inputs.ratePrecisionDecimalPlaces + 2);
  const truncatedRateUnits = BigInt(hypotheticalTax) * BigInt(rateScale) / BigInt(combinedRateIncome);
  const computedIncomeTax = toEuroAmount(
    Number(truncatedRateUnits * BigInt(flooredTaxable) / BigInt(rateScale)),
  );

  return Object.freeze({
    incomeTax: computedIncomeTax,
    rateIncome: toEuroAmount(combinedRateIncome),
    hypotheticalTax,
    specialRate: toProgressionTaxRate(Number(truncatedRateUnits) / rateScale),
  });
}

/**
 * Evaluates statutory solidarity surcharge with exemption threshold and mitigation zone (§ 4 SolzG 1995).
 */
export function evaluateSolidaritySurchargeFormula(
  inputs: Readonly<SolidaritySurchargeFormulaInputs>,
): EuroAmount {
  const effectiveExemptionThreshold =
    inputs.singleAssessmentExemptionThreshold * (inputs.isJointAssessment ? 2 : 1);
  const unroundedSurcharge = Math.max(
    0,
    Math.min(
      inputs.annualIncomeTax * inputs.solidarityRate,
      (inputs.annualIncomeTax - effectiveExemptionThreshold) * inputs.mitigationZoneRate,
    ),
  );
  return toEuroAmount(Math.floor(unroundedSurcharge * 100 + Number.EPSILON * unroundedSurcharge * 100) / 100);
}

/**
 * Evaluates temporary monthly household withholding cashflow variance when spouses switch classes III/V (§ 38b EStG).
 */
export function evaluateSwapWithholdingVarianceFormula(
  inputs: Readonly<SwapWithholdingVarianceFormulaInputs>,
): EuroAmount {
  const primaryNetReduction = inputs.primaryClass3MonthlyNet - inputs.primaryClass5MonthlyNet;
  const secondaryNetGain = inputs.secondaryClass3MonthlyNet - inputs.secondaryClass5MonthlyNet;
  return toEuroAmount(Math.max(0, primaryNetReduction - secondaryNetGain));
}
