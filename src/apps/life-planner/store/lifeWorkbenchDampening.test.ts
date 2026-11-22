import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  LifeEventDomain,
} from "#engine/lifeSimulator/types";
import {
  LifePlannerPresetId,
  buildLifePlannerPreset,
} from "#engine/lifeSimulator/lifePlannerPresets";
import {
  DEFAULT_LIFE_DAMPENING,
  LifeDampeningKey,
  applyLifeWorkbenchDampening,
  countActiveLifeDampened,
  toLifeDampeningKey,
} from "./lifeWorkbenchDampening.ts";

describe("life-planner/store/lifeWorkbenchDampening", () => {
  it("validates LifeDampeningKey strictly", () => {
    assert.equal(toLifeDampeningKey("career"), LifeDampeningKey.Career);
    assert.equal(toLifeDampeningKey("inflation-indexing"), LifeDampeningKey.InflationIndexing);
    assert.throws(() => toLifeDampeningKey("unknown"), TypeError);
  });

  it("suppresses selected event domains and inflation non-destructively without mutating source plan", () => {
    const plan = buildLifePlannerPreset(LifePlannerPresetId.GrowingFamilyHomePurchase);
    const originalCount = plan.events.length;

    const dampened = applyLifeWorkbenchDampening(plan, {
      ...DEFAULT_LIFE_DAMPENING,
      dampenFamily: true,
      dampenHousingAsset: true,
      dampenInflationIndexing: true,
    });

    assert.equal(countActiveLifeDampened({
      ...DEFAULT_LIFE_DAMPENING,
      dampenFamily: true,
      dampenHousingAsset: true,
      dampenInflationIndexing: true,
    }), 3);

    // Original plan must remain completely intact.
    assert.equal(plan.events.length, originalCount);
    assert.ok(plan.baseline.annualInflationRate > 0);

    // Filtered projection excludes Family & HousingAsset events and zeros inflation.
    assert.equal(
      dampened.events.some((ev) => ev.domain === LifeEventDomain.Family || ev.domain === LifeEventDomain.HousingAsset),
      false,
    );
    assert.equal(dampened.baseline.annualInflationRate, 0);
    assert.equal(dampened.baseline.annualRentIndexationRate, 0);
  });
});
