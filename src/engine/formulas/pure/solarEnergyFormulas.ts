import {
  type EuroAmount,
  type PercentageRate,
  toEuroAmount,
} from "#engine/types";

/**
 * Tier 1 Pure Mathematical Residential Solar PV & EEG Energy Formulas (Context-Unaware).
 *
 * Implements § 48 EEG capacity-tiered feed-in remuneration (first 10 kWp vs. 10–40 kWp),
 * § 12 Abs. 3 UStG 0% VAT relief, and § 3 Nr. 72 EStG residential PV income tax exemption.
 */

export const SolarFeedInMode = {
  PartialSelfConsumption: "partial_self_consumption",
  FullFeedIn: "full_feed_in",
} as const;
export type SolarFeedInMode = (typeof SolarFeedInMode)[keyof typeof SolarFeedInMode];

export function isSolarFeedInMode(value: string): value is SolarFeedInMode {
  return Object.values(SolarFeedInMode).includes(value as SolarFeedInMode);
}

export function toSolarFeedInMode(value: string): SolarFeedInMode {
  if (!isSolarFeedInMode(value)) {
    throw new TypeError(`Invalid SolarFeedInMode: "${value}"`);
  }
  return value;
}

export interface SolarEnergyYieldFormulaInputs {
  readonly capacityKwp: number;
  readonly specificYieldKwhPerKwp: number;
  readonly systemCostNetEur: EuroAmount;
  readonly annualMaintenanceEur: EuroAmount;
  readonly annualHouseholdConsumptionKwh: number;
  readonly selfConsumptionShareRate: PercentageRate;
  readonly feedInMode: SolarFeedInMode;
  readonly gridElectricityPriceEurPerKwh: number;
  readonly eegPartialFirst10KwpEur: number;
  readonly eegFullFirst10KwpEur: number;
  readonly eegPartial10To40KwpEur: number;
  readonly eegFull10To40KwpEur: number;
  readonly incomeTaxExemptMaxKwp: number;
  readonly vatExemptEligible: boolean;
}

export interface SolarEnergyYieldFormulaResult {
  readonly annualGenerationKwh: number;
  readonly selfConsumedKwh: number;
  readonly fedInKwh: number;
  readonly blendedFeedInTariffEurPerKwh: number;
  readonly annualSelfConsumptionSavings: EuroAmount;
  readonly annualFeedInRevenue: EuroAmount;
  readonly annualNetCashBenefit: EuroAmount;
  readonly vatSavedAt19Percent: EuroAmount;
  readonly isZeroVatEligible: boolean;
  readonly isIncomeTaxExempt: boolean;
  readonly simplePaybackYears: number | null;
  readonly twentyYearNetGain: EuroAmount;
}

function roundToCent(amount: number): number {
  return Math.round(amount * 100 + Number.EPSILON * amount * 100) / 100;
}

/**
 * Evaluates annual electricity savings, capacity-tiered § 48 EEG feed-in revenue,
 * VAT savings (§ 12 Abs. 3 UStG), income-tax exemption (§ 3 Nr. 72 EStG), and payback.
 */
export function evaluateSolarEnergyYieldFormula(
  inputs: Readonly<SolarEnergyYieldFormulaInputs>,
): SolarEnergyYieldFormulaResult {
  if (!Number.isFinite(inputs.capacityKwp) || inputs.capacityKwp <= 0) {
    throw new TypeError("PV system capacity (kWp) must be positive.");
  }
  if (!Number.isFinite(inputs.specificYieldKwhPerKwp) || inputs.specificYieldKwhPerKwp <= 0) {
    throw new TypeError("Specific PV yield (kWh/kWp) must be positive.");
  }
  if (!Number.isFinite(inputs.systemCostNetEur) || inputs.systemCostNetEur < 0) {
    throw new TypeError("PV system cost must be non-negative.");
  }
  if (!Number.isFinite(inputs.annualHouseholdConsumptionKwh) || inputs.annualHouseholdConsumptionKwh < 0) {
    throw new TypeError("Household annual electricity consumption must be non-negative.");
  }

  const tier1Kwp = Math.min(inputs.capacityKwp, 10);
  const tier2Kwp = Math.max(0, Math.min(inputs.capacityKwp, 40) - 10);
  const cappedWeight = tier1Kwp + tier2Kwp;

  const rateTier1 =
    inputs.feedInMode === SolarFeedInMode.FullFeedIn
      ? inputs.eegFullFirst10KwpEur
      : inputs.eegPartialFirst10KwpEur;
  const rateTier2 =
    inputs.feedInMode === SolarFeedInMode.FullFeedIn
      ? inputs.eegFull10To40KwpEur
      : inputs.eegPartial10To40KwpEur;

  const blendedFeedInTariffEurPerKwh =
    cappedWeight > 0
      ? Math.round(((tier1Kwp * rateTier1 + tier2Kwp * rateTier2) / cappedWeight) * 100000) / 100000
      : rateTier2;

  const annualGenerationKwh = Math.round(inputs.capacityKwp * inputs.specificYieldKwhPerKwp);
  const selfConsumedKwh =
    inputs.feedInMode === SolarFeedInMode.FullFeedIn
      ? 0
      : Math.min(
        inputs.annualHouseholdConsumptionKwh,
        Math.round(annualGenerationKwh * inputs.selfConsumptionShareRate),
      );
  const fedInKwh = Math.max(0, annualGenerationKwh - selfConsumedKwh);

  const annualSelfConsumptionSavings = toEuroAmount(
    roundToCent(selfConsumedKwh * inputs.gridElectricityPriceEurPerKwh),
  );
  const annualFeedInRevenue = toEuroAmount(
    roundToCent(fedInKwh * blendedFeedInTariffEurPerKwh),
  );
  const annualNetCashBenefit = toEuroAmount(
    roundToCent(annualSelfConsumptionSavings + annualFeedInRevenue - inputs.annualMaintenanceEur),
  );

  const isZeroVatEligible =
    inputs.vatExemptEligible && inputs.capacityKwp <= inputs.incomeTaxExemptMaxKwp;
  const vatSavedAt19Percent = toEuroAmount(
    isZeroVatEligible ? roundToCent(inputs.systemCostNetEur * 0.19) : 0,
  );
  const isIncomeTaxExempt = inputs.capacityKwp <= inputs.incomeTaxExemptMaxKwp;

  const effectivePurchaseCost = isZeroVatEligible
    ? inputs.systemCostNetEur
    : inputs.systemCostNetEur * 1.19;

  const simplePaybackYears =
    annualNetCashBenefit > 0
      ? Math.round((effectivePurchaseCost / annualNetCashBenefit) * 10) / 10
      : null;

  const twentyYearNetGain = toEuroAmount(
    roundToCent(annualNetCashBenefit * 20 - effectivePurchaseCost),
  );

  return Object.freeze({
    annualGenerationKwh,
    selfConsumedKwh,
    fedInKwh,
    blendedFeedInTariffEurPerKwh,
    annualSelfConsumptionSavings,
    annualFeedInRevenue,
    annualNetCashBenefit,
    vatSavedAt19Percent,
    isZeroVatEligible,
    isIncomeTaxExempt,
    simplePaybackYears,
    twentyYearNetGain,
  });
}
