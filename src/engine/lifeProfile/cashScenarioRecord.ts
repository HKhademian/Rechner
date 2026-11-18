import {
  type Brand,
  type EuroCents,
  toEuroCents,
} from "#engine/types";
import {
  toReplayMonth,
} from "#engine/lifeProfile/monthlyReplay";

export const CASH_SCENARIO_STORAGE_KEY = "rechner:life-profile:cash-scenarios:v1";
export type CashScenarioId = Brand<string, "CashScenarioId">;
export const CashScenarioStatus = { Missing: "missing",
  Valid: "valid",
  Invalid: "invalid",
  Unsupported: "unsupported" } as const;
export type CashScenarioStatus = (typeof CashScenarioStatus)[keyof typeof CashScenarioStatus];
export interface CashScenario {
  readonly id: CashScenarioId;
  readonly name: string;
  readonly origin: string;
  readonly opening: EuroCents;
  readonly inflow: EuroCents;
  readonly expense: EuroCents;
}
export interface CashScenarioRecord { readonly version: 1;
  readonly scenarios: readonly CashScenario[] }
export interface DecodedCashScenarios { readonly status: CashScenarioStatus;
  readonly record?: CashScenarioRecord }

export function toCashScenarioId(value: string): CashScenarioId {
  if (!value || value.trim() !== value) {
    throw new TypeError("Invalid scenario ID.");
  }
  return value as CashScenarioId;
}
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function only(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}
export function decodeCashScenarios(raw: string | null): DecodedCashScenarios {
  if (raw === null) {
    return { status: CashScenarioStatus.Missing };
  }
  try {
    const data: unknown = JSON.parse(raw);
    if (!object(data) || !Number.isInteger(data.version)) {
      return { status: CashScenarioStatus.Invalid };
    }
    if (data.version !== 1 || !only(data, ["version", "scenarios"])) {
      return { status: CashScenarioStatus.Unsupported };
    }
    if (!Array.isArray(data.scenarios)) {
      return { status: CashScenarioStatus.Invalid };
    }
    const scenarios: CashScenario[] = [];
    const ids = new Set<string>();
    for (const entry of data.scenarios) {
      if (!object(entry)) {
        return { status: CashScenarioStatus.Invalid };
      }
      if (!only(entry, ["id", "name", "origin", "opening", "inflow", "expense"])) {
        return { status: CashScenarioStatus.Unsupported };
      }
      if (typeof entry.id !== "string" || typeof entry.name !== "string" || !entry.name.trim() || entry.name !== entry.name.trim()
        || typeof entry.origin !== "string" || !/^\d{4}-\d{2}$/.test(entry.origin)
        || typeof entry.opening !== "number" || !Number.isSafeInteger(entry.opening)
        || typeof entry.inflow !== "number" || !Number.isSafeInteger(entry.inflow) || entry.inflow < 0
        || typeof entry.expense !== "number" || !Number.isSafeInteger(entry.expense) || entry.expense < 0) {
        return { status: CashScenarioStatus.Invalid };
      }
      const id = toCashScenarioId(entry.id);
      if (ids.has(id)) {
        return { status: CashScenarioStatus.Invalid };
      }
      ids.add(id);
      const year = Number(entry.origin.slice(0, 4));
      const month = Number(entry.origin.slice(5));
      toReplayMonth(year, month);
      const last = year * 12 + month - 1 + 5;
      toReplayMonth(Math.floor(last / 12), last % 12 + 1);
      scenarios.push({ id,
        name: entry.name,
        origin: entry.origin,
        opening: toEuroCents(entry.opening),
        inflow: toEuroCents(entry.inflow),
        expense: toEuroCents(entry.expense) });
    }
    return { status: CashScenarioStatus.Valid,
      record: { version: 1,
        scenarios } };
  }
  catch {
    return { status: CashScenarioStatus.Invalid };
  }
}
