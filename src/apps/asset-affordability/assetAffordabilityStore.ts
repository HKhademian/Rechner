import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  AssetActionKind,
  AssetCategory,
  toAssetActionKind,
  toAssetCategory,
} from "#engine/lifeProfile/assetEvent";
import {
  createScopedStateStore,
} from "#engine/storage/scopedStateStore";

export interface StandaloneAssetEntry {
  readonly id: string;
  readonly assetId: string;
  readonly category: AssetCategory;
  readonly action: AssetActionKind;
  readonly title: string;
  readonly date: string;
  readonly upfrontEur: number;
  readonly ongoingMonthlyEur: number;
  readonly monthlySavingsEur: number;
  readonly alreadyInCashHistory: boolean;
}

export interface AssetAffordabilityState {
  readonly availableSavingsEur: number;
  readonly monthlyNetIncomeEur: number;
  readonly entries: readonly StandaloneAssetEntry[];
}

const DEFAULT_STATE: AssetAffordabilityState = {
  availableSavingsEur: 35000,
  monthlyNetIncomeEur: 5200,
  entries: [
    {
      id: "ae-1",
      assetId: "solar-roof-1",
      category: AssetCategory.Solar,
      action: AssetActionKind.Installation,
      title: "10 kWp Rooftop Solar PV + Battery",
      date: "2026-06-01",
      upfrontEur: 18500,
      ongoingMonthlyEur: 25,
      monthlySavingsEur: 175,
      alreadyInCashHistory: false,
    },
    {
      id: "ae-2",
      assetId: "family-ev-1",
      category: AssetCategory.Car,
      action: AssetActionKind.Purchase,
      title: "Used Compact EV",
      date: "2026-09-01",
      upfrontEur: 14000,
      ongoingMonthlyEur: 260,
      monthlySavingsEur: 0,
      alreadyInCashHistory: false,
    },
  ],
};

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}

function parseEntry(raw: unknown, index: number): StandaloneAssetEntry | undefined {
  if (typeof raw !== "object" || raw === null) {
    return undefined;
  }
  const obj = raw as Record<string, unknown>;
  let category: AssetCategory = AssetCategory.MajorPurchase;
  if (typeof obj.category === "string") {
    try {
      category = toAssetCategory(obj.category);
    }
    catch {
      category = AssetCategory.MajorPurchase;
    }
  }
  let action: AssetActionKind = AssetActionKind.Purchase;
  if (typeof obj.action === "string") {
    try {
      action = toAssetActionKind(obj.action);
    }
    catch {
      action = AssetActionKind.Purchase;
    }
  }
  return {
    id: typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : `ae-${index + 1}`,
    assetId: typeof obj.assetId === "string" && obj.assetId.trim() ? obj.assetId.trim() : `asset-${index + 1}`,
    category,
    action,
    title: typeof obj.title === "string" && obj.title.trim() ? obj.title.trim() : `Asset ${index + 1}`,
    date: typeof obj.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(obj.date) ? obj.date : "2026-06-01",
    upfrontEur: clampInt(obj.upfrontEur, 0, 5000000, 0),
    ongoingMonthlyEur: clampInt(obj.ongoingMonthlyEur, 0, 50000, 0),
    monthlySavingsEur: clampInt(obj.monthlySavingsEur, 0, 50000, 0),
    alreadyInCashHistory: typeof obj.alreadyInCashHistory === "boolean" ? obj.alreadyInCashHistory : false,
  };
}

function parseState(raw: unknown): AssetAffordabilityState {
  if (typeof raw !== "object" || raw === null) {
    return DEFAULT_STATE;
  }
  const obj = raw as Record<string, unknown>;
  const entries = Array.isArray(obj.entries)
    ? obj.entries.map(parseEntry).filter((item): item is StandaloneAssetEntry => item !== undefined)
    : DEFAULT_STATE.entries;

  return {
    availableSavingsEur: clampInt(obj.availableSavingsEur, 0, 5000000, DEFAULT_STATE.availableSavingsEur),
    monthlyNetIncomeEur: clampInt(obj.monthlyNetIncomeEur, 0, 100000, DEFAULT_STATE.monthlyNetIncomeEur),
    entries,
  };
}

export const assetAffordabilityStore = createScopedStateStore<AssetAffordabilityState>({
  appId: AppId.AssetAffordability,
  field: "state",
  createDefault: () => DEFAULT_STATE,
  parse: parseState,
});
