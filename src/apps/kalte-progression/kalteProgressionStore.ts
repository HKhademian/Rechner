import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  createScopedStateStore,
} from "#engine/storage/scopedStateStore";
import {
  VERIFIED_TAX_YEARS,
} from "#engine/tax/taxRules";
import {
  TaxClass,
} from "#engine/types";

export interface KalteProgressionState {
  readonly baseYear: number;
  readonly startingMonthlyGrossEur: number;
  readonly taxClass: TaxClass;
  readonly childrenCount: number;
  readonly horizonYears: number;
  readonly annualWageGrowthPct: number;
  readonly annualInflationPct: number;
  readonly annualBracketIndexPct: number;
}

const LATEST_YEAR = VERIFIED_TAX_YEARS[VERIFIED_TAX_YEARS.length - 1] ?? 2026;
const VALID_CLASSES = new Set<string>(Object.values(TaxClass));

const DEFAULT_STATE: KalteProgressionState = {
  baseYear: LATEST_YEAR,
  startingMonthlyGrossEur: 5200,
  taxClass: TaxClass.I,
  childrenCount: 0,
  horizonYears: 5,
  annualWageGrowthPct: 2.5,
  annualInflationPct: 2.5,
  annualBracketIndexPct: 2.5,
};

function clampNum(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
}

function parseState(raw: unknown): KalteProgressionState {
  if (typeof raw !== "object" || raw === null) {
    return DEFAULT_STATE;
  }
  const obj = raw as Record<string, unknown>;
  const rawYear = typeof obj.baseYear === "number" ? obj.baseYear : DEFAULT_STATE.baseYear;
  const baseYear = (VERIFIED_TAX_YEARS as readonly number[]).includes(rawYear) ? rawYear : DEFAULT_STATE.baseYear;
  const taxClass = typeof obj.taxClass === "string" && VALID_CLASSES.has(obj.taxClass)
    ? obj.taxClass as TaxClass
    : DEFAULT_STATE.taxClass;
  return {
    baseYear,
    startingMonthlyGrossEur: Math.round(clampNum(obj.startingMonthlyGrossEur, 500, 50000, DEFAULT_STATE.startingMonthlyGrossEur)),
    taxClass,
    childrenCount: Math.round(clampNum(obj.childrenCount, 0, 10, DEFAULT_STATE.childrenCount)),
    horizonYears: Math.round(clampNum(obj.horizonYears, 1, 10, DEFAULT_STATE.horizonYears)),
    annualWageGrowthPct: Math.round(clampNum(obj.annualWageGrowthPct, 0, 15, DEFAULT_STATE.annualWageGrowthPct) * 10) / 10,
    annualInflationPct: Math.round(clampNum(obj.annualInflationPct, 0, 15, DEFAULT_STATE.annualInflationPct) * 10) / 10,
    annualBracketIndexPct: Math.round(clampNum(obj.annualBracketIndexPct, 0, 15, DEFAULT_STATE.annualBracketIndexPct) * 10) / 10,
  };
}

export const kalteProgressionStore = createScopedStateStore<KalteProgressionState>({
  appId: AppId.KalteProgression,
  field: "state",
  createDefault: () => DEFAULT_STATE,
  parse: parseState,
});
