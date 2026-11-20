import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  createScopedStateStore,
} from "#engine/storage/scopedStateStore";
import {
  VERIFIED_TAX_YEARS,
} from "#engine/tax/taxRules";

export interface ProgressionTaxState {
  readonly taxYear: number;
  readonly jointTaxableIncomeEur: number;
  readonly progressionBenefitsEur: number;
  readonly withheldIncomeTaxEur: number;
  readonly withheldSolzEur: number;
}

const LATEST_YEAR = VERIFIED_TAX_YEARS[VERIFIED_TAX_YEARS.length - 1] ?? 2026;

const DEFAULT_STATE: ProgressionTaxState = {
  taxYear: LATEST_YEAR,
  jointTaxableIncomeEur: 68000,
  progressionBenefitsEur: 14400,
  withheldIncomeTaxEur: 11200,
  withheldSolzEur: 0,
};

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}

function parseState(raw: unknown): ProgressionTaxState {
  if (typeof raw !== "object" || raw === null) {
    return DEFAULT_STATE;
  }
  const obj = raw as Record<string, unknown>;
  const rawYear = typeof obj.taxYear === "number" ? obj.taxYear : DEFAULT_STATE.taxYear;
  const taxYear = (VERIFIED_TAX_YEARS as readonly number[]).includes(rawYear) ? rawYear : DEFAULT_STATE.taxYear;
  return {
    taxYear,
    jointTaxableIncomeEur: clampInt(obj.jointTaxableIncomeEur, 0, 1000000, DEFAULT_STATE.jointTaxableIncomeEur),
    progressionBenefitsEur: clampInt(obj.progressionBenefitsEur, 0, 200000, DEFAULT_STATE.progressionBenefitsEur),
    withheldIncomeTaxEur: clampInt(obj.withheldIncomeTaxEur, 0, 500000, DEFAULT_STATE.withheldIncomeTaxEur),
    withheldSolzEur: clampInt(obj.withheldSolzEur, 0, 50000, DEFAULT_STATE.withheldSolzEur),
  };
}

export const progressionTaxStore = createScopedStateStore<ProgressionTaxState>({
  appId: AppId.ProgressionTax,
  field: "state",
  createDefault: () => DEFAULT_STATE,
  parse: parseState,
});
