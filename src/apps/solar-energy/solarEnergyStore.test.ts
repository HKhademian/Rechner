import assert from "node:assert/strict";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "node:test";
import {
  resetSolarEnergyCalculator,
  solarEnergyEvaluation,
  solarEnergyState,
  syncSolarEnergyFromLifeProfile,
  updateSolarEnergyField,
} from "#/apps/solar-energy/solarEnergyStore.ts";
import {
  SolarFeedInMode,
} from "#engine/formulas/pure/solarEnergyFormulas";
import {
  toEuroAmount,
  toFullCalendarYear,
} from "#engine/types";
import {
  resetUnifiedLifeProfile,
  updateLifeProfileField,
} from "#store/lifeProfileStore";
import {
  activeParameterYear,
  resetAllParameterOverrides,
  setParameterYear,
} from "#store/parameterStore";

describe("solarEnergyStore Unified Life Profile sync, clamping & reset", () => {
  beforeEach(() => {
    resetAllParameterOverrides();
    resetUnifiedLifeProfile();
    resetSolarEnergyCalculator();
  });

  afterEach(() => {
    resetAllParameterOverrides();
    resetUnifiedLifeProfile();
    resetSolarEnergyCalculator();
  });

  it("syncSolarEnergyFromLifeProfile copies PV parameters and planning year", () => {
    updateLifeProfileField("planningYear", toFullCalendarYear(2025));
    updateLifeProfileField("solarCapacityKwp", 16.5);
    updateLifeProfileField("solarSystemCostNetEur", toEuroAmount(22000));
    updateLifeProfileField("annualHouseholdElectricityKwh", 6200);
    updateLifeProfileField("solarFeedInMode", SolarFeedInMode.FullFeedIn);

    setParameterYear(toFullCalendarYear(2026));
    syncSolarEnergyFromLifeProfile();

    const state = solarEnergyState.peek();
    assert.equal(state.capacityKwp, 16.5);
    assert.equal(state.systemCostNetEur, 22000);
    assert.equal(state.annualHouseholdConsumptionKwh, 6200);
    assert.equal(state.feedInMode, SolarFeedInMode.FullFeedIn);
    assert.equal(activeParameterYear.peek(), 2025);
    assert.equal(solarEnergyEvaluation.peek().value.isIncomeTaxExempt, true);
  });

  it("updateSolarEnergyField clamps capacity and resetSolarEnergyCalculator restores defaults", () => {
    updateSolarEnergyField("capacityKwp", 250);
    assert.equal(solarEnergyState.peek().capacityKwp, 100);

    resetSolarEnergyCalculator();
    assert.equal(solarEnergyState.peek().capacityKwp, 10);
    assert.equal(solarEnergyState.peek().feedInMode, SolarFeedInMode.PartialSelfConsumption);
  });
});
