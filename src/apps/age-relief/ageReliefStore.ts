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

export interface AgeReliefState {
  readonly taxYear: number;
  readonly birthYear: number;
  readonly monthlyGrossEur: number;
  readonly taxClass: TaxClass;
}

const LATEST_YEAR = VERIFIED_TAX_YEARS[VERIFIED_TAX_YEARS.length - 1] ?? 2026;
const VALID_CLASSES = new Set<string>(Object.values(TaxClass));

const DEFAULT_STATE: AgeReliefState = {
  taxYear: LATEST_YEAR,
  birthYear: 1958,
  monthlyGrossEur: 4500,
  taxClass: TaxClass.I,
};

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}

function parseState(raw: unknown): AgeReliefState {
  if (typeof raw !== "object" || raw === null) {
    return DEFAULT_STATE;
  }
  const obj = raw as Record<string, unknown>;
  const rawYear = typeof obj.taxYear === "number" ? obj.taxYear : DEFAULT_STATE.taxYear;
  const taxYear = (VERIFIED_TAX_YEARS as readonly number[]).includes(rawYear) ? rawYear : DEFAULT_STATE.taxYear;
  const taxClass = typeof obj.taxClass === "string" && VALID_CLASSES.has(obj.taxClass)
    ? obj.taxClass as TaxClass
    : DEFAULT_STATE.taxClass;
  return {
    taxYear,
    birthYear: clampInt(obj.birthYear, 1935, 1995, DEFAULT_STATE.birthYear),
    monthlyGrossEur: clampInt(obj.monthlyGrossEur, 0, 50000, DEFAULT_STATE.monthlyGrossEur),
    taxClass,
  };
}

export const ageReliefStore = createScopedStateStore<AgeReliefState>({
  appId: AppId.AgeRelief,
  field: "state",
  createDefault: () => DEFAULT_STATE,
  parse: parseState,
});
