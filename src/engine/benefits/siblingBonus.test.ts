import {
  describe, it, 
} from "node:test";
import assert from "node:assert/strict";
import {
  computeSiblingBonus, 
} from "#engine/benefits/siblingBonus";
import {
  toEuroAmount, toSimulationMonth, 
} from "#engine/types";

describe("Sibling Bonus Calculation Engine (Geschwisterbonus § 2a BEEG)", () => {
  it("grants +10% bonus with statutory minimum of +€75/month when older child is under 36 months", () => {
    const olderBirth = toSimulationMonth(12); // Child 1 born at M12 (turns 3 at M48)

    // Test months M39 to M47 (Older child is 27 to 35 months old)
    for (let m = 39; m < 48; m++) {
      const currentMonth = toSimulationMonth(m);
      const basePlus = toEuroAmount(411);
      const res = computeSiblingBonus(basePlus, olderBirth, currentMonth);

      assert.equal(res.isEligible, true);
      // 10% of €411 = €41.10 -> Statutory minimum +€75 applies!
      assert.equal(res.siblingBonusAmount, 75);
      assert.equal(res.totalElterngeldPlusWithBonus, 411 + 75); // 486 €
    }
  });

  it("calculates +10% bonus when 10% exceeds statutory minimum +€75", () => {
    const olderBirth = toSimulationMonth(12);
    const currentMonth = toSimulationMonth(40);
    const basePlus = toEuroAmount(800); // 10% is €80 (exceeds €75)

    const res = computeSiblingBonus(basePlus, olderBirth, currentMonth);
    assert.equal(res.isEligible, true);
    assert.equal(res.siblingBonusAmount, 80);
    assert.equal(res.totalElterngeldPlusWithBonus, 880);
  });

  it("caps total ElterngeldPlus with bonus at statutory max €900/month", () => {
    const olderBirth = toSimulationMonth(12);
    const currentMonth = toSimulationMonth(40);
    const basePlus = toEuroAmount(890);

    const res = computeSiblingBonus(basePlus, olderBirth, currentMonth);
    assert.equal(res.isEligible, true);
    assert.equal(res.totalElterngeldPlusWithBonus, 900);
  });

  it("expires exactly when older child completes 36th month (3rd birthday at M48)", () => {
    const olderBirth = toSimulationMonth(12);
    const expiredMonth = toSimulationMonth(48); // Month 48 = Older child is 36 months old
    const basePlus = toEuroAmount(411);

    const res = computeSiblingBonus(basePlus, olderBirth, expiredMonth);
    assert.equal(res.isEligible, false);
    assert.equal(res.siblingBonusAmount, 0);
    assert.equal(res.totalElterngeldPlusWithBonus, 411);
  });
});
