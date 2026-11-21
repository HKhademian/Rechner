import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  type PregnancyAction,
  AllowancePlanMode,
  ElterngeldVariant,
  isAllowancePlanMode,
  isElterngeldVariant,
  toAllowancePlanMode,
  toCalendarMonth,
  toChildIndex,
  toElterngeldVariant,
  toFullCalendarYear,
  toMonthDuration,
  toNetSalary,
  toPregnancyId,
  toSimulationMonth,
  toWorkingHours,
} from "#engine/types";
import {
  createStatutoryCalculationContext,
} from "#engine/formulas/context/statutoryContext";
import {
  computeAllowanceBudgetSummary,
  convertAllowanceMonthsOnVariantChange,
  evaluatePregnancyAllowanceBudgetInContext,
  resolveFatherAllowancePlanMode,
  resolveFatherAllowanceVariant,
  resolveMotherAllowancePlanMode,
  resolveMotherAllowanceVariant,
  resolveMotherOrdinaryMonthsCount,
} from "#engine/benefits/allowanceVariant";

const basePregnancy: PregnancyAction = {
  pregnancyId: toPregnancyId("PREG-VARIANT-1"),
  childIndex: toChildIndex(1),
  positiveTestCalendarMonth: toCalendarMonth(9),
  positiveTestCalendarYear: toFullCalendarYear(2026),
  positiveTestSimulationMonth: toSimulationMonth(9),
  calculatedDeliverySimulationMonth: toSimulationMonth(17),
  motherPostBirthPartTimeHours: toWorkingHours(0),
  motherPostBirthPartTimeClass5Net: toNetSalary(0),
  motherPostBirthPartTimeClass3Net: toNetSalary(0),
  fatherPartnerMonthsCount: toMonthDuration(4),
};

describe("ElterngeldVariant & Allowance Budget Helpers (BEEG §§ 4, 4a)", () => {
  it("validates ElterngeldVariant and AllowancePlanMode values and rejects raw invalid strings", () => {
    assert.equal(isElterngeldVariant("BASIS"), true);
    assert.equal(isElterngeldVariant("PLUS"), true);
    assert.equal(isElterngeldVariant("basis"), false);
    assert.equal(toElterngeldVariant("BASIS"), ElterngeldVariant.Basis);
    assert.equal(toElterngeldVariant("PLUS"), ElterngeldVariant.Plus);
    assert.throws(() => toElterngeldVariant("INVALID"), TypeError);

    assert.equal(isAllowancePlanMode("AUTO"), true);
    assert.equal(isAllowancePlanMode("BASIS"), true);
    assert.equal(isAllowancePlanMode("PLUS"), true);
    assert.equal(isAllowancePlanMode("auto"), false);
    assert.equal(toAllowancePlanMode("AUTO"), AllowancePlanMode.Auto);
    assert.throws(() => toAllowancePlanMode("INVALID"), TypeError);
  });

  it("defaults legacy pregnancies to ElterngeldPlus and resolves explicit Auto/Basis/Plus plan modes", () => {
    assert.equal(resolveMotherAllowanceVariant(basePregnancy), ElterngeldVariant.Plus);
    assert.equal(resolveFatherAllowanceVariant(basePregnancy), ElterngeldVariant.Plus);
    assert.equal(resolveMotherAllowancePlanMode(basePregnancy), AllowancePlanMode.Plus);
    assert.equal(resolveFatherAllowancePlanMode(basePregnancy), AllowancePlanMode.Plus);
    assert.equal(resolveMotherOrdinaryMonthsCount(basePregnancy), 12);

    const basisPregnancy: PregnancyAction = {
      ...basePregnancy,
      motherAllowanceVariant: ElterngeldVariant.Basis,
    };
    assert.equal(resolveMotherAllowanceVariant(basisPregnancy), ElterngeldVariant.Basis);
    assert.equal(resolveMotherAllowancePlanMode(basisPregnancy), AllowancePlanMode.Basis);
    assert.equal(resolveMotherOrdinaryMonthsCount(basisPregnancy), 6);

    const autoPregnancy: PregnancyAction = {
      ...basePregnancy,
      motherAllowancePlanMode: AllowancePlanMode.Auto,
      fatherAllowancePlanMode: AllowancePlanMode.Auto,
    };
    assert.equal(resolveMotherAllowancePlanMode(autoPregnancy), AllowancePlanMode.Auto);
    assert.equal(resolveFatherAllowancePlanMode(autoPregnancy), AllowancePlanMode.Auto);
  });

  it("computes exact 14-unit family budget for 2 MuSchG + 10 Mother Basis + 2 Father Basis", () => {
    const fullBasis: PregnancyAction = {
      ...basePregnancy,
      motherAllowanceVariant: ElterngeldVariant.Basis,
      motherAllowanceMonthsCount: toMonthDuration(10),
      fatherAllowanceVariant: ElterngeldVariant.Basis,
      fatherPartnerMonthsCount: toMonthDuration(2),
    };
    const summary = computeAllowanceBudgetSummary(fullBasis);
    assert.equal(summary.maternityBasisUnits, 2);
    assert.equal(summary.motherBasisUnits, 12);
    assert.equal(summary.fatherBasisUnits, 2);
    assert.equal(summary.totalBasisUnits, 14);
    assert.equal(summary.maxFamilyBasisUnits, 14);
    assert.equal(summary.maxMotherOrdinaryMonths, 10);
    assert.equal(summary.maxFatherOrdinaryMonths, 2);
  });

  it("converts month counts cleanly when toggling between Basis and Plus within statutory caps", () => {
    assert.equal(
      convertAllowanceMonthsOnVariantChange(
        toMonthDuration(12),
        ElterngeldVariant.Plus,
        ElterngeldVariant.Basis,
        10,
      ),
      6,
    );
    assert.equal(
      convertAllowanceMonthsOnVariantChange(
        toMonthDuration(10),
        ElterngeldVariant.Basis,
        ElterngeldVariant.Plus,
        20,
      ),
      20,
    );
    assert.equal(
      convertAllowanceMonthsOnVariantChange(
        toMonthDuration(10),
        ElterngeldVariant.Basis,
        ElterngeldVariant.Plus,
        14,
      ),
      14,
    );
  });

  it("matches Tier 2 context-aware statutory budget evaluation with full audit provenance", () => {
    const context = createStatutoryCalculationContext({
      calendarYear: toFullCalendarYear(2026),
    });
    const basisPlan: PregnancyAction = {
      ...basePregnancy,
      motherAllowanceVariant: ElterngeldVariant.Basis,
      motherAllowanceMonthsCount: toMonthDuration(10),
      fatherAllowanceVariant: ElterngeldVariant.Basis,
      fatherPartnerMonthsCount: toMonthDuration(2),
    };
    const direct = computeAllowanceBudgetSummary(basisPlan);
    const inContext = evaluatePregnancyAllowanceBudgetInContext(basisPlan, context);
    assert.deepEqual(inContext.value, direct);
    assert.equal(inContext.audit.governingLawIds.length > 0, true);
  });
});
