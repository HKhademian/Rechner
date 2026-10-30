import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  toSimulationMonth,
  toEuroAmount,
} from "#engine/types";
import {
  computeHouseholdSiblingBonus,
} from "#engine/benefits/siblingBonus";

it("counts two other children under six even when neither is under three", () => {
  const current = toSimulationMonth(100);
  const base = toEuroAmount(500);
  assert.equal(computeHouseholdSiblingBonus(base, [toSimulationMonth(60)], current).isEligible, false);
  assert.equal(computeHouseholdSiblingBonus(base, [toSimulationMonth(60), toSimulationMonth(40)], current).totalElterngeldPlusWithBonus, 550);
  assert.equal(computeHouseholdSiblingBonus(base, [toSimulationMonth(28), toSimulationMonth(27)], current).isEligible, false);
});

it("counts a newly born younger sibling and never revives a zero entitlement", () => {
  const birth = toSimulationMonth(20);
  assert.equal(computeHouseholdSiblingBonus(toEuroAmount(150), [birth], birth).totalElterngeldPlusWithBonus, 187.5);
  assert.equal(computeHouseholdSiblingBonus(toEuroAmount(0), [birth], birth).totalElterngeldPlusWithBonus, 0);
});
