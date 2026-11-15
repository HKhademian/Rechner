import assert from "node:assert/strict";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "node:test";
import {
  housingEvaluation,
  housingState,
  resetHousingCalculator,
  syncHousingFromLifeProfile,
  updateHousingField,
} from "#/apps/housing/housingStore.ts";
import {
  GermanFederalState,
} from "#engine/formulas/pure/housingFormulas";
import {
  toEuroAmount,
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

describe("housingStore Unified Life Profile sync, ZvE planningYear derivation & reset", () => {
  beforeEach(() => {
    resetAllParameterOverrides();
    resetUnifiedLifeProfile();
    resetHousingCalculator();
  });

  afterEach(() => {
    resetAllParameterOverrides();
    resetUnifiedLifeProfile();
    resetHousingCalculator();
  });

  it("syncHousingFromLifeProfile propagates housing inputs and derives ZvE under the synced planningYear", () => {
    updateLifeProfileField("planningYear", toFullCalendarYear(2025));
    updateLifeProfileField("federalState", GermanFederalState.Bayern);
    updateLifeProfileField("targetPropertyPriceEur", toEuroAmount(600000));
    updateLifeProfileField("availableEquityEur", toEuroAmount(150000));
    updateLifeProfileField("includesBrokerCommission", false);
    updateLifeProfileField("isKfw300NewBuild", true);
    updateLifeProfileField("isQngPlusCertified", true);
    updateLifeProfileField("dependentChildrenCount", 2);
    updateLifeProfileField("annualRenovationLaborEur", toEuroAmount(6000));
    updateLifeProfileField("primaryAnnualGrossEur", toGrossSalary(75000));
    updateLifeProfileField("hasPartner", false);

    // Drift activeParameterYear away from Life Profile before syncing
    setParameterYear(toFullCalendarYear(2026));
    syncHousingFromLifeProfile();

    assert.equal(activeParameterYear.peek(), 2025);
    const expectedZvE = unifiedLifeOverview.peek().householdTax.estimatedTaxableIncomeZvEEur;
    const state = housingState.peek();
    assert.equal(state.federalState, GermanFederalState.Bayern);
    assert.equal(state.purchasePriceEur, 600000);
    assert.equal(state.availableEquityEur, 150000);
    assert.equal(state.includesBrokerCommission, false);
    assert.equal(state.isOwnerOccupiedNewBuildOrKfw300Standard, true);
    assert.equal(state.isQngPlusCertified, true);
    assert.equal(state.dependentChildrenCount, 2);
    assert.equal(state.renovationLaborCostEur, 6000);
    assert.equal(state.priorAverageHouseholdZvEEur, expectedZvE);

    const evalResult = housingEvaluation.peek().value;
    // Bavaria has 3.5% GrESt
    assert.equal(evalResult.transferTaxRate, 0.035);
    assert.equal(evalResult.kfw300Eligible, true);
  });

  it("updateHousingField clamps bounds and resetHousingCalculator restores defaults", () => {
    updateHousingField("dependentChildrenCount", 30);
    assert.equal(housingState.peek().dependentChildrenCount, 15);

    resetHousingCalculator();
    assert.equal(housingState.peek().federalState, GermanFederalState.NordrheinWestfalen);
    assert.equal(housingState.peek().dependentChildrenCount, 1);
  });
});
