import assert from "node:assert/strict";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "node:test";
import {
  blueCardEvaluation,
  resetVisaCalculator,
  syncVisaFromLifeProfile,
  updateVisaField,
  visaState,
} from "#/apps/visa/visaStore.ts";
import {
  GermanLanguageLevel,
  VisaOccupationRoute,
} from "#engine/formulas/pure/visaFormulas";
import {
  toFullCalendarYear,
  toGrossSalary,
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

describe("visaStore Unified Life Profile sync, clamping & defaults", () => {
  beforeEach(() => {
    resetAllParameterOverrides();
    resetUnifiedLifeProfile();
    resetVisaCalculator();
  });

  afterEach(() => {
    resetAllParameterOverrides();
    resetUnifiedLifeProfile();
    resetVisaCalculator();
  });

  it("syncVisaFromLifeProfile propagates applicant fields and planning year", () => {
    updateLifeProfileField("planningYear", toFullCalendarYear(2025));
    updateLifeProfileField("primaryAnnualGrossEur", toGrossSalary(48000));
    updateLifeProfileField("applicantAgeYears", 46);
    updateLifeProfileField("occupationRoute", VisaOccupationRoute.ShortageOrGraduate);
    updateLifeProfileField("germanLevel", GermanLanguageLevel.A1);

    // Simulate user previously inspecting a different year inside ParameterObserverSection
    setParameterYear(toFullCalendarYear(2026));
    assert.equal(activeParameterYear.peek(), 2026);

    syncVisaFromLifeProfile();

    const state = visaState.peek();
    assert.equal(state.annualGrossSalary, 48000);
    assert.equal(state.applicantAgeYears, 46);
    assert.equal(state.occupationRoute, VisaOccupationRoute.ShortageOrGraduate);
    assert.equal(state.germanLevel, GermanLanguageLevel.A1);
    assert.equal(activeParameterYear.peek(), 2025);

    const eval2025 = blueCardEvaluation.peek().value;
    assert.equal(eval2025.age45PensionProofRequired, true);
    assert.equal(eval2025.requiredSettlementMonths, 27);
  });

  it("updateVisaField clamps bounds and resetVisaCalculator restores clean defaults", () => {
    updateVisaField("applicantAgeYears", 12);
    updateVisaField("stayDurationMonths", 99);
    assert.equal(visaState.peek().applicantAgeYears, 18);
    assert.equal(visaState.peek().stayDurationMonths, 12);

    resetVisaCalculator();
    assert.equal(visaState.peek().applicantAgeYears, 33);
    assert.equal(visaState.peek().annualGrossSalary, 65000);
  });
});
