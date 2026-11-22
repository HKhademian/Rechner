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
  simulateLifePlan,
} from "#engine/lifeSimulator/lifeSimulator";
import {
  DISASTER_PRESETS,
  DisasterPresetId,
  applyDisasterShocks,
} from "#engine/lifeSimulator/disasterSimulator";
import {
  evaluateCommitmentAffordability,
} from "#engine/lifeSimulator/commitmentAffordability";
import {
  LifePlannerPresetId,
  buildLifePlannerPreset,
} from "#engine/lifeSimulator/lifePlannerPresets";
import {
  LifeScenarioKey,
  SolvencyVerdict,
} from "#engine/lifeSimulator/types";

describe("lifeSimulator/commitmentAffordability", () => {
  it("computes positive safe rent & mortgage headroom when resilient and satisfies floor invariant", () => {
    const plan = buildLifePlannerPreset(LifePlannerPresetId.YoungProfessional);
    const shocks = DISASTER_PRESETS.find((p) => p.id === DisasterPresetId.Fired6m)!.buildShocks(
      toSimulationMonth(12),
    );
    const emergencyFloor = toEuroAmount(10000);

    const aff = evaluateCommitmentAffordability(plan, shocks, {
      emergencyFloorEur: emergencyFloor,
    });

    assert.equal(aff.verdict, SolvencyVerdict.Resilient);
    assert.ok(aff.maxSafeAdditionalMonthlyCommitmentEur > 0, "Resilient plan must have positive safe headroom");
    assert.ok(aff.maxSafeTotalRentEur > plan.baseline.monthlyRent);
    assert.ok(aff.impliedMaxLoanAmountEur > 100000);

    // Core solver invariant: applying +maxSafeAdditionalMonthlyCommitmentEur keeps minLiquidCash >= emergencyFloor (within €5 rounding).
    const atCeiling = simulateLifePlan(
      applyDisasterShocks(plan, shocks, aff.maxSafeAdditionalMonthlyCommitmentEur),
      LifeScenarioKey.StressTest,
    );
    assert.ok(
      atCeiling.summary.minLiquidCash >= emergencyFloor - 50,
      `At safe ceiling (+€${aff.maxSafeAdditionalMonthlyCommitmentEur}/mo), minCash €${atCeiling.summary.minLiquidCash} should stay near floor €${emergencyFloor}`,
    );
  });

  it("reports Insolvent and negative required cut when cash runs out under compound disaster", () => {
    const basePlan = buildLifePlannerPreset(LifePlannerPresetId.YoungProfessional);
    const fragilePlan = Object.freeze({
      ...basePlan,
      baseline: Object.freeze({
        ...basePlan.baseline,
        openingLiquidCash: toEuroAmount(2000),
        monthlyRent: toEuroAmount(2200),
      }),
    });
    const shocks = DISASTER_PRESETS.find(
      (p) => p.id === DisasterPresetId.CompoundFiredAndEmergency,
    )!.buildShocks(toSimulationMonth(6));

    const aff = evaluateCommitmentAffordability(fragilePlan, shocks, {
      emergencyFloorEur: toEuroAmount(5000),
    });

    assert.equal(aff.verdict, SolvencyVerdict.Insolvent);
    assert.ok(aff.minLiquidCashEur < 0);
    assert.ok(aff.maxSafeAdditionalMonthlyCommitmentEur < 0, "Insolvent plan must require a monthly commitment cut");
    assert.ok(aff.survivalRunwayMonths < fragilePlan.baseline.horizonMonths);
  });
});
