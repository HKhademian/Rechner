import assert from "node:assert/strict";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "node:test";
import {
  companyCarEvaluation,
  companyCarState,
  resetCompanyCarCalculator,
  syncCompanyCarFromLifeProfile,
  updateCompanyCarField,
} from "#/apps/company-car/companyCarStore.ts";
import {
  CommuteValuationMethod,
  VehiclePowertrain,
} from "#engine/formulas/pure/companyCarFormulas";
import {
  toEuroAmount,
  toFullCalendarYear,
  toPercentageRate,
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

describe("companyCarStore Unified Life Profile sync, EV BLP cap year sync & reset", () => {
  beforeEach(() => {
    resetAllParameterOverrides();
    resetUnifiedLifeProfile();
    resetCompanyCarCalculator();
  });

  afterEach(() => {
    resetAllParameterOverrides();
    resetUnifiedLifeProfile();
    resetCompanyCarCalculator();
  });

  it("syncCompanyCarFromLifeProfile propagates mobility fields and switches EV cap year cleanly", () => {
    updateLifeProfileField("planningYear", toFullCalendarYear(2025));
    updateLifeProfileField("companyCarListPriceEur", toEuroAmount(85000));
    updateLifeProfileField("companyCarPowertrain", VehiclePowertrain.PureElectricEv);
    updateLifeProfileField("commuteOneWayKm", 24);
    updateLifeProfileField("commuteOfficeDaysPerMonth", 8);
    updateLifeProfileField("commuteValuationMethod", CommuteValuationMethod.PerTrip0002);
    updateLifeProfileField("assumedMarginalTaxAndSocialRate", toPercentageRate(0.45));

    // Drift activeParameterYear to 2024 (€70k EV cap) and verify €85k exceeds it
    setParameterYear(toFullCalendarYear(2024));
    syncCompanyCarFromLifeProfile();

    const state = companyCarState.peek();
    assert.equal(state.grossListPriceEur, 85000);
    assert.equal(state.powertrain, VehiclePowertrain.PureElectricEv);
    assert.equal(state.commuteOneWayKm, 24);
    assert.equal(state.commuteOfficeDaysPerMonth, 8);
    assert.equal(state.commuteValuationMethod, CommuteValuationMethod.PerTrip0002);
    assert.equal(state.combinedMarginalTaxAndSocialRate, 0.45);
    assert.equal(activeParameterYear.peek(), 2025);
    assert.equal(companyCarEvaluation.peek().value.exceedsEvQuarterRateCap, false);

    // If user switches parameter observer back to 2024 directly, €85k EV triggers half-basis cap
    setParameterYear(toFullCalendarYear(2024));
    assert.equal(companyCarEvaluation.peek().value.exceedsEvQuarterRateCap, true);

    // Re-syncing from 2026 Life Profile restores €100k quarter-basis cap
    updateLifeProfileField("planningYear", toFullCalendarYear(2026));
    setParameterYear(toFullCalendarYear(2024));
    syncCompanyCarFromLifeProfile();
    assert.equal(activeParameterYear.peek(), 2026);
    assert.equal(companyCarEvaluation.peek().value.exceedsEvQuarterRateCap, false);
  });

  it("updateCompanyCarField and resetCompanyCarCalculator restore clean defaults", () => {
    updateCompanyCarField("commuteOfficeDaysPerMonth", 45);
    assert.equal(companyCarState.peek().commuteOfficeDaysPerMonth, 31);

    resetCompanyCarCalculator();
    assert.equal(companyCarState.peek().grossListPriceEur, 55000);
    assert.equal(companyCarState.peek().commuteOfficeDaysPerMonth, 12);
  });
});
