import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  toEuroCents,
} from "#engine/types";
import {
  CashDirection,
  cashEventModule,
} from "#engine/lifeProfile/cashEvent";
import {
  CashOverlapPolicy,
  projectCombinedCashFlow,
  toCashOverlapPolicy,
} from "#engine/lifeProfile/cashForecastOverlap";
import {
  toReplayMonth,
} from "#engine/lifeProfile/monthlyReplay";
import {
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  LifeEventStatus,
  toLifeEventDate,
  toLifeEventId,
} from "#engine/lifeProfile/timeline";

it("prevents silent double-counting across explicit recurring-forecast overlap policies", () => {
  assert.equal(toCashOverlapPolicy("keep-separate"), CashOverlapPolicy.KeepSeparate);
  assert.throws(() => toCashOverlapPolicy("invalid"));

  const person = toPersonId("p");
  const jan = toReplayMonth(2026, 1);
  const mar = toReplayMonth(2026, 3);
  const assumption = {
    inflow: toEuroCents(300000),
    expense: toEuroCents(200000),
  };
  const routineRent = {
    id: toLifeEventId("rent"),
    personId: person,
    kind: cashEventModule.kind,
    date: toLifeEventDate("2026-01-05"),
    status: LifeEventStatus.Actual,
    payload: {
      title: "Rent",
      direction: CashDirection.Outflow,
      amount: toEuroCents(100000),
    },
  };
  const plannedLaptop = {
    id: toLifeEventId("plan-laptop"),
    personId: person,
    kind: cashEventModule.kind,
    date: toLifeEventDate("2026-02-10"),
    status: LifeEventStatus.Planned,
    payload: {
      title: "Laptop",
      direction: CashDirection.Outflow,
      amount: toEuroCents(10000),
    },
  };
  const actualLaptop = {
    id: toLifeEventId("actual-laptop"),
    personId: person,
    kind: cashEventModule.kind,
    date: toLifeEventDate("2026-02-14"),
    status: LifeEventStatus.Actual,
    payload: {
      title: "Laptop",
      direction: CashDirection.Outflow,
      amount: toEuroCents(11050),
      reconcilesEventId: plannedLaptop.id,
    },
  };
  const events = [routineRent, plannedLaptop, actualLaptop];

  // 1. KeepSeparate: recurring only (+1000/mo), events listed as excluded to prevent overlap
  const separate = projectCombinedCashFlow({
    origin: jan,
    viewStart: jan,
    through: mar,
    opening: toEuroCents(100000),
    assumption,
    events,
    personId: person,
    includePlanned: true,
    policy: CashOverlapPolicy.KeepSeparate,
  });
  assert.deepEqual(separate.map(({ state }) => state.closing), [200000, 300000, 400000]);
  assert.deepEqual(separate[0].state.contribution?.excludedSources.map((entry) => entry.id), [routineRent.id]);
  assert.deepEqual(separate[1].state.contribution?.excludedSources.map((entry) => entry.id), [actualLaptop.id]);

  // 2. AddExplicitExtraEventsOnly: marking plannedLaptop carries through to actualLaptop ONCE, while routineRent stays excluded
  const withExtra = projectCombinedCashFlow({
    origin: jan,
    viewStart: jan,
    through: mar,
    opening: toEuroCents(100000),
    assumption,
    events,
    personId: person,
    includePlanned: true,
    policy: CashOverlapPolicy.AddExplicitExtraEventsOnly,
    extraEventIds: new Set([plannedLaptop.id]),
  });
  assert.deepEqual(withExtra.map(({ state }) => state.closing), [200000, 288950, 388950]);
  assert.deepEqual(withExtra[0].state.contribution?.includedSources, []);
  assert.deepEqual(withExtra[0].state.contribution?.excludedSources.map((entry) => entry.id), [routineRent.id]);
  assert.deepEqual(withExtra[1].state.contribution?.includedSources.map((entry) => entry.id), [actualLaptop.id]);
  assert.deepEqual(withExtra[1].state.contribution?.excludedSources, []);

  // 3. EventsReplaceRecurringInEventMonths: Jan & Feb use events only; Mar uses recurring baseline
  const replaced = projectCombinedCashFlow({
    origin: jan,
    viewStart: jan,
    through: mar,
    opening: toEuroCents(100000),
    assumption,
    events,
    personId: person,
    includePlanned: true,
    policy: CashOverlapPolicy.EventsReplaceRecurringInEventMonths,
  });
  // Jan: 100000 - 100000 = 0; Feb: 0 - 11050 = -11050; Mar: -11050 + 300000 - 200000 = 88950
  assert.deepEqual(replaced.map(({ state }) => state.closing), [0, -11050, 88950]);
  assert.equal(replaced[0].state.contribution?.recurringApplied, false);
  assert.equal(replaced[1].state.contribution?.recurringApplied, false);
  assert.equal(replaced[2].state.contribution?.recurringApplied, true);

  // Opening-state equivalence: viewing March only matches Jan-Mar replay
  const marchOnly = projectCombinedCashFlow({
    origin: jan,
    viewStart: mar,
    through: mar,
    opening: toEuroCents(100000),
    assumption,
    events,
    personId: person,
    includePlanned: true,
    policy: CashOverlapPolicy.AddExplicitExtraEventsOnly,
    extraEventIds: new Set([plannedLaptop.id]),
  });
  assert.deepEqual(marchOnly[0], withExtra[2]);

  // Unknown opening balance stays unknown
  assert.equal(projectCombinedCashFlow({
    origin: jan,
    viewStart: jan,
    through: mar,
    opening: undefined,
    assumption,
    events,
    personId: person,
    includePlanned: true,
    policy: CashOverlapPolicy.AddExplicitExtraEventsOnly,
    extraEventIds: new Set([actualLaptop.id]),
  })[2].state.closing, undefined);
});
