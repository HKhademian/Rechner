import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  createScopedStateStore,
} from "#engine/storage/scopedStateStore";
import {
  VERIFIED_TAX_YEARS,
} from "#engine/tax/taxRules";

export interface KindergeldComparisonState {
  readonly taxYear: number;
  readonly jointAnnualZveEur: number;
  readonly childrenCount: number;
  readonly newbornBirthMonth: number;
}

const LATEST_YEAR = VERIFIED_TAX_YEARS[VERIFIED_TAX_YEARS.length - 1] ?? 2026;

const DEFAULT_STATE: KindergeldComparisonState = {
  taxYear: LATEST_YEAR,
  jointAnnualZveEur: 95000,
  childrenCount: 2,
  newbornBirthMonth: 0,
};

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}

function parseState(raw: unknown): KindergeldComparisonState {
  if (typeof raw !== "object" || raw === null) {
    return DEFAULT_STATE;
  }
  const obj = raw as Record<string, unknown>;
  const rawYear = typeof obj.taxYear === "number" ? obj.taxYear : DEFAULT_STATE.taxYear;
  const taxYear = (VERIFIED_TAX_YEARS as readonly number[]).includes(rawYear) ? rawYear : DEFAULT_STATE.taxYear;
  return {
    taxYear,
    jointAnnualZveEur: clampInt(obj.jointAnnualZveEur, 0, 1000000, DEFAULT_STATE.jointAnnualZveEur),
    childrenCount: clampInt(obj.childrenCount, 1, 6, DEFAULT_STATE.childrenCount),
    newbornBirthMonth: clampInt(obj.newbornBirthMonth, 0, 12, DEFAULT_STATE.newbornBirthMonth),
  };
}

export const kindergeldComparisonStore = createScopedStateStore<KindergeldComparisonState>({
  appId: AppId.KindergeldComparison,
  field: "state",
  createDefault: () => DEFAULT_STATE,
  parse: parseState,
});
