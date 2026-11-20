import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  cashEventModule,
  CashDirection,
} from "#engine/lifeProfile/cashEvent";
import {
  lifeEventCatalog,
} from "#engine/lifeProfile/eventCatalog";
import {
  decodeTimelineRecord,
  TimelineRecordStatus,
} from "#engine/lifeProfile/timelineRecord";
import {
  parseAmount,
  amountText,
} from "#engine/lifeProfile/cashAmount";

it("validates exact cash amounts and preserves cents at the supported boundary", () => {
  assert.equal(parseAmount("1000.01", false), 100001);
  assert.equal(parseAmount("90071992547409.91", false), Number.MAX_SAFE_INTEGER);
  assert.equal(amountText(parseAmount("-0.01", true)!), "-0.01");
  assert.throws(() => parseAmount("1.001", false));
  assert.throws(() => parseAmount("-1", false));
  assert.throws(() => parseAmount("90071992547409.92", false));
  assert.throws(() => cashEventModule.parsePayload({ title: "Rent",
    direction: CashDirection.Outflow,
    amount: 0 }));
});

it("round-trips actual and planned events while rejecting imprecise cash dates", () => {
  const event = { id: "one",
    personId: "person",
    kind: cashEventModule.kind,
    date: "2026-11-03",
    status: "actual",
    payload: { title: "Rent",
      direction: CashDirection.Outflow,
      amount: 100001 } };
  const planned = { ...event,
    id: "two",
    status: "planned",
    date: "2026-12-03" };
  const record = JSON.stringify({ version: 2,
    events: [event, planned] });
  const decoded = decodeTimelineRecord(record, lifeEventCatalog);
  assert.equal(decoded.status, TimelineRecordStatus.Valid);
  assert.deepEqual(decoded.record?.events.map(({ status }) => status), ["actual", "planned"]);
  assert.equal(decodeTimelineRecord(JSON.stringify({version: 2,
    events: [{ ...event,
      date: "2026-11" }]}), lifeEventCatalog).status, TimelineRecordStatus.Invalid);
});

it("validates 1-to-1 actual-to-planned cash reconciliation links and rejects broken references", () => {
  const planned = {
    id: "plan-1",
    personId: "person",
    kind: cashEventModule.kind,
    date: "2026-11-10",
    status: "planned",
    payload: {
      title: "Groceries",
      direction: CashDirection.Outflow,
      amount: 10000,
    },
  };
  const actual = {
    id: "actual-1",
    personId: "person",
    kind: cashEventModule.kind,
    date: "2026-12-02",
    status: "actual",
    payload: {
      title: "Groceries",
      direction: CashDirection.Outflow,
      amount: 11050,
      reconcilesEventId: "plan-1",
    },
  };
  const valid = decodeTimelineRecord(JSON.stringify({
    version: 2,
    events: [planned, actual],
  }), lifeEventCatalog);
  assert.equal(valid.status, TimelineRecordStatus.Valid);
  assert.equal((valid.record?.events[1].payload as { readonly reconcilesEventId?: string }).reconcilesEventId, "plan-1");

  // Rejects orphaned link (removing the planned entry while actual still references it)
  assert.equal(decodeTimelineRecord(JSON.stringify({
    version: 2,
    events: [actual],
  }), lifeEventCatalog).status, TimelineRecordStatus.Invalid);

  // Rejects planned event reconciling another planned event
  assert.equal(decodeTimelineRecord(JSON.stringify({
    version: 2,
    events: [planned, { ...actual,
      status: "planned" }],
  }), lifeEventCatalog).status, TimelineRecordStatus.Invalid);

  // Rejects cross-person link
  assert.equal(decodeTimelineRecord(JSON.stringify({
    version: 2,
    events: [planned, { ...actual,
      personId: "other-person" }],
  }), lifeEventCatalog).status, TimelineRecordStatus.Invalid);

  // Rejects reconciling an actual event instead of a planned event
  assert.equal(decodeTimelineRecord(JSON.stringify({
    version: 2,
    events: [{ ...planned,
      status: "actual" }, actual],
  }), lifeEventCatalog).status, TimelineRecordStatus.Invalid);

  // Rejects two actual events reconciling the same planned entry
  assert.equal(decodeTimelineRecord(JSON.stringify({
    version: 2,
    events: [planned, actual, { ...actual,
      id: "actual-2" }],
  }), lifeEventCatalog).status, TimelineRecordStatus.Invalid);

  // Rejects self-reference
  assert.equal(decodeTimelineRecord(JSON.stringify({
    version: 2,
    events: [{ ...actual,
      id: "plan-1" }],
  }), lifeEventCatalog).status, TimelineRecordStatus.Invalid);
});
