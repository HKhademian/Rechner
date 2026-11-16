import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  takeMortgageHandoff,
  writeMortgageHandoff,
} from "#/apps/mortgage/mortgageHandoff.ts";
import {
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";

it("transfers mortgage inputs only once and rejects invalid data", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value); 
    },
    removeItem: (key: string) => {
      values.delete(key); 
    },
  };
  const input = { principal: toEuroAmount(125000),
    annualInterest: toPercentageRate(0.04),
    initialRepayment: toPercentageRate(0.02) };
  assert.equal(writeMortgageHandoff(storage, input), true);
  assert.deepEqual(takeMortgageHandoff(storage), input);
  assert.equal(takeMortgageHandoff(storage), null);
  storage.setItem("rechner:mortgage:handoff:v1", "{broken");
  assert.equal(takeMortgageHandoff(storage), null);
  assert.equal(values.size, 0);
  assert.equal(writeMortgageHandoff({ ...storage,
    setItem: () => {
      throw new Error("blocked"); 
    } }, input), false);
});
