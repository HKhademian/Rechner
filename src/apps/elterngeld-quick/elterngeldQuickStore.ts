import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  createScopedStateStore,
} from "#engine/storage/scopedStateStore";

export interface ElterngeldQuickState {
  readonly birthYear: number;
  readonly birthMonth: number;
  readonly couplePriorYearZveEur: number;
  readonly preBirthMonthlyNetEur: number;
  readonly partTimeMonthlyNetEur: number;
  readonly partTimeWeeklyHours: number;
  readonly hasOlderSiblingUnder3: boolean;
  readonly hasTwoOlderSiblingsUnder6: boolean;
}

const DEFAULT_STATE: ElterngeldQuickState = {
  birthYear: 2026,
  birthMonth: 7,
  couplePriorYearZveEur: 120000,
  preBirthMonthlyNetEur: 2800,
  partTimeMonthlyNetEur: 0,
  partTimeWeeklyHours: 0,
  hasOlderSiblingUnder3: false,
  hasTwoOlderSiblingsUnder6: false,
};

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}

function parseState(raw: unknown): ElterngeldQuickState {
  if (typeof raw !== "object" || raw === null) {
    return DEFAULT_STATE;
  }
  const obj = raw as Record<string, unknown>;
  return {
    birthYear: clampInt(obj.birthYear, 2022, 2030, DEFAULT_STATE.birthYear),
    birthMonth: clampInt(obj.birthMonth, 1, 12, DEFAULT_STATE.birthMonth),
    couplePriorYearZveEur: clampInt(obj.couplePriorYearZveEur, 0, 500000, DEFAULT_STATE.couplePriorYearZveEur),
    preBirthMonthlyNetEur: clampInt(obj.preBirthMonthlyNetEur, 0, 20000, DEFAULT_STATE.preBirthMonthlyNetEur),
    partTimeMonthlyNetEur: clampInt(obj.partTimeMonthlyNetEur, 0, 20000, DEFAULT_STATE.partTimeMonthlyNetEur),
    partTimeWeeklyHours: clampInt(obj.partTimeWeeklyHours, 0, 48, DEFAULT_STATE.partTimeWeeklyHours),
    hasOlderSiblingUnder3: typeof obj.hasOlderSiblingUnder3 === "boolean" ? obj.hasOlderSiblingUnder3 : DEFAULT_STATE.hasOlderSiblingUnder3,
    hasTwoOlderSiblingsUnder6: typeof obj.hasTwoOlderSiblingsUnder6 === "boolean" ? obj.hasTwoOlderSiblingsUnder6 : DEFAULT_STATE.hasTwoOlderSiblingsUnder6,
  };
}

export const elterngeldQuickStore = createScopedStateStore<ElterngeldQuickState>({
  appId: AppId.ElterngeldQuick,
  field: "state",
  createDefault: () => DEFAULT_STATE,
  parse: parseState,
});
