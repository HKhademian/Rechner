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
