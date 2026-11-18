import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  projectCashEvents,
} from "#engine/lifeProfile/cashEventProjection";
import {
  cashEventModule,
  CashDirection,
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
  toEuroCents,
} from "#engine/types";
import {
  toReplayMonth,
} from "#engine/lifeProfile/monthlyReplay";

it("replays sourced actual and optional planned entries without recurring assumptions", () => {
  const person = toPersonId("p"), jan = toReplayMonth(2026, 1), apr = toReplayMonth(2026, 4);
  const actual = { id: toLifeEventId("salary"),
    personId: person,
    date: toLifeEventDate("2026-01-05"),
    status: LifeEventStatus.Actual,
    kind: cashEventModule.kind,
    payload: { title: "Deposit",
      direction: CashDirection.Inflow,
      amount: toEuroCents(50000) } };
  const planned = { ...actual,
    id: toLifeEventId("trip"),
    date: toLifeEventDate("2026-03-02"),
    status: LifeEventStatus.Planned,
    payload: { title: "Trip",
      direction: CashDirection.Outflow,
      amount: toEuroCents(30000) } };
  const other = { ...actual,
    id: toLifeEventId("other"),
    personId: toPersonId("q") };
  const events = [actual, planned, other];
  const full = projectCashEvents(jan, jan, apr, toEuroCents(100000), events, person, true);
  assert.deepEqual(full.map(({ state }) => state.closing), [150000, 150000, 120000, 120000]);
  assert.equal(full[2].state.contribution?.sources[0].id, planned.id);
  assert.deepEqual(projectCashEvents(jan, apr, apr, toEuroCents(100000), events, person, true)[0], full[3]);
  assert.equal(projectCashEvents(jan, jan, apr, toEuroCents(100000), events, person, false)[3].state.closing, 150000);
  assert.equal(projectCashEvents(jan, jan, apr, undefined, events, person, true)[3].state.closing, undefined);
  const corrected = { ...planned,
    payload: { ...planned.payload,
      amount: toEuroCents(70000) } };
  assert.equal(projectCashEvents(jan, jan, apr, toEuroCents(100000), [actual, corrected], person, true)[3].state.closing, 80000);
});
