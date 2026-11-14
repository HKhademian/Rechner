import {
  computed,
  signal,
} from "@preact/signals";
import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  evaluateHousingAcquisitionInContext,
} from "#engine/formulas/context/domainEvaluators";
import {
  type GermanFederalState,
  GermanFederalState as FederalStates,
  toGermanFederalState,
} from "#engine/formulas/pure/housingFormulas";
import {
  browserAppStorage,
} from "#engine/storage/appStorage";
import {
  type EuroAmount,
  type PercentageRate,
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";
import {
  unifiedLifeOverview,
  unifiedLifeProfile,
} from "#store/lifeProfileStore";
import {
  activeStatutoryContext,
} from "#store/parameterStore";

export interface HousingCalculatorState {
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
}

const HOUSING_STORAGE_KEY = "state";
const housingAppStorage = browserAppStorage(AppId.Housing);

export function createDefaultHousingState(): HousingCalculatorState {
  return Object.freeze({
    purchasePriceEur: toEuroAmount(480000),
    availableEquityEur: toEuroAmount(100000),
    federalState: FederalStates.NordrheinWestfalen,
    includesBrokerCommission: true,
    isOwnerOccupiedNewBuildOrKfw300Standard: true,
    isQngPlusCertified: false,
    dependentChildrenCount: 1,
    priorAverageHouseholdZvEEur: toEuroAmount(82000),
    renovationLaborCostEur: toEuroAmount(4000),
    marketMortgageAnnualInterestRate: toPercentageRate(0.036),
    initialAnnualRepaymentRate: toPercentageRate(0.02),
  });
}

function readNum(raw: unknown, fallback: number, min: number, max: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, raw));
}

function readBool(raw: unknown, fallback: boolean): boolean {
  return typeof raw === "boolean" ? raw : fallback;
}

function parseHousingState(raw: unknown): HousingCalculatorState {
  const defaults = createDefaultHousingState();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return defaults;
  }
  const obj = raw as Record<string, unknown>;
  let federalState = defaults.federalState;
  if (typeof obj.federalState === "string") {
    try {
      federalState = toGermanFederalState(obj.federalState);
    }
    catch {
      federalState = defaults.federalState;
    }
  }

  return Object.freeze({
    purchasePriceEur: toEuroAmount(readNum(obj.purchasePriceEur, defaults.purchasePriceEur, 10000, 10000000)),
    availableEquityEur: toEuroAmount(readNum(obj.availableEquityEur, defaults.availableEquityEur, 0, 10000000)),
    federalState,
    includesBrokerCommission: readBool(obj.includesBrokerCommission, defaults.includesBrokerCommission),
    isOwnerOccupiedNewBuildOrKfw300Standard: readBool(
      obj.isOwnerOccupiedNewBuildOrKfw300Standard,
      defaults.isOwnerOccupiedNewBuildOrKfw300Standard,
    ),
    isQngPlusCertified: readBool(obj.isQngPlusCertified, defaults.isQngPlusCertified),
    dependentChildrenCount: Math.round(
      readNum(obj.dependentChildrenCount, defaults.dependentChildrenCount, 0, 15),
    ),
    priorAverageHouseholdZvEEur: toEuroAmount(
      readNum(obj.priorAverageHouseholdZvEEur, defaults.priorAverageHouseholdZvEEur, 0, 1000000),
    ),
    renovationLaborCostEur: toEuroAmount(
      readNum(obj.renovationLaborCostEur, defaults.renovationLaborCostEur, 0, 200000),
    ),
    marketMortgageAnnualInterestRate: toPercentageRate(
      readNum(obj.marketMortgageAnnualInterestRate, defaults.marketMortgageAnnualInterestRate, 0.001, 0.15),
    ),
    initialAnnualRepaymentRate: toPercentageRate(
      readNum(obj.initialAnnualRepaymentRate, defaults.initialAnnualRepaymentRate, 0.005, 0.2),
    ),
  });
}

function loadHousingState(): HousingCalculatorState {
  const raw = housingAppStorage.getItem(HOUSING_STORAGE_KEY);
  if (!raw) {
    return createDefaultHousingState();
  }
  try {
    return parseHousingState(JSON.parse(raw));
  }
  catch {
    return createDefaultHousingState();
  }
}

export const housingState = signal<HousingCalculatorState>(loadHousingState());

export const housingEvaluation = computed(() => {
  const s = housingState.value;
  return evaluateHousingAcquisitionInContext(
    {
      purchasePriceEur: s.purchasePriceEur,
      availableEquityEur: s.availableEquityEur,
      federalState: s.federalState,
      includesBrokerCommission: s.includesBrokerCommission,
      isOwnerOccupiedNewBuildOrKfw300Standard: s.isOwnerOccupiedNewBuildOrKfw300Standard,
      isQngPlusCertified: s.isQngPlusCertified,
      dependentChildrenCount: s.dependentChildrenCount,
      priorAverageHouseholdZvEEur: s.priorAverageHouseholdZvEEur,
      renovationLaborCostEur: s.renovationLaborCostEur,
      marketMortgageAnnualInterestRate: s.marketMortgageAnnualInterestRate,
      initialAnnualRepaymentRate: s.initialAnnualRepaymentRate,
    },
    activeStatutoryContext.value,
  );
});

export function updateHousingField<K extends keyof HousingCalculatorState>(
  field: K,
  value: HousingCalculatorState[K],
): void {
  const next = parseHousingState({
    ...housingState.value,
    [field]: value,
  });
  housingState.value = next;
  housingAppStorage.setItem(HOUSING_STORAGE_KEY, JSON.stringify(next));
}

export function syncHousingFromLifeProfile(): void {
  const lp = unifiedLifeProfile.value;
  const overview = unifiedLifeOverview.value;
  const next = parseHousingState({
    ...housingState.value,
    purchasePriceEur: lp.targetPropertyPriceEur,
    availableEquityEur: lp.availableEquityEur,
    federalState: lp.federalState,
    includesBrokerCommission: lp.includesBrokerCommission,
    isOwnerOccupiedNewBuildOrKfw300Standard: lp.isKfw300NewBuild,
    isQngPlusCertified: lp.isQngPlusCertified,
    dependentChildrenCount: lp.dependentChildrenCount,
    priorAverageHouseholdZvEEur: overview.householdTax.estimatedTaxableIncomeZvEEur,
    renovationLaborCostEur: lp.annualRenovationLaborEur,
  });
  housingState.value = next;
  housingAppStorage.setItem(HOUSING_STORAGE_KEY, JSON.stringify(next));
}

export function resetHousingCalculator(): void {
  const defaults = createDefaultHousingState();
  housingState.value = defaults;
  housingAppStorage.removeItem(HOUSING_STORAGE_KEY);
}
