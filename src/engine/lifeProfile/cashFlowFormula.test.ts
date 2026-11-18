import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  closingCashBalance,
} from "#engine/lifeProfile/cashFlowFormula";
import {
  toEuroCents,
} from "#engine/types";

it("reconciles cash in cents and rejects invalid or unsafe inputs", () => {
  assert.equal(closingCashBalance(toEuroCents(10000), toEuroCents(25000), toEuroCents(30000)), 5000);
  assert.equal(closingCashBalance(toEuroCents(0), toEuroCents(0), toEuroCents(100)), -100);
  assert.throws(() => closingCashBalance(toEuroCents(0), toEuroCents(-1), toEuroCents(0)));
  assert.throws(() => closingCashBalance(toEuroCents(Number.MAX_SAFE_INTEGER), toEuroCents(1), toEuroCents(0)));
});
