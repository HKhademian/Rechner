import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  TaxClassCombination,
  toTaxClassCombination,
} from "#engine/lifeProfile/taxSwitchEvent";
import {
  createScopedStateStore,
} from "#engine/storage/scopedStateStore";
import {
  VERIFIED_TAX_YEARS,
} from "#engine/tax/taxRules";

export interface TaxClassSwitchState {
  readonly taxYear: number;
  readonly primaryMonthlyGrossEur: number;
  readonly secondaryMonthlyGrossEur: number;
  readonly childrenCount: number;
  readonly initialCombination: TaxClassCombination;
  readonly targetCombination: TaxClassCombination;
  readonly switchMonth: number;
}

const LATEST_YEAR = VERIFIED_TAX_YEARS[VERIFIED_TAX_YEARS.length - 1] ?? 2026;

const DEFAULT_STATE: TaxClassSwitchState = {
  taxYear: LATEST_YEAR,
  primaryMonthlyGrossEur: 6000,
  secondaryMonthlyGrossEur: 2800,
  childrenCount: 0,
  initialCombination: TaxClassCombination.IV_IV,
  targetCombination: TaxClassCombination.III_V,
  switchMonth: 4,
};

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}

function parseCombo(value: unknown, fallback: TaxClassCombination): TaxClassCombination {
  if (typeof value === "string") {
    try {
      return toTaxClassCombination(value);
    }
    catch {
      return fallback;
    }
  }
  return fallback;
}

function parseState(raw: unknown): TaxClassSwitchState {
  if (typeof raw !== "object" || raw === null) {
    return DEFAULT_STATE;
  }
  const obj = raw as Record<string, unknown>;
  const rawYear = typeof obj.taxYear === "number" ? obj.taxYear : DEFAULT_STATE.taxYear;
  const taxYear = (VERIFIED_TAX_YEARS as readonly number[]).includes(rawYear) ? rawYear : DEFAULT_STATE.taxYear;
  return {
    taxYear,
    primaryMonthlyGrossEur: clampInt(obj.primaryMonthlyGrossEur, 0, 50000, DEFAULT_STATE.primaryMonthlyGrossEur),
    secondaryMonthlyGrossEur: clampInt(obj.secondaryMonthlyGrossEur, 0, 50000, DEFAULT_STATE.secondaryMonthlyGrossEur),
    childrenCount: clampInt(obj.childrenCount, 0, 10, DEFAULT_STATE.childrenCount),
    initialCombination: parseCombo(obj.initialCombination, DEFAULT_STATE.initialCombination),
    targetCombination: parseCombo(obj.targetCombination, DEFAULT_STATE.targetCombination),
    switchMonth: clampInt(obj.switchMonth, 1, 13, DEFAULT_STATE.switchMonth),
  };
}

export const taxClassSwitchStore = createScopedStateStore<TaxClassSwitchState>({
  appId: AppId.TaxClassSwitch,
  field: "state",
  createDefault: () => DEFAULT_STATE,
  parse: parseState,
});
