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

export interface SalaryRaiseState {
  readonly taxYear: number;
  readonly currentMonthlyGrossEur: number;
  readonly raisePercent: number;
  readonly fixedMonthlyRaiseEur: number;
  readonly oneOffBonusEur: number;
  readonly taxClass: TaxClass;
  readonly childrenCount: number;
}

const LATEST_YEAR = VERIFIED_TAX_YEARS[VERIFIED_TAX_YEARS.length - 1] ?? 2026;
const VALID_CLASSES = new Set<string>(Object.values(TaxClass));

const DEFAULT_STATE: SalaryRaiseState = {
  taxYear: LATEST_YEAR,
  currentMonthlyGrossEur: 5000,
  raisePercent: 10,
  fixedMonthlyRaiseEur: 0,
  oneOffBonusEur: 3000,
  taxClass: TaxClass.I,
  childrenCount: 0,
};

function clampNum(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
}

function parseState(raw: unknown): SalaryRaiseState {
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
    currentMonthlyGrossEur: Math.round(clampNum(obj.currentMonthlyGrossEur, 0, 50000, DEFAULT_STATE.currentMonthlyGrossEur)),
    raisePercent: Math.round(clampNum(obj.raisePercent, 0, 100, DEFAULT_STATE.raisePercent) * 10) / 10,
    fixedMonthlyRaiseEur: Math.round(clampNum(obj.fixedMonthlyRaiseEur, 0, 20000, DEFAULT_STATE.fixedMonthlyRaiseEur)),
    oneOffBonusEur: Math.round(clampNum(obj.oneOffBonusEur, 0, 200000, DEFAULT_STATE.oneOffBonusEur)),
    taxClass,
    childrenCount: Math.round(clampNum(obj.childrenCount, 0, 10, DEFAULT_STATE.childrenCount)),
  };
}

export const salaryRaiseStore = createScopedStateStore<SalaryRaiseState>({
  appId: AppId.SalaryRaise,
  field: "state",
  createDefault: () => DEFAULT_STATE,
  parse: parseState,
});
