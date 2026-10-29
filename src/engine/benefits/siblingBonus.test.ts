import {
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";
import {
  computeSiblingBonus, 
} from "#engine/benefits/siblingBonus";
import {
  toEuroAmount,
  toSimulationMonth,
} from "#engine/types";
import {
  createBenefitRules,
} from "#engine/config/benefitRules";

describe("Sibling Bonus Calculation Engine (Geschwisterbonus § 2a BEEG)", () => {
  // Familienportal: Plus sibling addition is 10%, at least 37.50; total max 990.
  it("adds the percentage bonus above the Plus minimum", () => {
    const olderBirth = toSimulationMonth(12); // Child 1 born at M12 (turns 3 at M48)

    // Test months M39 to M47 (Older child is 27 to 35 months old)
    for (let m = 39; m < 48; m++) {
      const currentMonth = toSimulationMonth(m);
      const basePlus = toEuroAmount(411);
      const res = computeSiblingBonus(basePlus, olderBirth, currentMonth);

      assert.equal(res.isEligible, true);
      assert.equal(res.siblingBonusAmount, 41.1);
      assert.equal(res.totalElterngeldPlusWithBonus, 452.1);
    }
  });

  it("calculates the percentage bonus for a higher entitlement", () => {
    const olderBirth = toSimulationMonth(12);
    const currentMonth = toSimulationMonth(40);
    const basePlus = toEuroAmount(800); // 10% is €80 (exceeds €75)

    const res = computeSiblingBonus(basePlus, olderBirth, currentMonth);
    assert.equal(res.isEligible, true);
    assert.equal(res.siblingBonusAmount, 80);
    assert.equal(res.totalElterngeldPlusWithBonus, 880);
  });

  it("allows the sibling addition above the ordinary Plus maximum", () => {
    const olderBirth = toSimulationMonth(12);
    const currentMonth = toSimulationMonth(40);
    const basePlus = toEuroAmount(900);

    const res = computeSiblingBonus(basePlus, olderBirth, currentMonth);
    assert.equal(res.isEligible, true);
    assert.equal(res.totalElterngeldPlusWithBonus, 990);
    assert.equal(res.siblingBonusAmount, 90);
  });

  it("includes the month when the sibling reaches the age limit, then expires", () => {
    const olderBirth = toSimulationMonth(12);
    const lastEligible = computeSiblingBonus(toEuroAmount(150), olderBirth, toSimulationMonth(48));
    assert.equal(lastEligible.isEligible, true);
    assert.equal(lastEligible.siblingBonusAmount, 37.5);
    assert.equal(lastEligible.totalElterngeldPlusWithBonus, 187.5);
    const expiredMonth = toSimulationMonth(49);
    const basePlus = toEuroAmount(411);

    const res = computeSiblingBonus(basePlus, olderBirth, expiredMonth);
    assert.equal(res.isEligible, false);
    assert.equal(res.siblingBonusAmount, 0);
    assert.equal(res.totalElterngeldPlusWithBonus, 411);
  });

  it("does not revive a zero entitlement or pay for a sibling before birth", () => {
    for (const [base, older, current] of [[0, 1, 2], [150, 3, 2]]) {
      const result = computeSiblingBonus(toEuroAmount(base), toSimulationMonth(older), toSimulationMonth(current));
      assert.equal(result.isEligible, false);
      assert.equal(result.siblingBonusAmount, 0);
      assert.equal(result.totalElterngeldPlusWithBonus, base);
    }
  });

  it("uses configured bonus amounts, rates, age limits, and entitlement maxima", () => {
    const rules = createBenefitRules({ siblingMinimumBasis: 100,
      siblingRate: 0.2,
      siblingAgeLimitMonths: 24 });
    const minimum = computeSiblingBonus(toEuroAmount(150), toSimulationMonth(1), toSimulationMonth(2), rules);
    assert.equal(minimum.siblingBonusAmount, 50);
    assert.equal(minimum.totalElterngeldPlusWithBonus, 200);
    const maximum = computeSiblingBonus(toEuroAmount(900), toSimulationMonth(1), toSimulationMonth(2), rules);
    assert.equal(maximum.totalElterngeldPlusWithBonus, 1080);
    assert.equal(computeSiblingBonus(toEuroAmount(150), toSimulationMonth(1), toSimulationMonth(26), rules).isEligible, false);
  });
});
