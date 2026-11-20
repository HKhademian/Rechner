import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  createScopedStateStore,
} from "#engine/storage/scopedStateStore";

export interface MutterschutzState {
  readonly expectedDueDate: string;
  readonly preBirthMonthlyNetEur: number;
  readonly extendedPostBirth: boolean;
}

const DEFAULT_STATE: MutterschutzState = {
  expectedDueDate: "2026-10-15",
  preBirthMonthlyNetEur: 3100,
  extendedPostBirth: false,
};

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function clampNet(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(30000, Math.round(value)));
}

function parseState(raw: unknown): MutterschutzState {
  if (typeof raw !== "object" || raw === null) {
    return DEFAULT_STATE;
  }
  const obj = raw as Record<string, unknown>;
  return {
    expectedDueDate: isIsoDate(obj.expectedDueDate) ? obj.expectedDueDate : DEFAULT_STATE.expectedDueDate,
    preBirthMonthlyNetEur: clampNet(obj.preBirthMonthlyNetEur, DEFAULT_STATE.preBirthMonthlyNetEur),
    extendedPostBirth: typeof obj.extendedPostBirth === "boolean" ? obj.extendedPostBirth : DEFAULT_STATE.extendedPostBirth,
  };
}

export const mutterschutzStore = createScopedStateStore<MutterschutzState>({
  appId: AppId.Mutterschutz,
  field: "state",
  createDefault: () => DEFAULT_STATE,
  parse: parseState,
});
