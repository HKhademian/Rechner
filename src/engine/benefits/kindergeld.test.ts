import {
  describe, it, 
} from "node:test";
import assert from "node:assert/strict";
import {
  computeKindergeld, 
} from "#engine/benefits/kindergeld";
import {
  toEuroAmount, 
} from "#engine/types";

describe("Child Benefit Engine (Kindergeld § 66 EStG)", () => {
  it("computes 0 € for 0 children", () => {
    const res = computeKindergeld(0);
    assert.equal(res.totalMonthlyKindergeld, 0);
  });

  it("computes exact statutory child benefit for 1 to 6 children at standard rate (259 €/child)", () => {
    const rate = toEuroAmount(259);
    for (let count = 1; count <= 6; count++) {
      const res = computeKindergeld(count, rate);
      assert.equal(res.childrenCount, count);
      assert.equal(res.totalMonthlyKindergeld, count * 259);
    }
  });

  it("supports custom Kindergeld rates", () => {
    const customRate = toEuroAmount(250);
    const res = computeKindergeld(2, customRate);
    assert.equal(res.totalMonthlyKindergeld, 500);
  });
});
