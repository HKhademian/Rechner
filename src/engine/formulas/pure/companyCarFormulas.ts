import {
  type EuroAmount,
  type PercentageRate,
  toEuroAmount,
} from "#engine/types";

/**
 * Tier 1 Pure Mathematical Company Car & Electric Mobility Formulas (Context-Unaware).
 *
 * Implements § 6 Abs. 1 Nr. 4 EStG (1% / 0.5% / 0.25% monthly private-use benefit-in-kind
 * valuation on rounded €100 gross list price with pure EV list-price ceiling) and § 8 Abs. 2 S. 3 EStG
 * (0.03% flat monthly commute vs. 0.002% per-actual-office-trip valuation).
 */

export const VehiclePowertrain = {
  CombustionIce: "combustion_ice",
  PlugInHybrid: "plug_in_hybrid",
  PureElectricEv: "pure_electric_ev",
} as const;
export type VehiclePowertrain = (typeof VehiclePowertrain)[keyof typeof VehiclePowertrain];

export function isVehiclePowertrain(value: string): value is VehiclePowertrain {
  return Object.values(VehiclePowertrain).includes(value as VehiclePowertrain);
}

export function toVehiclePowertrain(value: string): VehiclePowertrain {
  if (!isVehiclePowertrain(value)) {
    throw new TypeError(`Invalid VehiclePowertrain: "${value}"`);
  }
  return value;
}

export const CommuteValuationMethod = {
  MonthlyFlat003: "monthly_flat_003",
  PerTrip0002: "per_trip_0002",
} as const;
export type CommuteValuationMethod =
  (typeof CommuteValuationMethod)[keyof typeof CommuteValuationMethod];

export function isCommuteValuationMethod(value: string): value is CommuteValuationMethod {
  return Object.values(CommuteValuationMethod).includes(value as CommuteValuationMethod);
}

export function toCommuteValuationMethod(value: string): CommuteValuationMethod {
  if (!isCommuteValuationMethod(value)) {
    throw new TypeError(`Invalid CommuteValuationMethod: "${value}"`);
  }
  return value;
}

export interface CompanyCarBenefitFormulaInputs {
  readonly grossListPriceEur: EuroAmount;
  readonly powertrain: VehiclePowertrain;
  readonly commuteOneWayKm: number;
  readonly commuteValuationMethod: CommuteValuationMethod;
  readonly commuteOfficeDaysPerMonth: number;
  readonly combinedMarginalTaxAndSocialRate: PercentageRate;
  readonly iceMonthlyRate: PercentageRate;
  readonly phevMonthlyRate: PercentageRate;
  readonly evMonthlyRate: PercentageRate;
  readonly evGrossListPriceCap: EuroAmount;
  readonly commuteMonthlyKmRate: PercentageRate;
  readonly commuteDailyTripRate: PercentageRate;
}

export interface CompanyCarBenefitFormulaResult {
  readonly roundedListPrice: EuroAmount;
  readonly effectiveBasisMultiplier: PercentageRate;
  readonly effectiveAssessmentBasis: EuroAmount;
  readonly privateUseRateApplied: PercentageRate;
  readonly exceedsEvQuarterRateCap: boolean;
  readonly monthlyPrivateUseBenefit: EuroAmount;
  readonly monthlyCommuteBenefit: EuroAmount;
  readonly monthlyCommuteFlat003Alternative: EuroAmount;
  readonly monthlyCommutePerTripAlternative: EuroAmount;
  readonly perTripCommuteSavesMoney: boolean;
  readonly totalMonthlyImputedBenefit: EuroAmount;
  readonly totalAnnualImputedBenefit: EuroAmount;
  readonly estimatedMonthlyNetCost: EuroAmount;
  readonly estimatedAnnualNetCost: EuroAmount;
  readonly equivalentIceAnnualNetCost: EuroAmount;
  readonly annualTaxSavingsVsIce: EuroAmount;
}

function roundToCent(amount: number): number {
  return Math.round(amount * 100 + Number.EPSILON * amount * 100) / 100;
}

/**
 * Evaluates monthly and annual taxable benefit-in-kind (`geldwerter Vorteil`) for an
 * employer-provided vehicle used privately and for home-to-work commuting.
 */
export function evaluateCompanyCarBenefitFormula(
  inputs: Readonly<CompanyCarBenefitFormulaInputs>,
): CompanyCarBenefitFormulaResult {
  if (!Number.isFinite(inputs.grossListPriceEur) || inputs.grossListPriceEur <= 0) {
    throw new TypeError("Vehicle gross list price must be positive.");
  }
  if (!Number.isFinite(inputs.commuteOneWayKm) || inputs.commuteOneWayKm < 0) {
    throw new TypeError("One-way commute distance must be non-negative.");
  }
  if (
    !Number.isFinite(inputs.commuteOfficeDaysPerMonth) ||
    inputs.commuteOfficeDaysPerMonth < 0 ||
    inputs.commuteOfficeDaysPerMonth > 31
  ) {
    throw new TypeError("Monthly office commute days must be between 0 and 31.");
  }
  if (inputs.iceMonthlyRate <= 0) {
    throw new TypeError("ICE statutory reference rate must be positive.");
  }

  // § 6 Abs. 1 Nr. 4 EStG floors list price to the full €100
  const roundedListPrice = toEuroAmount(Math.floor(inputs.grossListPriceEur / 100) * 100);

  let privateUseRateApplied: PercentageRate = inputs.iceMonthlyRate;
  let exceedsEvQuarterRateCap = false;

  if (inputs.powertrain === VehiclePowertrain.PlugInHybrid) {
    privateUseRateApplied = inputs.phevMonthlyRate;
  }
  else if (inputs.powertrain === VehiclePowertrain.PureElectricEv) {
    if (inputs.grossListPriceEur <= inputs.evGrossListPriceCap) {
      privateUseRateApplied = inputs.evMonthlyRate;
    }
    else {
      privateUseRateApplied = inputs.phevMonthlyRate;
      exceedsEvQuarterRateCap = true;
    }
  }

  // Effective reduced basis (100%, 50%, or 25% depending on qualifying EV/PHEV promotion)
  const effectiveBasisRatio = privateUseRateApplied / inputs.iceMonthlyRate;
  const effectiveBasisMultiplier = effectiveBasisRatio as PercentageRate;
  const effectiveAssessmentBasis = toEuroAmount(
    roundToCent(roundedListPrice * effectiveBasisRatio),
  );

  const monthlyPrivateUseBenefit = toEuroAmount(
    roundToCent(roundedListPrice * privateUseRateApplied),
  );

  const monthlyCommuteFlat003Alternative = toEuroAmount(
    roundToCent(effectiveAssessmentBasis * inputs.commuteMonthlyKmRate * inputs.commuteOneWayKm),
  );
  const monthlyCommutePerTripAlternative = toEuroAmount(
    roundToCent(
      effectiveAssessmentBasis *
      inputs.commuteDailyTripRate *
      inputs.commuteOneWayKm *
      inputs.commuteOfficeDaysPerMonth,
    ),
  );

  const monthlyCommuteBenefit =
    inputs.commuteValuationMethod === CommuteValuationMethod.PerTrip0002
      ? monthlyCommutePerTripAlternative
      : monthlyCommuteFlat003Alternative;

  const perTripCommuteSavesMoney =
    monthlyCommutePerTripAlternative < monthlyCommuteFlat003Alternative;

  const totalMonthlyImputedBenefit = toEuroAmount(
    roundToCent(monthlyPrivateUseBenefit + monthlyCommuteBenefit),
  );
  const totalAnnualImputedBenefit = toEuroAmount(
    roundToCent(totalMonthlyImputedBenefit * 12),
  );

  const estimatedMonthlyNetCost = toEuroAmount(
    roundToCent(totalMonthlyImputedBenefit * inputs.combinedMarginalTaxAndSocialRate),
  );
  const estimatedAnnualNetCost = toEuroAmount(
    roundToCent(totalAnnualImputedBenefit * inputs.combinedMarginalTaxAndSocialRate),
  );

  // Side-by-side ICE comparison using exact same distance and commute election
  const iceMonthlyPrivate = roundedListPrice * inputs.iceMonthlyRate;
  const iceMonthlyCommute =
    inputs.commuteValuationMethod === CommuteValuationMethod.PerTrip0002
      ? roundedListPrice * inputs.commuteDailyTripRate * inputs.commuteOneWayKm * inputs.commuteOfficeDaysPerMonth
      : roundedListPrice * inputs.commuteMonthlyKmRate * inputs.commuteOneWayKm;
  const equivalentIceAnnualNetCost = toEuroAmount(
    roundToCent((iceMonthlyPrivate + iceMonthlyCommute) * 12 * inputs.combinedMarginalTaxAndSocialRate),
  );
  const annualTaxSavingsVsIce = toEuroAmount(
    roundToCent(Math.max(0, equivalentIceAnnualNetCost - estimatedAnnualNetCost)),
  );

  return Object.freeze({
    roundedListPrice,
    effectiveBasisMultiplier,
    effectiveAssessmentBasis,
    privateUseRateApplied,
    exceedsEvQuarterRateCap,
    monthlyPrivateUseBenefit,
    monthlyCommuteBenefit,
    monthlyCommuteFlat003Alternative,
    monthlyCommutePerTripAlternative,
    perTripCommuteSavesMoney,
    totalMonthlyImputedBenefit,
    totalAnnualImputedBenefit,
    estimatedMonthlyNetCost,
    estimatedAnnualNetCost,
    equivalentIceAnnualNetCost,
    annualTaxSavingsVsIce,
  });
}
