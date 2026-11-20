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
  toCashScenarioId,
} from "#engine/lifeProfile/cashScenarioRecord";
import {
  ProjectedFactStatus,
} from "#engine/lifeProfile/datedFacts";
import {
  MonthTimelinePhase,
  MonthUncertaintyFlag,
  assessMonthUncertainties,
  buildReplayWindow,
  buildReplayWindowFromBounds,
  classifyMonthPhase,
  compareNamedCashScenarios,
  historyBoundaryPointIndex,
  toMonthHorizon,
  toMonthTimelinePhase,
} from "#engine/lifeProfile/monthlyRange";
import {
  toReplayMonth,
} from "#engine/lifeProfile/monthlyReplay";
import {
  toLifeDate,
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  LifeEventStatus,
  toLifeEventDate,
  toLifeEventId,
} from "#engine/lifeProfile/timeline";

it("builds configurable month windows and classifies history, current month, and forecast phases", () => {
  assert.equal(toMonthHorizon(12), 12);
  assert.throws(() => toMonthHorizon(0));
  assert.throws(() => toMonthHorizon(61));
  assert.equal(toMonthTimelinePhase("history"), MonthTimelinePhase.History);
  assert.throws(() => toMonthTimelinePhase("invalid"));

  const window = buildReplayWindow(toReplayMonth(2026, 10), toMonthHorizon(6));
  assert.equal(window.months.length, 6);
  assert.equal(window.through.year, 2027);
  assert.equal(window.through.month, 3);

  const bounded = buildReplayWindowFromBounds(toReplayMonth(2026, 10), toReplayMonth(2027, 3));
  assert.deepEqual(bounded, window);
  assert.throws(() => buildReplayWindowFromBounds(toReplayMonth(2026, 12), toReplayMonth(2026, 11)));

  const today = toLifeDate("2026-11-20");
  assert.equal(classifyMonthPhase(toReplayMonth(2026, 10), today), MonthTimelinePhase.History);
  assert.equal(classifyMonthPhase(toReplayMonth(2026, 11), today), MonthTimelinePhase.Current);
  assert.equal(classifyMonthPhase(toReplayMonth(2026, 12), today), MonthTimelinePhase.Forecast);
  assert.equal(historyBoundaryPointIndex(window.months, today), 2);
});

it("flags ambiguous facts and planned cash entries and compares 3+ named cash scenarios", () => {
  const person = toPersonId("p");
  const flags = assessMonthUncertainties({
    state: {
      jobs: [],
      residence: { status: ProjectedFactStatus.Ambiguous },
    },
    activeCashEvents: [{
      id: toLifeEventId("plan-1"),
      personId: person,
      kind: cashEventModule.kind,
      date: toLifeEventDate("2026-12-05"),
      status: LifeEventStatus.Planned,
      payload: {
        title: "Trip",
        direction: CashDirection.Outflow,
        amount: toEuroCents(20000),
      },
    }],
    hasUnknownBalance: true,
  });
  assert.deepEqual(flags, [
    MonthUncertaintyFlag.AmbiguousResidence,
    MonthUncertaintyFlag.IncludesPlannedCash,
    MonthUncertaintyFlag.MissingCashOpening,
  ]);

  const comparison = compareNamedCashScenarios([
    {
      id: toCashScenarioId("base"),
      name: "Base",
      origin: "2026-11",
      opening: toEuroCents(100000),
      inflow: toEuroCents(300000),
      expense: toEuroCents(250000),
    },
    {
      id: toCashScenarioId("lean"),
      name: "Lean",
      origin: "2026-11",
      opening: toEuroCents(100000),
      inflow: toEuroCents(300000),
      expense: toEuroCents(200000),
    },
    {
      id: toCashScenarioId("gap"),
      name: "Reduced income",
      origin: "2026-11",
      opening: toEuroCents(100000),
      inflow: toEuroCents(150000),
      expense: toEuroCents(250000),
    },
  ], toReplayMonth(2026, 11), toMonthHorizon(3));

  assert.equal(comparison.series.length, 3);
  assert.deepEqual(comparison.series[0].closingByMonth, [150000, 200000, 250000]);
  assert.deepEqual(comparison.series[1].closingByMonth, [200000, 300000, 400000]);
  assert.equal(comparison.series[1].finalDeltaVsFirst, 150000);
  assert.deepEqual(comparison.series[2].closingByMonth, [0, -100000, -200000]);
  assert.equal(comparison.series[2].finalDeltaVsFirst, -450000);
});
