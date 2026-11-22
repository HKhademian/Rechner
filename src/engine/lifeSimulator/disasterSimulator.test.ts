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
  toDisasterPresetId,
} from "#engine/lifeSimulator/disasterSimulator";
import {
  LifePlannerPresetId,
  buildLifePlannerPreset,
} from "#engine/lifeSimulator/lifePlannerPresets";
import {
  LifeScenarioKey,
  TaxBucket,
} from "#engine/lifeSimulator/types";

describe("lifeSimulator/disasterSimulator", () => {
  it("validates DisasterPresetId and models Fired (immediate ALG I) vs Resigned (3m Sperrzeit)", () => {
    assert.equal(toDisasterPresetId("FIRED_6M"), DisasterPresetId.Fired6m);
    assert.throws(() => toDisasterPresetId("INVALID"), TypeError);

    const plan = buildLifePlannerPreset(LifePlannerPresetId.YoungProfessional);
    const trigger = toSimulationMonth(10);

    const firedShocks = DISASTER_PRESETS.find((p) => p.id === DisasterPresetId.Fired6m)!.buildShocks(trigger);
    const resignedShocks = DISASTER_PRESETS.find((p) => p.id === DisasterPresetId.ResignedSperrzeit6m)!.buildShocks(trigger);

    const firedRes = simulateLifePlan(applyDisasterShocks(plan, firedShocks), LifeScenarioKey.StressTest);
    const resignedRes = simulateLifePlan(applyDisasterShocks(plan, resignedShocks), LifeScenarioKey.StressTest);

    // Month 10 (index 9): Fired receives ALG I immediately, Resigned gets €0 during Sperrzeit.
    const firedM10 = firedRes.months[9];
    const resignedM10 = resignedRes.months[9];

    assert.equal(firedM10.primaryNetSalary, 0);
    assert.ok(firedM10.statutoryBenefits > 1500, "Employer termination must trigger immediate ALG I");
    assert.equal(resignedM10.statutoryBenefits, 0, "Voluntary resignation must enforce €0 ALG I during Sperrzeit");

    // Month 13 (index 12): After 3-month Sperrzeit, Resigned starts receiving ALG I.
    const resignedM13 = resignedRes.months[12];
    assert.ok(resignedM13.statutoryBenefits > 1500, "Resigned earner should receive ALG I after 3m Sperrzeit");

    // ALG I must be tagged as § 32b progression income in the tax collector.
    const alg1Tx = firedM10.transactions.find((t) => t.bucket === TaxBucket.ProgressionBenefit32b);
    assert.ok(alg1Tx, "ALG I must be recorded in TaxBucket.ProgressionBenefit32b");

    // Resignation (with 3m Sperrzeit) must leave strictly less cash at the end of the 6m shock window than immediate layoff.
    assert.ok(
      resignedRes.months[14].liquidCashBalance < firedRes.months[14].liquidCashBalance,
      `Expected resigned cash at M15 (€${resignedRes.months[14].liquidCashBalance}) < fired cash (€${firedRes.months[14].liquidCashBalance})`,
    );
  });

  it("models Long-Term Illness (Krankengeld) and compound disasters non-destructively", () => {
    const plan = buildLifePlannerPreset(LifePlannerPresetId.YoungProfessional);
    const originalEventsCount = plan.events.length;
    const trigger = toSimulationMonth(8);

    const illnessShocks = DISASTER_PRESETS.find((p) => p.id === DisasterPresetId.LongIllness6m)!.buildShocks(trigger);
    const compoundShocks = DISASTER_PRESETS.find((p) => p.id === DisasterPresetId.CompoundFiredAndEmergency)!.buildShocks(trigger);

    const illnessRes = simulateLifePlan(applyDisasterShocks(plan, illnessShocks), LifeScenarioKey.StressTest);
    const compoundRes = simulateLifePlan(applyDisasterShocks(plan, compoundShocks), LifeScenarioKey.StressTest);

    // Base plan must remain untouched.
    assert.equal(plan.events.length, originalEventsCount);

    // Month 8: Krankengeld active and tagged as § 32b progression income.
    const m8 = illnessRes.months[7];
    assert.ok(m8.statutoryBenefits > 1500, "Krankengeld benefit must be paid during illness");
    assert.ok(m8.transactions.some((t) => t.bucket === TaxBucket.ProgressionBenefit32b));

    // Compound shock (Fired + €10k emergency) must hurt minimum cash more than illness alone.
    assert.ok(compoundRes.summary.minLiquidCash < illnessRes.summary.minLiquidCash);

    // Additional monthly commitment delta (+€400/mo) must reduce ending liquid cash.
    const baseStressed = simulateLifePlan(applyDisasterShocks(plan, illnessShocks, toEuroAmount(0)), LifeScenarioKey.StressTest);
    const higherRentStressed = simulateLifePlan(applyDisasterShocks(plan, illnessShocks, toEuroAmount(400)), LifeScenarioKey.StressTest);
    assert.ok(higherRentStressed.summary.endingLiquidCash < baseStressed.summary.endingLiquidCash);
  });
});
