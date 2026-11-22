import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  toEuroAmount,
  toSimulationMonth,
} from "#engine/types";
import {
  DISASTER_PRESETS,
  DisasterPresetId,
} from "#engine/lifeSimulator/disasterSimulator";
import {
  LIFE_PLANNER_PRESETS,
  LifePlannerPresetId,
  buildLifePlannerPreset,
  toLifePlannerPresetId,
} from "#engine/lifeSimulator/lifePlannerPresets";
import {
  evaluateLifeWorkbenchBundle,
} from "#engine/lifeSimulator/scenarioBuilder";

describe("lifeSimulator/scenarioBuilder & presets", () => {
  it("runs all 5 presets through Planned / Baseline / StressTest bundle cleanly and fast", () => {
    assert.equal(toLifePlannerPresetId("BLANK_PLAN"), LifePlannerPresetId.BlankPlan);
    assert.throws(() => toLifePlannerPresetId("UNKNOWN"), TypeError);

    const firedShocks = DISASTER_PRESETS.find((p) => p.id === DisasterPresetId.Fired6m)!.buildShocks(
      toSimulationMonth(12),
    );

    const t0 = performance.now();
    for (const preset of LIFE_PLANNER_PRESETS) {
      const plan = buildLifePlannerPreset(preset.id);
      const bundle = evaluateLifeWorkbenchBundle(plan, firedShocks, toEuroAmount(0));

      assert.equal(bundle.planned.months.length, plan.baseline.horizonMonths);
      assert.equal(bundle.baseline.months.length, plan.baseline.horizonMonths);
      assert.equal(bundle.stressTest.months.length, plan.baseline.horizonMonths);

      // Compare delta invariant.
      assert.ok(
        Math.abs(
          bundle.plannedVsBaseline.endingNetWorthDiff -
          (bundle.planned.summary.endingNetWorth - bundle.baseline.summary.endingNetWorth),
        ) < 0.05,
      );
      assert.ok(
        Math.abs(
          bundle.stressVsPlanned.endingLiquidCashDiff -
          (bundle.stressTest.summary.endingLiquidCash - bundle.planned.summary.endingLiquidCash),
        ) < 0.05,
      );
    }
    const elapsedMs = performance.now() - t0;
    assert.ok(elapsedMs < 3000, `All 5 presets + affordability solver ran in ${elapsedMs.toFixed(1)}ms`);
  });
});
