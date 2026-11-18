import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  type ReplayMonth,
  replayMonthly,
  toReplayMonth,
} from "#engine/lifeProfile/monthlyReplay";

interface Entry { readonly month: number;
  readonly amount: number; }
interface State { readonly balance: number | undefined; }

function advance(state: State, month: ReplayMonth, events: readonly Entry[], scenario: number): State {
  if (state.balance === undefined) {
    return { balance: undefined };
  }
  return { balance: state.balance + events.filter((event) => event.month === month.month).reduce((sum, event) => sum + event.amount, 0) + scenario };
}

it("replays opening history before a later view and keeps scenarios separate", () => {
  const input = { origin: toReplayMonth(2026, 1),
    viewStart: toReplayMonth(2026, 1),
    through: toReplayMonth(2026, 4),
    openingState: { balance: 100 },
    events: [{ month: 1,
      amount: 50 }, { month: 3,
      amount: -20 }],
    scenario: 10,
    advance };
  const full = replayMonthly(input);
  const april = replayMonthly({ ...input,
    viewStart: toReplayMonth(2026, 4) });
  assert.equal(full[3].state.balance, 170);
  assert.deepEqual(april[0], full[3]);
  assert.equal(replayMonthly({ ...input,
    scenario: 0 })[3].state.balance, 130);
  assert.equal(replayMonthly({ ...input,
    events: [{ month: 1,
      amount: 60 }] })[3].state.balance, 200);
  assert.equal(input.openingState.balance, 100);
});

it("preserves unknown opening values and rejects invalid view ranges", () => {
  const input = { origin: toReplayMonth(2026, 12),
    viewStart: toReplayMonth(2026, 12),
    through: toReplayMonth(2027, 1),
    openingState: { balance: undefined },
    events: [],
    scenario: 0,
    advance };
  const result = replayMonthly(input);
  assert.deepEqual(result.map((entry) => entry.state.balance), [undefined, undefined]);
  assert.notEqual(result[0].month.id, result[1].month.id);
  assert.throws(() => replayMonthly({ ...input,
    viewStart: toReplayMonth(2026, 11) }));
});
