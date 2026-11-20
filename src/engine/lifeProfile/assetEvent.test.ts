import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  AssetActionKind,
  AssetCategory,
  assetEventModule,
} from "#engine/lifeProfile/assetEvent";
import {
  CashDirection,
  cashEventModule,
} from "#engine/lifeProfile/cashEvent";
import {
  lifeEventCatalog,
} from "#engine/lifeProfile/eventCatalog";
import {
  TimelineRecordStatus,
  decodeTimelineRecord,
} from "#engine/lifeProfile/timelineRecord";

it("validates asset events and enforces 1-to-1 same-person linking to cash entries", () => {
  const cashEntry = {
    id: "cash-solar-1",
    kind: cashEventModule.kind,
    personId: "p1",
    date: "2026-06-15",
    status: "planned",
    payload: {
      title: "10 kWp Solar PV installation",
      direction: CashDirection.Outflow,
      amount: 1650000,
    },
  };
  const asset = {
    id: "asset-solar-1",
    kind: assetEventModule.kind,
    personId: "p1",
    date: "2026-06-15",
    status: "planned",
    payload: {
      assetId: "solar-roof",
      category: AssetCategory.Solar,
      action: AssetActionKind.Installation,
      title: "10 kWp Roof PV",
      upfrontCents: 1650000,
      ongoingMonthlyCents: 2500,
      monthlySavingsCents: 16500,
      linkedCashEventId: "cash-solar-1",
    },
  };
  const decode = (events: unknown[]) => decodeTimelineRecord(JSON.stringify({
    version: 2,
    events,
  }), lifeEventCatalog).status;

  assert.equal(decode([cashEntry, asset]), TimelineRecordStatus.Valid);
  // Missing linked cash entry
  assert.equal(decode([asset]), TimelineRecordStatus.Invalid);
  // Different person
  assert.equal(decode([cashEntry, {
    ...asset,
    personId: "p2",
  }]), TimelineRecordStatus.Invalid);
  // Duplicate claim of same cash entry
  assert.equal(decode([cashEntry, asset, {
    ...asset,
    id: "asset-solar-2",
  }]), TimelineRecordStatus.Invalid);
});
