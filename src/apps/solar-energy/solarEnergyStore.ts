import {
  computed,
  signal,
} from "@preact/signals";
import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  evaluateSolarEnergyYieldInContext,
} from "#engine/formulas/context/domainEvaluators";
import {
  type SolarFeedInMode,
  SolarFeedInMode as FeedInModes,
  toSolarFeedInMode,
} from "#engine/formulas/pure/solarEnergyFormulas";
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
  unifiedLifeProfile,
} from "#store/lifeProfileStore";
import {
  activeStatutoryContext,
} from "#store/parameterStore";

export interface SolarEnergyCalculatorState {
  readonly capacityKwp: number;
  readonly specificYieldKwhPerKwp: number;
  readonly systemCostNetEur: EuroAmount;
  readonly annualMaintenanceEur: EuroAmount;
  readonly annualHouseholdConsumptionKwh: number;
  readonly selfConsumptionShareRate: PercentageRate;
  readonly feedInMode: SolarFeedInMode;
  readonly vatExemptEligible: boolean;
}

const SOLAR_STORAGE_KEY = "state";
const solarAppStorage = browserAppStorage(AppId.SolarEnergy);

export function createDefaultSolarEnergyState(): SolarEnergyCalculatorState {
  return Object.freeze({
    capacityKwp: 10,
    specificYieldKwhPerKwp: 950,
    systemCostNetEur: toEuroAmount(14500),
    annualMaintenanceEur: toEuroAmount(150),
    annualHouseholdConsumptionKwh: 4500,
    selfConsumptionShareRate: toPercentageRate(0.32),
    feedInMode: FeedInModes.PartialSelfConsumption,
    vatExemptEligible: true,
  });
}

function readNum(raw: unknown, fallback: number, min: number, max: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, raw));
}

function parseSolarEnergyState(raw: unknown): SolarEnergyCalculatorState {
  const defaults = createDefaultSolarEnergyState();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return defaults;
  }
  const obj = raw as Record<string, unknown>;
  let feedInMode = defaults.feedInMode;
  if (typeof obj.feedInMode === "string") {
    try {
      feedInMode = toSolarFeedInMode(obj.feedInMode);
    }
    catch {
      feedInMode = defaults.feedInMode;
    }
  }

  return Object.freeze({
    capacityKwp: readNum(obj.capacityKwp, defaults.capacityKwp, 0.4, 100),
    specificYieldKwhPerKwp: readNum(obj.specificYieldKwhPerKwp, defaults.specificYieldKwhPerKwp, 400, 1400),
    systemCostNetEur: toEuroAmount(readNum(obj.systemCostNetEur, defaults.systemCostNetEur, 200, 250000)),
    annualMaintenanceEur: toEuroAmount(readNum(obj.annualMaintenanceEur, defaults.annualMaintenanceEur, 0, 10000)),
    annualHouseholdConsumptionKwh: readNum(
      obj.annualHouseholdConsumptionKwh,
      defaults.annualHouseholdConsumptionKwh,
      0,
      50000,
    ),
    selfConsumptionShareRate: toPercentageRate(
      readNum(obj.selfConsumptionShareRate, defaults.selfConsumptionShareRate, 0, 1),
    ),
    feedInMode,
    vatExemptEligible: typeof obj.vatExemptEligible === "boolean"
      ? obj.vatExemptEligible
      : defaults.vatExemptEligible,
  });
}

function loadSolarEnergyState(): SolarEnergyCalculatorState {
  const raw = solarAppStorage.getItem(SOLAR_STORAGE_KEY);
  if (!raw) {
    return createDefaultSolarEnergyState();
  }
  try {
    return parseSolarEnergyState(JSON.parse(raw));
  }
  catch {
    return createDefaultSolarEnergyState();
  }
}

export const solarEnergyState = signal<SolarEnergyCalculatorState>(loadSolarEnergyState());

export const solarEnergyEvaluation = computed(() => {
  const s = solarEnergyState.value;
  return evaluateSolarEnergyYieldInContext(
    {
      capacityKwp: s.capacityKwp,
      specificYieldKwhPerKwp: s.specificYieldKwhPerKwp,
      systemCostNetEur: s.systemCostNetEur,
      annualMaintenanceEur: s.annualMaintenanceEur,
      annualHouseholdConsumptionKwh: s.annualHouseholdConsumptionKwh,
      selfConsumptionShareRate: s.selfConsumptionShareRate,
      feedInMode: s.feedInMode,
      vatExemptEligible: s.vatExemptEligible,
    },
    activeStatutoryContext.value,
  );
});

export function updateSolarEnergyField<K extends keyof SolarEnergyCalculatorState>(
  field: K,
  value: SolarEnergyCalculatorState[K],
): void {
  const next = parseSolarEnergyState({
    ...solarEnergyState.value,
    [field]: value,
  });
  solarEnergyState.value = next;
  solarAppStorage.setItem(SOLAR_STORAGE_KEY, JSON.stringify(next));
}

export function syncSolarEnergyFromLifeProfile(): void {
  const lp = unifiedLifeProfile.value;
  const next = parseSolarEnergyState({
    ...solarEnergyState.value,
    capacityKwp: lp.solarCapacityKwp,
    systemCostNetEur: lp.solarSystemCostNetEur,
    annualHouseholdConsumptionKwh: lp.annualHouseholdElectricityKwh,
    feedInMode: lp.solarFeedInMode,
  });
  solarEnergyState.value = next;
  solarAppStorage.setItem(SOLAR_STORAGE_KEY, JSON.stringify(next));
}

export function resetSolarEnergyCalculator(): void {
  const defaults = createDefaultSolarEnergyState();
  solarEnergyState.value = defaults;
  solarAppStorage.removeItem(SOLAR_STORAGE_KEY);
}
