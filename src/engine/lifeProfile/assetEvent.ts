import {
  type Brand,
  type EuroCents,
  toEuroCents,
} from "#engine/types";
import {
  cashEventModule,
} from "#engine/lifeProfile/cashEvent";
import {
  type LifeEventModule,
} from "#engine/lifeProfile/eventModules";
import {
  type LifeEvent,
  type LifeEventId,
  toLifeEventId,
  toLifeEventKind,
} from "#engine/lifeProfile/timeline";

export type LifeAssetId = Brand<string, "LifeAssetId">;

export function toLifeAssetId(value: string): LifeAssetId {
  if (!value || value.trim() !== value) {
    throw new TypeError("Asset ID must not be empty or contain surrounding whitespace.");
  }
  return value as LifeAssetId;
}

export const AssetCategory = {
  Housing: "housing",
  Car: "car",
  Solar: "solar",
  MajorPurchase: "major-purchase",
} as const;
export type AssetCategory = (typeof AssetCategory)[keyof typeof AssetCategory];

export function toAssetCategory(value: string): AssetCategory {
  if (!Object.values(AssetCategory).includes(value as AssetCategory)) {
    throw new TypeError("Invalid asset category.");
  }
  return value as AssetCategory;
}

export const AssetActionKind = {
  Purchase: "purchase",
  OwnershipChange: "ownership-change",
  Sale: "sale",
  Installation: "installation",
} as const;
export type AssetActionKind = (typeof AssetActionKind)[keyof typeof AssetActionKind];

export function toAssetActionKind(value: string): AssetActionKind {
  if (!Object.values(AssetActionKind).includes(value as AssetActionKind)) {
    throw new TypeError("Invalid asset action kind.");
  }
  return value as AssetActionKind;
}

export interface AssetEventPayload {
  readonly assetId: LifeAssetId;
  readonly category: AssetCategory;
  readonly action: AssetActionKind;
  readonly title: string;
  readonly upfrontCents?: EuroCents;
  readonly ongoingMonthlyCents?: EuroCents;
  readonly monthlySavingsCents?: EuroCents;
  /** Optional link to an existing cash.entry representing the same upfront transaction so it is counted once. */
  readonly linkedCashEventId?: LifeEventId;
}

const ALLOWED_KEYS = [
  "assetId",
  "category",
  "action",
  "title",
  "upfrontCents",
  "ongoingMonthlyCents",
  "monthlySavingsCents",
  "linkedCashEventId",
] as const;

function parseOptionalNonNegativeCents(value: unknown, label: string): EuroCents | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be non-negative integer euro cents.`);
  }
  return toEuroCents(value);
}

/** Records a purchase, ownership change, sale or installation for housing, cars, solar or major purchases. */
export const assetEventModule: LifeEventModule<AssetEventPayload> = Object.freeze({
  kind: toLifeEventKind("asset.event"),
  parsePayload(value: unknown): AssetEventPayload {
    if (typeof value !== "object" || value === null || Array.isArray(value)
      || Object.keys(value).some((key) => !(ALLOWED_KEYS as readonly string[]).includes(key))
      || !("assetId" in value) || typeof value.assetId !== "string"
      || !("category" in value) || typeof value.category !== "string"
      || !("action" in value) || typeof value.action !== "string"
      || !("title" in value) || typeof value.title !== "string" || !value.title.trim()) {
      throw new TypeError("An asset event needs an assetId, category, action and title.");
    }
    const raw = value as Record<string, unknown>;
    if (raw.linkedCashEventId !== undefined && typeof raw.linkedCashEventId !== "string") {
      throw new TypeError("linkedCashEventId must be a valid event ID string.");
    }
    const upfrontCents = parseOptionalNonNegativeCents(raw.upfrontCents, "upfrontCents");
    const ongoingMonthlyCents = parseOptionalNonNegativeCents(raw.ongoingMonthlyCents, "ongoingMonthlyCents");
    const monthlySavingsCents = parseOptionalNonNegativeCents(raw.monthlySavingsCents, "monthlySavingsCents");

    return Object.freeze({
      assetId: toLifeAssetId(value.assetId),
      category: toAssetCategory(value.category),
      action: toAssetActionKind(value.action),
      title: value.title.trim(),
      ...(upfrontCents !== undefined ? { upfrontCents } : {}),
      ...(ongoingMonthlyCents !== undefined ? { ongoingMonthlyCents } : {}),
      ...(monthlySavingsCents !== undefined ? { monthlySavingsCents } : {}),
      ...(typeof raw.linkedCashEventId === "string" ? { linkedCashEventId: toLifeEventId(raw.linkedCashEventId) } : {}),
    });
  },
  validateTimeline(events: readonly LifeEvent<unknown>[]): boolean {
    const cashEventsById = new Map<LifeEventId, string>();
    for (const event of events) {
      if (event.kind === cashEventModule.kind) {
        cashEventsById.set(event.id, event.personId);
      }
    }
    const claimedCashIds = new Set<LifeEventId>();
    for (const event of events) {
      if (event.kind !== assetEventModule.kind) {
        continue;
      }
      const parsed = assetEventModule.parsePayload(event.payload);
      if (parsed.linkedCashEventId) {
        if (cashEventsById.get(parsed.linkedCashEventId) !== event.personId) {
          return false;
        }
        if (claimedCashIds.has(parsed.linkedCashEventId)) {
          return false;
        }
        claimedCashIds.add(parsed.linkedCashEventId);
      }
    }
    return true;
  },
});
