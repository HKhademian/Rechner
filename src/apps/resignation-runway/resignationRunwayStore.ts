import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  createScopedStateStore,
} from "#engine/storage/scopedStateStore";

export interface ResignationRunwayState {
  readonly openingSavingsEur: number;
  readonly finalPayEur: number;
  readonly monthlyExpensesEur: number;
  readonly jobSearchMonths: number;
  readonly waitingPeriodMonths: number;
  readonly monthlyBenefitEur: number;
  readonly newJobMonthlyNetEur: number;
  readonly horizonMonths: number;
}

function clampNum(value: unknown, fallback: number, min: number, max: number, integer = false): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  const bounded = Math.max(min, Math.min(max, value));
  return integer ? Math.round(bounded) : bounded;
}

export function createDefaultResignationRunwayState(): ResignationRunwayState {
  return Object.freeze({
    openingSavingsEur: 15000,
    finalPayEur: 2500,
    monthlyExpensesEur: 2800,
    jobSearchMonths: 4,
    waitingPeriodMonths: 3,
    monthlyBenefitEur: 1850,
    newJobMonthlyNetEur: 3600,
    horizonMonths: 12,
  });
}

function parseResignationRunwayState(raw: unknown): ResignationRunwayState {
  const d = createDefaultResignationRunwayState();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return d;
  }
  const r = raw as Record<string, unknown>;
  return Object.freeze({
    openingSavingsEur: clampNum(r.openingSavingsEur, d.openingSavingsEur, -1000000, 10000000),
    finalPayEur: clampNum(r.finalPayEur, d.finalPayEur, 0, 10000000),
    monthlyExpensesEur: clampNum(r.monthlyExpensesEur, d.monthlyExpensesEur, 0, 1000000),
    jobSearchMonths: clampNum(r.jobSearchMonths, d.jobSearchMonths, 0, 36, true),
    waitingPeriodMonths: clampNum(r.waitingPeriodMonths, d.waitingPeriodMonths, 0, 12, true),
    monthlyBenefitEur: clampNum(r.monthlyBenefitEur, d.monthlyBenefitEur, 0, 100000),
    newJobMonthlyNetEur: clampNum(r.newJobMonthlyNetEur, d.newJobMonthlyNetEur, 0, 500000),
    horizonMonths: clampNum(r.horizonMonths, d.horizonMonths, 1, 60, true),
  });
}

export const resignationRunwayStore = createScopedStateStore<ResignationRunwayState>({
  appId: AppId.ResignationRunway,
  createDefault: createDefaultResignationRunwayState,
  parse: parseResignationRunwayState,
});
