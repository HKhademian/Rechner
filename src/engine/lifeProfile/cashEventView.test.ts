import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  cashEventsForMonth,
} from "#engine/lifeProfile/cashEventView";
import {
  cashEventModule,
} from "#engine/lifeProfile/cashEvent";
import {
  toLifeEventId,
  toLifeEventDate,
  LifeEventStatus,
} from "#engine/lifeProfile/timeline";
import {
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  toReplayMonth,
} from "#engine/lifeProfile/monthlyReplay";

it("keeps actual and planned cash entries sourced and scoped to the selected person and month", () => {
  const person = toPersonId("person");
  const event = { id: toLifeEventId("actual"),
    personId: person,
    kind: cashEventModule.kind,
    date: toLifeEventDate("2026-11-03"),
    status: LifeEventStatus.Actual,
    payload: { title: "Rent",
      direction: "outflow",
      amount: 100001 } };
  const planned = { ...event,
    id: toLifeEventId("planned"),
    date: toLifeEventDate("2026-11-18"),
    status: LifeEventStatus.Planned };
  const other = { ...event,
    id: toLifeEventId("other"),
    personId: toPersonId("other") };
  const later = { ...event,
    id: toLifeEventId("later"),
    date: toLifeEventDate("2026-12-03") };
  const month = toReplayMonth(2026, 11);
  assert.deepEqual(cashEventsForMonth([planned, other, event, later], person, month, false).map((item) => item.id), ["actual"]);
  const both = cashEventsForMonth([planned, other, event, later], person, month, true);
  assert.deepEqual(both.map((item) => item.id), ["actual", "planned"]);
  assert.deepEqual(both.map((item) => item.status), [LifeEventStatus.Actual, LifeEventStatus.Planned]);
  assert.equal(both[0].payload.amount, 100001);
});
