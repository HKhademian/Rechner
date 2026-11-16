import assert from "node:assert/strict";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "node:test";
import {
  minijobMidijobEvaluation,
  minijobMidijobState,
  resetMinijobMidijobCalculator,
  syncMinijobMidijobFromLifeProfile,
  updateMinijobMidijobField,
} from "#/apps/minijob-midijob/minijobMidijobStore.ts";
import {
  GermanFederalState,
} from "#engine/formulas/pure/housingFormulas";
import {
  EmploymentBand,
} from "#engine/formulas/pure/minijobTransitionEvaluator";
import {
  TaxClass,
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

describe("minijobMidijobStore Unified Life Profile sync, year thresholds & reset", () => {
  beforeEach(() => {
    resetAllParameterOverrides();
    resetUnifiedLifeProfile();
    resetMinijobMidijobCalculator();
  });

  afterEach(() => {
    resetAllParameterOverrides();
    resetUnifiedLifeProfile();
    resetMinijobMidijobCalculator();
  });

  it("tracks Minijob limit shifts across 2025 (€556) and 2026 (€603)", () => {
    updateMinijobMidijobField("monthlyGrossEur", toGrossSalary(600));
    setParameterYear(toFullCalendarYear(2025));
    const eval2025 = minijobMidijobEvaluation.peek();
    assert.equal(eval2025.marginalLimitMonthlyEur, 556);
    assert.equal(eval2025.current.employmentBand, EmploymentBand.Midijob);

    setParameterYear(toFullCalendarYear(2026));
    const eval2026 = minijobMidijobEvaluation.peek();
    assert.equal(eval2026.marginalLimitMonthlyEur, 603);
    assert.equal(eval2026.current.employmentBand, EmploymentBand.Minijob);
  });

  it("syncMinijobMidijobFromLifeProfile propagates Saxony, partner gross, and children", () => {
    updateLifeProfileField("planningYear", toFullCalendarYear(2025));
    updateLifeProfileField("federalState", GermanFederalState.Sachsen);
    updateLifeProfileField("hasPartner", true);
    updateLifeProfileField("isMarriedJointAssessment", true);
    updateLifeProfileField("partnerAnnualGrossEur", toGrossSalary(18000));
    updateLifeProfileField("dependentChildrenCount", 2);

    setParameterYear(toFullCalendarYear(2026));
    syncMinijobMidijobFromLifeProfile();

    assert.equal(activeParameterYear.peek(), 2025);
    const state = minijobMidijobState.peek();
    assert.equal(state.monthlyGrossEur, 1500);
    assert.equal(state.taxClass, TaxClass.IV);
    assert.equal(state.inSaxony, true);
    assert.equal(state.childrenCount, 2);
  });

  it("clamps monthly gross bounds and restores defaults on resetMinijobMidijobCalculator", () => {
    updateMinijobMidijobField("monthlyGrossEur", toGrossSalary(50000));
    assert.equal(minijobMidijobState.peek().monthlyGrossEur, 20000);

    resetMinijobMidijobCalculator();
    assert.equal(minijobMidijobState.peek().monthlyGrossEur, 1200);
    assert.equal(minijobMidijobState.peek().inSaxony, false);
  });
});
