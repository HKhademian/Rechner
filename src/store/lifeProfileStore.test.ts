import assert from "node:assert/strict";
import {
  afterEach,
  describe,
  it,
} from "node:test";
import {
  GermanFederalState,
} from "#engine/formulas/pure/housingFormulas";
import {
  createDefaultUnifiedLifeProfile,
} from "#engine/lifeProfile/types";
import {
  DEFAULT_TAX_YEAR,
} from "#engine/tax/taxRules";
import {
  toFullCalendarYear,
  toGrossSalary,
} from "#engine/types";
import {
  reloadUnifiedLifeProfileFromStorage,
  replaceUnifiedLifeProfile,
  resetUnifiedLifeProfile,
  unifiedLifeOverview,
  unifiedLifeProfile,
  updateLifeProfileField,
} from "#store/lifeProfileStore";
import {
  activeParameterYear,
  setParameterYear,
} from "#store/parameterStore";

describe("lifeProfileStore", () => {
  afterEach(() => {
    resetUnifiedLifeProfile();
    setParameterYear(DEFAULT_TAX_YEAR);
  });

  it("derives cross-calculator overview from default profile and updates reactively", () => {
    resetUnifiedLifeProfile();
    const initial = unifiedLifeProfile.value;
    assert.equal(initial.version, 1);
    assert.ok(unifiedLifeOverview.value.governingLawIds.length > 0);

    updateLifeProfileField("primaryAnnualGrossEur", toGrossSalary(95000));
    updateLifeProfileField("federalState", GermanFederalState.Bayern);

    assert.equal(unifiedLifeProfile.value.primaryAnnualGrossEur, 95000);
    assert.equal(unifiedLifeProfile.value.federalState, GermanFederalState.Bayern);
    assert.ok(unifiedLifeOverview.value.householdPayroll.householdMonthlyCashWithKindergeldEur > 0);
  });

  it("synchronizes planningYear changes to activeParameterYear in parameterStore", () => {
    const targetYear = toFullCalendarYear(2025);
    updateLifeProfileField("planningYear", targetYear);

    assert.equal(unifiedLifeProfile.value.planningYear, 2025);
    assert.equal(activeParameterYear.value, 2025);
  });

  it("replaces, reloads, and resets the profile cleanly", () => {
    const custom = {
      ...createDefaultUnifiedLifeProfile(),
      planningYear: toFullCalendarYear(2025),
      primaryAnnualGrossEur: toGrossSalary(82000),
    };
    replaceUnifiedLifeProfile(custom);
    assert.equal(unifiedLifeProfile.value.planningYear, 2025);
    assert.equal(unifiedLifeProfile.value.primaryAnnualGrossEur, 82000);
    assert.equal(activeParameterYear.value, 2025);

    reloadUnifiedLifeProfileFromStorage();
    assert.equal(unifiedLifeProfile.value.version, 1);

    resetUnifiedLifeProfile();
    assert.deepEqual(unifiedLifeProfile.value, createDefaultUnifiedLifeProfile());
  });
});
