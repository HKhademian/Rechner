import {
  computed,
  signal,
} from "@preact/signals";
import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  evaluateCompanyCarBenefitInContext,
} from "#engine/formulas/context/domainEvaluators";
import {
  type CommuteValuationMethod,
  type VehiclePowertrain,
  CommuteValuationMethod as CommuteMethods,
  VehiclePowertrain as Powertrains,
  toCommuteValuationMethod,
  toVehiclePowertrain,
} from "#engine/formulas/pure/companyCarFormulas";
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

export interface CompanyCarCalculatorState {
  readonly grossListPriceEur: EuroAmount;
  readonly powertrain: VehiclePowertrain;
  readonly commuteOneWayKm: number;
  readonly commuteValuationMethod: CommuteValuationMethod;
  readonly commuteOfficeDaysPerMonth: number;
  readonly combinedMarginalTaxAndSocialRate: PercentageRate;
}

const COMPANY_CAR_STORAGE_KEY = "state";
const companyCarStorage = browserAppStorage(AppId.CompanyCar);

export function createDefaultCompanyCarState(): CompanyCarCalculatorState {
  return Object.freeze({
    grossListPriceEur: toEuroAmount(55000),
    powertrain: Powertrains.PureElectricEv,
    commuteOneWayKm: 18,
    commuteValuationMethod: CommuteMethods.MonthlyFlat003,
    commuteOfficeDaysPerMonth: 12,
    combinedMarginalTaxAndSocialRate: toPercentageRate(0.42),
  });
}

function readNum(raw: unknown, fallback: number, min: number, max: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, raw));
}

function parseCompanyCarState(raw: unknown): CompanyCarCalculatorState {
  const defaults = createDefaultCompanyCarState();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return defaults;
  }
  const obj = raw as Record<string, unknown>;
  let powertrain = defaults.powertrain;
  if (typeof obj.powertrain === "string") {
    try {
      powertrain = toVehiclePowertrain(obj.powertrain);
    }
    catch {
      powertrain = defaults.powertrain;
    }
  }
  let commuteValuationMethod = defaults.commuteValuationMethod;
  if (typeof obj.commuteValuationMethod === "string") {
    try {
      commuteValuationMethod = toCommuteValuationMethod(obj.commuteValuationMethod);
    }
    catch {
      commuteValuationMethod = defaults.commuteValuationMethod;
    }
  }

  return Object.freeze({
    grossListPriceEur: toEuroAmount(readNum(obj.grossListPriceEur, defaults.grossListPriceEur, 5000, 500000)),
    powertrain,
    commuteOneWayKm: readNum(obj.commuteOneWayKm, defaults.commuteOneWayKm, 0, 500),
    commuteValuationMethod,
    commuteOfficeDaysPerMonth: Math.round(
      readNum(obj.commuteOfficeDaysPerMonth, defaults.commuteOfficeDaysPerMonth, 0, 31),
    ),
    combinedMarginalTaxAndSocialRate: toPercentageRate(
      readNum(obj.combinedMarginalTaxAndSocialRate, defaults.combinedMarginalTaxAndSocialRate, 0, 0.6),
    ),
  });
}

function loadCompanyCarState(): CompanyCarCalculatorState {
  const raw = companyCarStorage.getItem(COMPANY_CAR_STORAGE_KEY);
  if (!raw) {
    return createDefaultCompanyCarState();
  }
  try {
    return parseCompanyCarState(JSON.parse(raw));
  }
  catch {
    return createDefaultCompanyCarState();
  }
}

export const companyCarState = signal<CompanyCarCalculatorState>(loadCompanyCarState());

export const companyCarEvaluation = computed(() => {
  const s = companyCarState.value;
  return evaluateCompanyCarBenefitInContext(
    {
      grossListPriceEur: s.grossListPriceEur,
      powertrain: s.powertrain,
      commuteOneWayKm: s.commuteOneWayKm,
      commuteValuationMethod: s.commuteValuationMethod,
      commuteOfficeDaysPerMonth: s.commuteOfficeDaysPerMonth,
      combinedMarginalTaxAndSocialRate: s.combinedMarginalTaxAndSocialRate,
    },
    activeStatutoryContext.value,
  );
});

export function updateCompanyCarField<K extends keyof CompanyCarCalculatorState>(
  field: K,
  value: CompanyCarCalculatorState[K],
): void {
  const next = parseCompanyCarState({
    ...companyCarState.value,
    [field]: value,
  });
  companyCarState.value = next;
  companyCarStorage.setItem(COMPANY_CAR_STORAGE_KEY, JSON.stringify(next));
}

export function syncCompanyCarFromLifeProfile(): void {
  const lp = unifiedLifeProfile.value;
  const next = parseCompanyCarState({
    ...companyCarState.value,
    grossListPriceEur: lp.companyCarListPriceEur,
    powertrain: lp.companyCarPowertrain,
    commuteOneWayKm: lp.commuteOneWayKm,
    commuteOfficeDaysPerMonth: lp.commuteOfficeDaysPerMonth,
    commuteValuationMethod: lp.commuteValuationMethod,
    combinedMarginalTaxAndSocialRate: lp.assumedMarginalTaxAndSocialRate,
  });
  companyCarState.value = next;
  companyCarStorage.setItem(COMPANY_CAR_STORAGE_KEY, JSON.stringify(next));
}

export function resetCompanyCarCalculator(): void {
  const defaults = createDefaultCompanyCarState();
  companyCarState.value = defaults;
  companyCarStorage.removeItem(COMPANY_CAR_STORAGE_KEY);
}
