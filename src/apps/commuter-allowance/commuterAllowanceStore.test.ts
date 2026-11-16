import assert from "node:assert/strict";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "node:test";
import {
  commuterAllowanceEvaluation,
  commuterAllowanceState,
  resetCommuterAllowanceCalculator,
  syncCommuterAllowanceFromLifeProfile,
  updateCommuterAllowanceField,
} from "#/apps/commuter-allowance/commuterAllowanceStore.ts";
import {
  GermanFederalState,
} from "#engine/formulas/pure/housingFormulas";
import {
  toFullCalendarYear,
  toGrossSalary,
} from "#engine/types";
import {
  resetUnifiedLifeProfile,
  unifiedLifeOverview,
  updateLifeProfileField,
} from "#store/lifeProfileStore";
import {
  activeParameterYear,
  resetAllParameterOverrides,
  setParameterYear,
} from "#store/parameterStore";

describe("commuterAllowanceStore Unified Life Profile sync, year rates & reset", () => {
  beforeEach(() => {
    resetAllParameterOverrides();
    resetUnifiedLifeProfile();
    resetCommuterAllowanceCalculator();
  });

  afterEach(() => {
    resetAllParameterOverrides();
    resetUnifiedLifeProfile();
    resetCommuterAllowanceCalculator();
  });

  it("switches first-20km commuter allowance rate between 2025 (€0.30/km) and 2026 (€0.38/km)", () => {
    setParameterYear(toFullCalendarYear(2025));
    const eval2025 = commuterAllowanceEvaluation.peek();
    assert.equal(eval2025.rulesSnapshot.first20KmRateEur, 0.3);

    setParameterYear(toFullCalendarYear(2026));
    const eval2026 = commuterAllowanceEvaluation.peek();
    assert.equal(eval2026.rulesSnapshot.first20KmRateEur, 0.38);
    assert.ok(eval2026.uncappedDistanceAllowanceEur > eval2025.uncappedDistanceAllowanceEur);
  });

  it("syncCommuterAllowanceFromLifeProfile propagates commute distance, office days, and ZvE", () => {
    updateLifeProfileField("planningYear", toFullCalendarYear(2025));
    updateLifeProfileField("federalState", GermanFederalState.BadenWuerttemberg);
    updateLifeProfileField("commuteOneWayKm", 32);
    updateLifeProfileField("commuteOfficeDaysPerMonth", 10);
    updateLifeProfileField("primaryAnnualGrossEur", toGrossSalary(72000));
    updateLifeProfileField("hasPartner", false);

    setParameterYear(toFullCalendarYear(2026));
    syncCommuterAllowanceFromLifeProfile();

    assert.equal(activeParameterYear.peek(), 2025);
    const state = commuterAllowanceState.peek();
    assert.equal(state.oneWayCommuteKm, 32);
    assert.equal(state.officeDaysPerYear, 120);
    assert.equal(state.homeOfficeDaysPerYear, 100);
    assert.equal(state.monthlyTransitTicketCostEur, 58);
    assert.equal(
      state.taxableIncomeZvEEur,
      unifiedLifeOverview.peek().householdTax.estimatedTaxableIncomeZvEEur,
    );
    assert.equal(state.isBavariaOrBadenWuerttemberg, true);
  });

  it("clamps distance and restores defaults on resetCommuterAllowanceCalculator", () => {
    updateCommuterAllowanceField("oneWayCommuteKm", 900);
    assert.equal(commuterAllowanceState.peek().oneWayCommuteKm, 500);

    resetCommuterAllowanceCalculator();
    assert.equal(commuterAllowanceState.peek().oneWayCommuteKm, 25);
    assert.equal(commuterAllowanceState.peek().officeDaysPerYear, 180);
  });
});
