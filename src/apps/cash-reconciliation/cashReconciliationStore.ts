import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  CashDirection,
  toCashDirection,
} from "#engine/lifeProfile/cashEvent";
import {
  LifeEventStatus,
} from "#engine/lifeProfile/timeline";
import {
  createScopedStateStore,
} from "#engine/storage/scopedStateStore";

export interface StandaloneCashEntry {
  readonly id: string;
  readonly date: string;
  readonly title: string;
  readonly status: LifeEventStatus;
  readonly direction: CashDirection;
  readonly amountCents: number;
  readonly reconcilesEventId?: string;
}

export interface CashReconciliationState {
  readonly entries: readonly StandaloneCashEntry[];
}

const DEFAULT_STATE: CashReconciliationState = {
  entries: [
    {
      id: "plan-groceries",
      date: "2026-04-05",
      title: "Monthly Groceries Budget",
      status: LifeEventStatus.Planned,
      direction: CashDirection.Outflow,
      amountCents: 60000,
    },
    {
      id: "act-groceries",
      date: "2026-04-07",
      title: "Supermarket Receipts (Actual)",
      status: LifeEventStatus.Actual,
      direction: CashDirection.Outflow,
      amountCents: 64250,
      reconcilesEventId: "plan-groceries",
    },
    {
      id: "plan-utility",
      date: "2026-04-15",
      title: "Electricity & Heating Estimate",
      status: LifeEventStatus.Planned,
      direction: CashDirection.Outflow,
      amountCents: 18500,
    },
    {
      id: "act-refund",
      date: "2026-04-18",
      title: "Annual Utility Settlement Refund",
      status: LifeEventStatus.Actual,
      direction: CashDirection.Inflow,
      amountCents: 9400,
    },
  ],
};

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseEntry(raw: unknown, index: number): StandaloneCashEntry | undefined {
  if (typeof raw !== "object" || raw === null) {
    return undefined;
  }
  const obj = raw as Record<string, unknown>;
  let direction: CashDirection = CashDirection.Outflow;
  if (typeof obj.direction === "string") {
    try {
      direction = toCashDirection(obj.direction);
    }
    catch {
      direction = CashDirection.Outflow;
    }
  }
  const status = obj.status === LifeEventStatus.Planned ? LifeEventStatus.Planned : LifeEventStatus.Actual;
  const amountCents = typeof obj.amountCents === "number" && Number.isSafeInteger(obj.amountCents) && obj.amountCents > 0
    ? obj.amountCents
    : 100;
  return {
    id: typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : `cash-${index + 1}`,
    date: isIsoDate(obj.date) ? obj.date : "2026-04-01",
    title: typeof obj.title === "string" && obj.title.trim() ? obj.title.trim() : `Entry ${index + 1}`,
    status,
    direction,
    amountCents,
    ...(status === LifeEventStatus.Actual && typeof obj.reconcilesEventId === "string" && obj.reconcilesEventId.trim()
      ? { reconcilesEventId: obj.reconcilesEventId.trim() }
      : {}),
  };
}

function parseState(raw: unknown): CashReconciliationState {
  if (typeof raw !== "object" || raw === null) {
    return DEFAULT_STATE;
  }
  const obj = raw as Record<string, unknown>;
  const entries = Array.isArray(obj.entries)
    ? obj.entries.map(parseEntry).filter((item): item is StandaloneCashEntry => item !== undefined)
    : DEFAULT_STATE.entries;
  return { entries };
}

export const cashReconciliationStore = createScopedStateStore<CashReconciliationState>({
  appId: AppId.CashReconciliation,
  field: "state",
  createDefault: () => DEFAULT_STATE,
  parse: parseState,
});
