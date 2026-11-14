import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  createDefaultInflationAssumptionsConfig,
  resolveEffectiveTaxRulesForYear,
} from "#engine/tax/inflationIndexing";
import {
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  computeAnnualIncomeTax,
} from "#engine/tax/wageTax";
import {
  toFullCalendarYear,
  toPercentageRate,
} from "#engine/types";

describe("Future Tax Bracket Inflation Indexing", () => {
  it("keeps verified statutory years and disabled future years bit-for-bit identical", () => {
    const defaults = createDefaultInflationAssumptionsConfig();
    assert.equal(defaults.annualInflationRate, 0.02);
    assert.equal(defaults.indexFutureTaxBrackets, false);

    // Verified 2026 rules stay unchanged even if indexFutureTaxBrackets=true
    const verified2026 = createTaxRules(toFullCalendarYear(2026));
    const resolved2026 = resolveEffectiveTaxRulesForYear(
      toFullCalendarYear(2026),
      undefined,
      toPercentageRate(0.03),
      true,
    );
    assert.equal(resolved2026.projected, false);
    assert.equal(
      resolved2026.parameters.basicAllowance.value,
      verified2026.parameters.basicAllowance.value,
    );

    // Future 2028 with indexing disabled stays identical to baseline 2028 projection
    const baseline2028 = createTaxRules(toFullCalendarYear(2028));
    const disabled2028 = resolveEffectiveTaxRulesForYear(
      toFullCalendarYear(2028),
      undefined,
      toPercentageRate(0.03),
      false,
    );
    assert.equal(
      disabled2028.parameters.basicAllowance.value,
      baseline2028.parameters.basicAllowance.value,
    );
  });

  it("shifts future projected year (> sourceYear) tariff bounds upward and lowers bracket creep", () => {
    const baseline2029 = resolveEffectiveTaxRulesForYear(
      toFullCalendarYear(2029),
      { healthSupplementTotalRate: 0.031 },
      toPercentageRate(0.025),
      false,
    );
    const indexed2029 = resolveEffectiveTaxRulesForYear(
      toFullCalendarYear(2029),
      { healthSupplementTotalRate: 0.031 },
      toPercentageRate(0.025),
      true,
    );

    assert.equal(indexed2029.projected, true);
    assert.equal(indexed2029.parameters.healthSupplementTotalRate.value, 0.031);
    assert.ok(indexed2029.parameters.basicAllowance.value > baseline2029.parameters.basicAllowance.value);
    assert.ok(
      indexed2029.parameters.progression2Ceiling.value > baseline2029.parameters.progression2Ceiling.value,
    );

    const taxWithoutIndex = computeAnnualIncomeTax(70000, baseline2029);
    const taxWithIndex = computeAnnualIncomeTax(70000, indexed2029);
    assert.ok(taxWithIndex < taxWithoutIndex);
  });
});
