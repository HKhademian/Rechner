import assert from "node:assert/strict";
import {
  afterEach,
  describe,
  it,
} from "node:test";
import {
  DEFAULT_TAX_YEAR,
} from "#engine/tax/taxRules";
import {
  parseVerifiedTaxYear,
  resetConfig,
  selectedTaxRules,
  selectedTaxYear,
  verifiedTaxYears,
} from "#store/taxConfigStore";

describe("taxConfigStore", () => {
  afterEach(() => {
    resetConfig();
  });

  it("exposes published verified tax years including the default year", () => {
    assert.ok(verifiedTaxYears.length > 0);
    assert.equal(verifiedTaxYears.includes(DEFAULT_TAX_YEAR), true);
  });

  it("accepts verified tax years and rejects invalid or unpublished values with TypeError", () => {
    for (const year of verifiedTaxYears) {
      assert.equal(parseVerifiedTaxYear(year), year);
    }

    assert.throws(() => parseVerifiedTaxYear(1999), TypeError);
    assert.throws(() => parseVerifiedTaxYear(2099), TypeError);
    assert.throws(() => parseVerifiedTaxYear(Number.NaN), TypeError);
    assert.throws(() => parseVerifiedTaxYear("2025"), TypeError);
    assert.throws(() => parseVerifiedTaxYear(null), TypeError);
  });

  it("updates derived selectedTaxRules reactively and restores default on resetConfig", () => {
    const alternateYear = verifiedTaxYears.find((year) => year !== DEFAULT_TAX_YEAR);
    if (alternateYear !== undefined) {
      selectedTaxYear.value = parseVerifiedTaxYear(alternateYear);
      assert.equal(selectedTaxYear.value, alternateYear);
      assert.equal(selectedTaxRules.value.calendarYear, alternateYear);
    }

    resetConfig();
    assert.equal(selectedTaxYear.value, DEFAULT_TAX_YEAR);
    assert.equal(selectedTaxRules.value.calendarYear, DEFAULT_TAX_YEAR);
  });
});
