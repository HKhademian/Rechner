import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  type AccumulatorModule,
  replayAccumulator,
  toAccumulatorId,
  toAccumulatorScope,
  toAccumulatorUnit,
} from "#engine/lifeProfile/monthlyAccumulator";
import {
  toReplayMonth,
} from "#engine/lifeProfile/monthlyReplay";

it("uses domain-defined carry and reset rules while retaining opening and contribution", () => {
  const module: AccumulatorModule<number, number, number, number> = {
    id: toAccumulatorId("count"),
    unit: toAccumulatorUnit("items"),
    scope: toAccumulatorScope("example"),
    contribution: (month, events, scenario) => events[month.month - 1] === undefined ? undefined : events[month.month - 1] + scenario,
    advance: (opening, contribution, month) => opening === undefined || contribution === undefined ? undefined
      : (month.month === 3 ? 0 : opening) + contribution,
  };
  const input = { module,
    origin: toReplayMonth(2026, 1),
    viewStart: toReplayMonth(2026, 1),
    through: toReplayMonth(2026, 4),
    opening: 10,
    events: [1, 2, 3, 4],
    scenario: 0 };
  const full = replayAccumulator(input);
  assert.deepEqual(full.map((row) => row.state.closing), [11, 13, 3, 7]);
  assert.deepEqual(full[3].state, { opening: 3,
    contribution: 4,
    closing: 7 });
  assert.deepEqual(replayAccumulator({ ...input,
    viewStart: toReplayMonth(2026, 4) })[0], full[3]);
  assert.equal(replayAccumulator({ ...input,
    scenario: 1 })[3].state.closing, 9);
  assert.equal(replayAccumulator({ ...input,
    opening: undefined })[3].state.closing, undefined);
  assert.equal(replayAccumulator({ ...input,
    events: [1] })[3].state.closing, undefined);
});
