import {
  type EuroAmount,
  type PercentageRate,
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";

/**
 * Tier 1 Pure Mathematical German Home Acquisition, § 11 GrEStG Transfer Tax,
 * KfW 300 Family Home Ownership, and § 35a EStG Craftsmanship Credit Formulas (Context-Unaware).
 */

export const GermanFederalState = {
  BadenWuerttemberg: "BW",
  Bayern: "BY",
  Berlin: "BE",
  Brandenburg: "BB",
  Bremen: "HB",
  Hamburg: "HH",
  Hessen: "HE",
  MecklenburgVorpommern: "MV",
  Niedersachsen: "NI",
  NordrheinWestfalen: "NW",
  RheinlandPfalz: "RP",
  Saarland: "SL",
  Sachsen: "SN",
  SachsenAnhalt: "ST",
  SchleswigHolstein: "SH",
  Thueringen: "TH",
} as const;
export type GermanFederalState =
  (typeof GermanFederalState)[keyof typeof GermanFederalState];

export function isGermanFederalState(value: string): value is GermanFederalState {
  return Object.values(GermanFederalState).includes(value as GermanFederalState);
}

export function toGermanFederalState(value: string): GermanFederalState {
  if (!isGermanFederalState(value)) {
    throw new TypeError(`Invalid GermanFederalState: "${value}"`);
  }
  return value;
}

export const GERMAN_FEDERAL_STATE_LABELS: Readonly<Record<GermanFederalState, string>> = Object.freeze({
  [GermanFederalState.BadenWuerttemberg]: "Baden-Württemberg (5.0%)",
  [GermanFederalState.Bayern]: "Bayern / Bavaria (3.5%)",
  [GermanFederalState.Berlin]: "Berlin (6.0%)",
  [GermanFederalState.Brandenburg]: "Brandenburg (6.5%)",
  [GermanFederalState.Bremen]: "Bremen (5.5%)",
  [GermanFederalState.Hamburg]: "Hamburg (5.5%)",
  [GermanFederalState.Hessen]: "Hessen (6.0%)",
  [GermanFederalState.MecklenburgVorpommern]: "Mecklenburg-Vorpommern (6.0%)",
  [GermanFederalState.Niedersachsen]: "Niedersachsen (5.0%)",
  [GermanFederalState.NordrheinWestfalen]: "Nordrhein-Westfalen (6.5%)",
  [GermanFederalState.RheinlandPfalz]: "Rheinland-Pfalz (5.0%)",
  [GermanFederalState.Saarland]: "Saarland (6.5%)",
  [GermanFederalState.Sachsen]: "Sachsen (5.5%)",
  [GermanFederalState.SachsenAnhalt]: "Sachsen-Anhalt (5.0%)",
  [GermanFederalState.SchleswigHolstein]: "Schleswig-Holstein (6.5%)",
  [GermanFederalState.Thueringen]: "Thüringen (5.0%)",
});

/** Statutory Real Estate Transfer Tax rates (Grunderwerbsteuer, § 11 GrEStG) across all 16 Bundesländer. */
export const GERMAN_GRESTG_RATES: Readonly<Record<GermanFederalState, PercentageRate>> = Object.freeze({
  [GermanFederalState.BadenWuerttemberg]: toPercentageRate(0.05),
  [GermanFederalState.Bayern]: toPercentageRate(0.035),
  [GermanFederalState.Berlin]: toPercentageRate(0.06),
  [GermanFederalState.Brandenburg]: toPercentageRate(0.065),
  [GermanFederalState.Bremen]: toPercentageRate(0.055),
  [GermanFederalState.Hamburg]: toPercentageRate(0.055),
  [GermanFederalState.Hessen]: toPercentageRate(0.06),
  [GermanFederalState.MecklenburgVorpommern]: toPercentageRate(0.06),
  [GermanFederalState.Niedersachsen]: toPercentageRate(0.05),
  [GermanFederalState.NordrheinWestfalen]: toPercentageRate(0.065),
  [GermanFederalState.RheinlandPfalz]: toPercentageRate(0.05),
  [GermanFederalState.Saarland]: toPercentageRate(0.065),
  [GermanFederalState.Sachsen]: toPercentageRate(0.055),
  [GermanFederalState.SachsenAnhalt]: toPercentageRate(0.05),
  [GermanFederalState.SchleswigHolstein]: toPercentageRate(0.065),
  [GermanFederalState.Thueringen]: toPercentageRate(0.05),
});

export interface HousingAcquisitionFormulaInputs {
  readonly purchasePriceEur: EuroAmount;
  readonly availableEquityEur: EuroAmount;
  readonly federalState: GermanFederalState;
  readonly includesBrokerCommission: boolean;
  readonly isOwnerOccupiedNewBuildOrKfw300Standard: boolean;
  readonly isQngPlusCertified: boolean;
  readonly dependentChildrenCount: number;
  readonly priorAverageHouseholdZvEEur: EuroAmount;
  readonly renovationLaborCostEur: EuroAmount;
  readonly marketMortgageAnnualInterestRate: PercentageRate;
  readonly initialAnnualRepaymentRate: PercentageRate;
  readonly notaryLandRegistryRate: PercentageRate;
  readonly buyerBrokerCommissionRate: PercentageRate;
  readonly kfw300BaseIncomeLimit: EuroAmount;
  readonly kfw300ExtraChildIncomeIncrement: EuroAmount;
  readonly kfw300BaseLoan1To2Children: EuroAmount;
  readonly kfw300BaseLoan3To4Children: EuroAmount;
  readonly kfw300BaseLoan5PlusChildren: EuroAmount;
  readonly kfw300QngLoanBonus: EuroAmount;
  readonly craftsmanCreditRate: PercentageRate;
  readonly craftsmanCreditMaxAnnualEur: EuroAmount;
}

export interface HousingAcquisitionFormulaResult {
  readonly transferTaxRate: PercentageRate;
  readonly transferTaxEur: EuroAmount;
  readonly notaryAndRegistryEur: EuroAmount;
  readonly buyerBrokerFeeEur: EuroAmount;
  readonly totalClosingCostsEur: EuroAmount;
  readonly totalClosingCostPercent: PercentageRate;
  readonly totalCapitalRequirementEur: EuroAmount;
  readonly totalFinancingNeededEur: EuroAmount;
  readonly kfw300IncomeCeilingEur: EuroAmount;
  readonly kfw300Eligible: boolean;
  readonly kfw300MaxSubsidizedLoanEur: EuroAmount;
  readonly remainingBankLoanEur: EuroAmount;
  readonly estimatedMonthlyBankPaymentEur: EuroAmount;
  readonly craftsmanTaxCreditEur: EuroAmount;
  readonly netRenovationOutlayAfterTaxCreditEur: EuroAmount;
}

function roundToCent(amount: number): number {
  return Math.round(amount * 100 + Number.EPSILON * amount * 100) / 100;
}

/**
 * Evaluates full German home purchase closing costs (§ 11 GrEStG, notary/Grundbuch, broker),
 * KfW 300 family income eligibility and subsidized loan cap, bank financing gap + annuity,
 * and § 35a Abs. 3 EStG annual craftsmanship labor tax credit.
 */
export function evaluateHousingAcquisitionFormula(
  inputs: Readonly<HousingAcquisitionFormulaInputs>,
): HousingAcquisitionFormulaResult {
  if (!Number.isFinite(inputs.purchasePriceEur) || inputs.purchasePriceEur <= 0) {
    throw new TypeError("Property purchase price must be positive.");
  }
  if (!Number.isFinite(inputs.availableEquityEur) || inputs.availableEquityEur < 0) {
    throw new TypeError("Available equity must be non-negative.");
  }
  if (!Number.isInteger(inputs.dependentChildrenCount) || inputs.dependentChildrenCount < 0) {
    throw new TypeError("Dependent children count must be a non-negative integer.");
  }
  if (!Number.isFinite(inputs.renovationLaborCostEur) || inputs.renovationLaborCostEur < 0) {
    throw new TypeError("Renovation labor cost must be non-negative.");
  }

  const transferTaxRate = GERMAN_GRESTG_RATES[inputs.federalState];
  const transferTaxEur = toEuroAmount(roundToCent(inputs.purchasePriceEur * transferTaxRate));
  const notaryAndRegistryEur = toEuroAmount(
    roundToCent(inputs.purchasePriceEur * inputs.notaryLandRegistryRate),
  );
  const buyerBrokerFeeEur = toEuroAmount(
    inputs.includesBrokerCommission
      ? roundToCent(inputs.purchasePriceEur * inputs.buyerBrokerCommissionRate)
      : 0,
  );
  const totalClosingCostsEur = toEuroAmount(
    roundToCent(transferTaxEur + notaryAndRegistryEur + buyerBrokerFeeEur),
  );
  const totalClosingCostPercent = toPercentageRate(
    totalClosingCostsEur / inputs.purchasePriceEur,
  );

  const totalCapitalRequirementEur = toEuroAmount(
    roundToCent(inputs.purchasePriceEur + totalClosingCostsEur),
  );
  const totalFinancingNeededEur = toEuroAmount(
    roundToCent(Math.max(0, totalCapitalRequirementEur - inputs.availableEquityEur)),
  );

  let kfw300IncomeCeilingEur = toEuroAmount(0);
  let kfw300MaxLoanRaw = 0;

  if (inputs.dependentChildrenCount >= 1) {
    kfw300IncomeCeilingEur = toEuroAmount(
      roundToCent(
        inputs.kfw300BaseIncomeLimit +
        (inputs.dependentChildrenCount - 1) * inputs.kfw300ExtraChildIncomeIncrement,
      ),
    );
    const baseCap =
      inputs.dependentChildrenCount <= 2
        ? inputs.kfw300BaseLoan1To2Children
        : inputs.dependentChildrenCount <= 4
          ? inputs.kfw300BaseLoan3To4Children
          : inputs.kfw300BaseLoan5PlusChildren;
    kfw300MaxLoanRaw =
      baseCap + (inputs.isQngPlusCertified ? inputs.kfw300QngLoanBonus : 0);
  }

  const kfw300Eligible =
    inputs.dependentChildrenCount >= 1 &&
    inputs.isOwnerOccupiedNewBuildOrKfw300Standard &&
    inputs.priorAverageHouseholdZvEEur <= kfw300IncomeCeilingEur;

  const kfw300MaxSubsidizedLoanEur = toEuroAmount(
    kfw300Eligible ? Math.min(kfw300MaxLoanRaw, totalFinancingNeededEur) : 0,
  );
  const remainingBankLoanEur = toEuroAmount(
    roundToCent(Math.max(0, totalFinancingNeededEur - kfw300MaxSubsidizedLoanEur)),
  );

  const combinedAnnualAnnuityRate =
    inputs.marketMortgageAnnualInterestRate + inputs.initialAnnualRepaymentRate;
  const estimatedMonthlyBankPaymentEur = toEuroAmount(
    roundToCent((remainingBankLoanEur * combinedAnnualAnnuityRate) / 12),
  );

  const craftsmanTaxCreditEur = toEuroAmount(
    roundToCent(
      Math.min(
        inputs.craftsmanCreditMaxAnnualEur,
        inputs.renovationLaborCostEur * inputs.craftsmanCreditRate,
      ),
    ),
  );
  const netRenovationOutlayAfterTaxCreditEur = toEuroAmount(
    roundToCent(Math.max(0, inputs.renovationLaborCostEur - craftsmanTaxCreditEur)),
  );

  return Object.freeze({
    transferTaxRate,
    transferTaxEur,
    notaryAndRegistryEur,
    buyerBrokerFeeEur,
    totalClosingCostsEur,
    totalClosingCostPercent,
    totalCapitalRequirementEur,
    totalFinancingNeededEur,
    kfw300IncomeCeilingEur,
    kfw300Eligible,
    kfw300MaxSubsidizedLoanEur,
    remainingBankLoanEur,
    estimatedMonthlyBankPaymentEur,
    craftsmanTaxCreditEur,
    netRenovationOutlayAfterTaxCreditEur,
  });
}
