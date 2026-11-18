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
