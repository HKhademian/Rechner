import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  TimelineRecordStatus,
  decodeTimelineRecord,
} from "#engine/lifeProfile/timelineRecord";
import {
  createLifeEventRegistry,
  noteEventModule,
} from "#engine/lifeProfile/eventModules";

it("validates known events and refuses unknown versions or kinds", () => {
  const event = { id: "a",
    kind: "note",
    personId: "p",
    date: "2026-01-01",
    status: "planned",
    payload: { title: "Move" } };
  const modules = createLifeEventRegistry([noteEventModule]);
  assert.equal(decodeTimelineRecord(null, modules).status, TimelineRecordStatus.Missing);
  assert.equal(decodeTimelineRecord(JSON.stringify({ version: 1,
    events: [event] }), modules).status, TimelineRecordStatus.Valid);
  assert.equal(decodeTimelineRecord(JSON.stringify({ version: 1,
    events: [{ ...event,
      kind: "future.event" }] }), modules).status, TimelineRecordStatus.Unsupported);
  assert.equal(decodeTimelineRecord(JSON.stringify({ version: 2,
    events: [] }), modules).status, TimelineRecordStatus.Unsupported);
  assert.equal(decodeTimelineRecord(JSON.stringify({ version: 1,
    events: [event, event] }), modules).status, TimelineRecordStatus.Invalid);
  assert.equal(decodeTimelineRecord(JSON.stringify({ version: 1,
    events: [{ ...event,
      date: "bad" }] }), modules).status, TimelineRecordStatus.Invalid);
});
