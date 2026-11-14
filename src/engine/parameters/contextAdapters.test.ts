import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  DEFAULT_TIMELINE_CONVENTIONS,
} from "#engine/config/timelineConventions";
import {
  createStatutoryCalculationContext,
} from "#engine/formulas/context/statutoryContext";
import {
  createInflationAssumptionsFromContext,
  createTaxRulesFromContext,
  createTimelineConventionsFromContext,
  extractTaxRuleOverridesFromContext,
} from "#engine/parameters/contextAdapters";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  toFullCalendarYear,
} from "#engine/types";

describe("Statutory Context Engine Adapters", () => {
  it("matches baseline TaxRules and TimelineConventions when no custom overrides are set", () => {
    const context = createStatutoryCalculationContext({
      calendarYear: toFullCalendarYear(2026),
    });

    assert.deepEqual(extractTaxRuleOverridesFromContext(context), {});

    const rules = createTaxRulesFromContext(context);
    const baselineRules = createTaxRules(toFullCalendarYear(2026));
    assert.equal(
      rules.parameters.healthSupplementTotalRate.value,
      baselineRules.parameters.healthSupplementTotalRate.value,
    );
    assert.equal(rules.parameters.healthSupplementTotalRate.overridden, false);

    const conventions = createTimelineConventionsFromContext(context);
    assert.equal(
      conventions.maternityPreBirthMonths.value,
      DEFAULT_TIMELINE_CONVENTIONS.maternityPreBirthMonths.value,
    );
    assert.equal(
      conventions.motherOrdinaryPlusMonths.value,
      DEFAULT_TIMELINE_CONVENTIONS.motherOrdinaryPlusMonths.value,
    );
    assert.equal(
      conventions.partnershipBonusMonths.value,
      DEFAULT_TIMELINE_CONVENTIONS.partnershipBonusMonths.value,
    );
  });

  it("propagates validated customizable tax and convention overrides across target years", () => {
    const context = createStatutoryCalculationContext({
      calendarYear: toFullCalendarYear(2026),
      customParameterOverrides: {
        [ParameterId.Tax_HealthSupplementTotalRate]: 0.034,
        [ParameterId.Convention_MotherOrdinaryPlusMonths]: 8,
        [ParameterId.Convention_PartnershipBonusMonths]: 4,
      },
    });

    assert.deepEqual(extractTaxRuleOverridesFromContext(context), {
      healthSupplementTotalRate: 0.034,
    });

    const rules2025 = createTaxRulesFromContext(context, toFullCalendarYear(2025));
    assert.equal(rules2025.calendarYear, 2025);
    assert.equal(rules2025.parameters.healthSupplementTotalRate.value, 0.034);
    assert.equal(rules2025.parameters.healthSupplementTotalRate.overridden, true);

    const conventions = createTimelineConventionsFromContext(context);
    assert.equal(conventions.motherOrdinaryPlusMonths.value, 8);
    assert.equal(conventions.partnershipBonusMonths.value, 4);
  });

  it("extracts inflation, wage growth, and future bracket indexing planning parameters", () => {
    const defaultContext = createStatutoryCalculationContext({
      calendarYear: toFullCalendarYear(2026),
    });
    const defaults = createInflationAssumptionsFromContext(defaultContext);
    assert.equal(defaults.annualInflationRate, 0.02);
    assert.equal(defaults.annualWageGrowthRate, 0);
    assert.equal(defaults.annualBracketIndexRate, 0);
    assert.equal(defaults.indexFutureTaxBrackets, false);

    const customContext = createStatutoryCalculationContext({
      calendarYear: toFullCalendarYear(2026),
      customParameterOverrides: {
        [ParameterId.Planning_AnnualInflationRate]: 0.025,
        [ParameterId.Planning_AnnualWageGrowthRate]: 0.03,
        [ParameterId.Planning_AnnualBracketIndexRate]: 0.02,
      },
    });
    const custom = createInflationAssumptionsFromContext(customContext, true);
    assert.equal(custom.annualInflationRate, 0.025);
    assert.equal(custom.annualWageGrowthRate, 0.03);
    assert.equal(custom.annualBracketIndexRate, 0.02);
    assert.equal(custom.indexFutureTaxBrackets, true);
  });
});
