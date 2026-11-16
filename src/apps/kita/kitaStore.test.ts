import assert from "node:assert/strict";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "node:test";
import {
  kitaEvaluation,
  kitaState,
  resetKitaCalculator,
  syncKitaFromLifeProfile,
  updateKitaField,
} from "#/apps/kita/kitaStore.ts";
import {
  GermanFederalState,
} from "#engine/formulas/pure/housingFormulas";
import {
  FederalStateKitaPresetId,
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

describe("kitaStore Unified Life Profile sync, tax-year transitions & reset", () => {
  beforeEach(() => {
    resetAllParameterOverrides();
    resetUnifiedLifeProfile();
    resetKitaCalculator();
  });

  afterEach(() => {
    resetAllParameterOverrides();
    resetUnifiedLifeProfile();
    resetKitaCalculator();
  });

  it("reacts to activeParameterYear changes (2024 vs 2026) under § 10 Abs. 1 Nr. 5 EStG", () => {
    updateKitaField("presetId", FederalStateKitaPresetId.Custom);
    updateKitaField("customMonthlyCareFeePerChildEur", toEuroAmount(550));
    setParameterYear(toFullCalendarYear(2024));
    const eval2024 = kitaEvaluation.peek();
    assert.equal(eval2024.annualDeductibleSonderausgabenEur, 4000);

    setParameterYear(toFullCalendarYear(2026));
    const eval2026 = kitaEvaluation.peek();
    assert.equal(eval2026.annualDeductibleSonderausgabenEur, 4800);
    assert.ok(eval2026.annualTaxSavingsEur > eval2024.annualTaxSavingsEur);
  });

  it("syncKitaFromLifeProfile maps state table, children, gross, ZvE, and joint assessment", () => {
    updateLifeProfileField("planningYear", toFullCalendarYear(2025));
    updateLifeProfileField("federalState", GermanFederalState.Bayern);
    updateLifeProfileField("dependentChildrenCount", 2);
    updateLifeProfileField("primaryAnnualGrossEur", toGrossSalary(80000));
    updateLifeProfileField("hasPartner", true);
    updateLifeProfileField("partnerAnnualGrossEur", toGrossSalary(40000));
    updateLifeProfileField("isMarriedJointAssessment", true);

    setParameterYear(toFullCalendarYear(2026));
    syncKitaFromLifeProfile();

    assert.equal(activeParameterYear.peek(), 2025);
    const state = kitaState.peek();
    assert.equal(state.presetId, FederalStateKitaPresetId.BavariaMunich);
    assert.equal(state.childrenCount, 2);
    assert.equal(state.householdAnnualGrossEur, 120000);
    assert.equal(
      state.householdTaxableIncomeZvEEur,
      unifiedLifeOverview.peek().householdTax.estimatedTaxableIncomeZvEEur,
    );
    assert.equal(state.isMarriedJointAssessment, true);
    assert.equal(state.isBavariaOrBadenWuerttemberg, true);
  });

  it("clamps field bounds and restores clean defaults on resetKitaCalculator", () => {
    updateKitaField("careMonthsPerYear", 24);
    assert.equal(kitaState.peek().careMonthsPerYear, 12);

    updateKitaField("childrenCount", 0);
    assert.equal(kitaState.peek().childrenCount, 1);

    resetKitaCalculator();
    assert.equal(kitaState.peek().presetId, FederalStateKitaPresetId.NrwDuesseldorf);
    assert.equal(kitaState.peek().childrenCount, 1);
    assert.equal(kitaState.peek().careMonthsPerYear, 12);
  });
});
