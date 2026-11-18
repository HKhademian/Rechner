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
  toLifeEventDate,
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

it("orders partial dates without fabricating a day and puts unknown dates last", () => {
  const base = { kind: toLifeEventKind("note"),
    personId: toPersonId("person-1"),
    status: LifeEventStatus.Planned,
    payload: { title: "A" } };
  const result = orderLifeEvents([
    { ...base,
      id: toLifeEventId("unknown") },
    { ...base,
      id: toLifeEventId("month"),
      date: toLifeEventDate("2026-03") },
    { ...base,
      id: toLifeEventId("year"),
      date: toLifeEventDate("2026") },
  ]);
  assert.deepEqual(result.map((event) => event.id), ["year", "month", "unknown"]);
  assert.equal(result[1].date, "2026-03");
  assert.throws(() => toLifeEventDate("2026-13"));
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
