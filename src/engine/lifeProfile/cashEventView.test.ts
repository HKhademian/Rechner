import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  cashEventsForMonth,
  reconciledPlannedCashEventsForMonth,
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

it("excludes reconciled planned cash entries from active month lists while preserving plan history", () => {
  const person = toPersonId("person");
  const planned = {
    id: toLifeEventId("plan-1"),
    personId: person,
    kind: cashEventModule.kind,
    date: toLifeEventDate("2026-11-10"),
    status: LifeEventStatus.Planned,
    payload: {
      title: "Groceries",
      direction: "outflow",
      amount: 10000,
    },
  };
  const actualSameMonth = {
    id: toLifeEventId("actual-1"),
    personId: person,
    kind: cashEventModule.kind,
    date: toLifeEventDate("2026-11-12"),
    status: LifeEventStatus.Actual,
    payload: {
      title: "Groceries",
      direction: "outflow",
      amount: 11050,
      reconcilesEventId: planned.id,
    },
  };
  const nov = toReplayMonth(2026, 11);
  const dec = toReplayMonth(2026, 12);

  const activeSameMonth = cashEventsForMonth([planned, actualSameMonth], person, nov, true);
  assert.deepEqual(activeSameMonth.map((item) => item.id), ["actual-1"]);
  assert.equal(activeSameMonth[0].payload.amount, 11050);

  const reconciledNov = reconciledPlannedCashEventsForMonth([planned, actualSameMonth], person, nov);
  assert.equal(reconciledNov.length, 1);
  assert.equal(reconciledNov[0].planned.payload.amount, 10000);
  assert.equal(reconciledNov[0].actual.id, actualSameMonth.id);

  // Cross-month shift: planned in Nov, happened in Dec -> counted once in Dec, not in Nov
  const actualNextMonth = {
    ...actualSameMonth,
    date: toLifeEventDate("2026-12-02"),
  };
  assert.deepEqual(cashEventsForMonth([planned, actualNextMonth], person, nov, true), []);
  assert.deepEqual(cashEventsForMonth([planned, actualNextMonth], person, dec, true).map((item) => item.id), ["actual-1"]);
  assert.equal(reconciledPlannedCashEventsForMonth([planned, actualNextMonth], person, nov)[0].actual.date, "2026-12-02");
});
