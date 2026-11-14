import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  DEFAULT_BENEFIT_RULES,
} from "#engine/config/benefitRules";
import {
  DEFAULT_TIMELINE_CONVENTIONS,
} from "#engine/config/timelineConventions";
import {
  LAW_REGISTRY,
} from "#engine/laws/registry";
import {
  LawId,
} from "#engine/laws/types";
import {
  PARAMETER_REGISTRY,
  attemptParameterModification,
  formatParameterValue,
  getAllParameterDefinitions,
  getAvailableParameterYears,
  getParameterDefinition,
  getParametersByDomain,
  getParametersByLaw,
  getTaxParameterPrimaryLawId,
  resolveParameterForYear,
  searchParameters,
} from "#engine/parameters/registry";
import {
  ParameterDomain,
  ParameterFlagCode,
  ParameterId,
  ParameterMutability,
  ParameterUnit,
} from "#engine/parameters/types";
import {
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  toFullCalendarYear,
} from "#engine/types";

describe("Unified Law-Linked Parameter Value Storage", () => {
  it("registers every ParameterId with valid LawIds and non-empty metadata", () => {
    const allIds = Object.values(ParameterId);
    const entries = getAllParameterDefinitions();
    assert.equal(entries.length, allIds.length);

    for (const id of allIds) {
      const def = getParameterDefinition(id);
      assert.equal(def.id, id);
      assert.ok(Object.isFrozen(def));
      assert.ok(def.label.length > 0);
      assert.ok(def.description.length > 0);
      assert.ok(def.lawIds.length > 0, `${id} must link to at least one LawId`);
      for (const lawId of def.lawIds) {
        assert.ok(Object.hasOwn(LAW_REGISTRY, lawId), `${id} references unknown LawId ${lawId}`);
      }
    }
    assert.ok(Object.isFrozen(PARAMETER_REGISTRY));
  });

  it("maintains exact numeric parity with taxRules, benefitRules, and timelineConventions", () => {
    const tax2025 = createTaxRules(toFullCalendarYear(2025));
    const tax2026 = createTaxRules(toFullCalendarYear(2026));

    assert.equal(
      resolveParameterForYear(ParameterId.Tax_BasicAllowance, toFullCalendarYear(2025)).baselineValue,
      tax2025.parameters.basicAllowance.value,
    );
    assert.equal(
      resolveParameterForYear(ParameterId.Tax_BasicAllowance, toFullCalendarYear(2026)).baselineValue,
      tax2026.parameters.basicAllowance.value,
    );
    assert.equal(
      resolveParameterForYear(ParameterId.Benefit_BasisMaximum).baselineValue,
      DEFAULT_BENEFIT_RULES.basisMaximum.value,
    );
    assert.equal(
      resolveParameterForYear(ParameterId.Convention_MotherOrdinaryPlusMonths).baselineValue,
      DEFAULT_TIMELINE_CONVENTIONS.motherOrdinaryPlusMonths.value,
    );
    assert.equal(
      resolveParameterForYear(ParameterId.Employment_MarginalLimitMonthly, toFullCalendarYear(2026)).baselineValue,
      603,
    );
    assert.equal(
      resolveParameterForYear(ParameterId.Employment_MarginalLimitMonthly, toFullCalendarYear(2027)).baselineValue,
      633,
    );
    assert.equal(
      resolveParameterForYear(ParameterId.Benefit_CoupleTaxableIncomeMaximum, toFullCalendarYear(2025)).baselineValue,
      175000,
    );
  });

  it("permits Customizable overrides while raising explicit flags on unmodifiable statutory values", () => {
    // StatutoryFixed raises StatutoryFixedLocked flag
    const basisMaxAttempt = attemptParameterModification(ParameterId.Benefit_BasisMaximum, 2500);
    assert.equal(basisMaxAttempt.ok, false);
    if (!basisMaxAttempt.ok) {
      assert.equal(basisMaxAttempt.flag.code, ParameterFlagCode.StatutoryFixedLocked);
      assert.ok(basisMaxAttempt.flag.lawIds.includes(LawId.BEEG_2));
    }

    // YearIndexed raises YearIndexedLocked flag
    const basicAllowanceAttempt = attemptParameterModification(ParameterId.Tax_BasicAllowance, 15000);
    assert.equal(basicAllowanceAttempt.ok, false);
    if (!basicAllowanceAttempt.ok) {
      assert.equal(basicAllowanceAttempt.flag.code, ParameterFlagCode.YearIndexedLocked);
      assert.ok(basicAllowanceAttempt.flag.lawIds.includes(LawId.EStG_32a));
    }

    // Out-of-bounds Customizable edit raises InvalidBounds flag
    const badSupplement = attemptParameterModification(ParameterId.Tax_HealthSupplementTotalRate, -0.01);
    assert.equal(badSupplement.ok, false);
    if (!badSupplement.ok) {
      assert.equal(badSupplement.flag.code, ParameterFlagCode.InvalidBounds);
    }

    // Valid Customizable edit succeeds (differs from 2026 default 0.029)
    const validSupplement = attemptParameterModification(ParameterId.Tax_HealthSupplementTotalRate, 0.031);
    assert.equal(validSupplement.ok, true);

    const resolved = resolveParameterForYear(
      ParameterId.Tax_HealthSupplementTotalRate,
      toFullCalendarYear(2026),
      { [ParameterId.Tax_HealthSupplementTotalRate]: 0.031 },
    );
    assert.equal(resolved.activeValue, 0.031);
    assert.equal(resolved.overridden, true);
    assert.equal(resolved.editable, true);

    // Non-editable overrides supplied externally are safely ignored when resolving
    const lockedResolved = resolveParameterForYear(
      ParameterId.Benefit_BasisMaximum,
      toFullCalendarYear(2026),
      { [ParameterId.Benefit_BasisMaximum]: 9999 },
    );
    assert.equal(lockedResolved.activeValue, 1800);
    assert.equal(lockedResolved.overridden, false);
    assert.equal(lockedResolved.editable, false);
  });

  it("supports law queries, domain queries, year discovery, search, and formatting", () => {
    const years = getAvailableParameterYears();
    assert.ok(years.includes(toFullCalendarYear(2025)));
    assert.ok(years.includes(toFullCalendarYear(2026)));

    const beeg2Params = getParametersByLaw(LawId.BEEG_2);
    assert.ok(beeg2Params.length >= 10);

    const planningParams = getParametersByDomain(ParameterDomain.PlanningAssumptions);
    assert.ok(planningParams.length >= 2);

    const customizableResults = searchParameters("", {
      mutability: ParameterMutability.Customizable,
    });
    assert.equal(customizableResults.length, 11);

    const childcare2024 = resolveParameterForYear(
      ParameterId.Tax_ChildcareMaxDeductionPerChild,
      toFullCalendarYear(2024),
    );
    const childcare2025 = resolveParameterForYear(
      ParameterId.Tax_ChildcareMaxDeductionPerChild,
      toFullCalendarYear(2025),
    );
    assert.equal(childcare2024.activeValue, 4000);
    assert.equal(childcare2025.activeValue, 4800);

    const inflationDefault = resolveParameterForYear(
      ParameterId.Planning_AnnualInflationRate,
      toFullCalendarYear(2026),
    );
    assert.equal(inflationDefault.editable, true);
    assert.equal(inflationDefault.activeValue, 0.02);

    assert.equal(
      resolveParameterForYear(ParameterId.Visa_BlueCardStandardSalary, toFullCalendarYear(2026)).activeValue,
      50700,
    );
    assert.equal(
      resolveParameterForYear(ParameterId.Car_EvGrossListPriceCap, toFullCalendarYear(2024)).activeValue,
      70000,
    );
    assert.equal(
      resolveParameterForYear(ParameterId.Car_EvGrossListPriceCap, toFullCalendarYear(2026)).activeValue,
      100000,
    );
    assert.equal(
      resolveParameterForYear(ParameterId.Solar_EegPartialFeedInFirst10KwpEur, toFullCalendarYear(2026)).activeValue,
      0.0778,
    );
    assert.equal(
      resolveParameterForYear(ParameterId.Housing_KfW300BaseIncomeLimit, toFullCalendarYear(2026)).activeValue,
      90000,
    );

    assert.equal(formatParameterValue(0.67, ParameterUnit.PercentageRate), "67%");
    assert.equal(formatParameterValue(32, ParameterUnit.HoursPerWeek), "32 h/wk");
    assert.equal(formatParameterValue(30, ParameterUnit.Kilowatts), "30 kWp");
    assert.equal(formatParameterValue(0.0778, ParameterUnit.EurPerKwh), "7.78 ct/kWh");

    const taxParams = createTaxRules(toFullCalendarYear(2026)).parameters;
    for (const key of Object.keys(taxParams) as (keyof typeof taxParams)[]) {
      const primaryLawId = getTaxParameterPrimaryLawId(key);
      assert.ok(Object.hasOwn(LAW_REGISTRY, primaryLawId), `Missing LawEntry for tax key ${key}`);
    }
  });
});
