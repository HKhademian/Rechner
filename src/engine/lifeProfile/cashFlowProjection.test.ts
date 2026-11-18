import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  projectCashFlow,
} from "#engine/lifeProfile/cashFlowProjection";
import {
  toReplayMonth,
} from "#engine/lifeProfile/monthlyReplay";
import {
  toEuroCents,
} from "#engine/types";

it("carries explicitly entered cash assumptions and preserves missing values", () => {
  const january = toReplayMonth(2026, 1);
  const april = toReplayMonth(2026, 4);
  const assumption = { inflow: toEuroCents(300000),
    expense: toEuroCents(200000) };
  const full = projectCashFlow(january, january, april, toEuroCents(100000), assumption);
  assert.equal(full[3].state.opening, 400000);
  assert.equal(full[3].state.closing, 500000);
  assert.deepEqual(projectCashFlow(january, april, april, toEuroCents(100000), assumption)[0], full[3]);
  assert.equal(projectCashFlow(january, january, april, undefined, assumption)[3].state.closing, undefined);
  assert.equal(projectCashFlow(january, january, april, toEuroCents(100000), { inflow: toEuroCents(300000) })[3].state.closing, undefined);
});

it("keeps alternative projections independent, including negative and unknown balances", () => {
  const january = toReplayMonth(2026, 1);
  const march = toReplayMonth(2026, 3);
  const first = { inflow: toEuroCents(300000),
    expense: toEuroCents(200000) };
  const second = { inflow: toEuroCents(100000),
    expense: toEuroCents(200000) };
  const firstRows = projectCashFlow(january, january, march, toEuroCents(100000), first);
  const secondRows = projectCashFlow(january, january, march, toEuroCents(100000), second);
  assert.deepEqual(firstRows.map(({ state }) => state.closing), [200000, 300000, 400000]);
  assert.deepEqual(secondRows.map(({ state }) => state.closing), [0, -100000, -200000]);
  assert.equal(projectCashFlow(january, january, march, undefined, second)[2].state.closing, undefined);
  assert.deepEqual(projectCashFlow(january, january, march, toEuroCents(100000), first), firstRows);
});
