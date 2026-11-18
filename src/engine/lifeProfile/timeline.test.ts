import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  toLifeDate,
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  LifeEventStatus,
  orderLifeEvents,
  toLifeEventId,
  toLifeEventKind,
  toLifeEventStatus,
} from "#engine/lifeProfile/timeline";

it("validates generic event identifiers, kinds and status", () => {
  assert.throws(() => toLifeEventId(" "));
  assert.throws(() => toLifeEventKind("Not a kind"));
  assert.throws(() => toLifeEventStatus("maybe"));
  assert.equal(toLifeEventKind("residence.move"), "residence.move");
  assert.equal(toLifeEventStatus("planned"), LifeEventStatus.Planned);
});

it("orders events by date and stable ID without mutating the input", () => {
  const base = { kind: toLifeEventKind("note"),
    personId: toPersonId("person-1"),
    status: LifeEventStatus.Actual,
    payload: { title: "A" } };
  const events = [
    { ...base,
      id: toLifeEventId("b"),
      date: toLifeDate("2026-04-01") },
    { ...base,
      id: toLifeEventId("a"),
      date: toLifeDate("2026-04-01") },
    { ...base,
      id: toLifeEventId("c"),
      date: toLifeDate("2026-03-01") },
  ];
  assert.deepEqual(orderLifeEvents(events).map((event) => event.id), ["c", "a", "b"]);
  assert.equal(events[0].id, "b");
});
