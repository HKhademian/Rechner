import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  type PregnancyAction,
  ElterngeldVariant,
  isElterngeldVariant,
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
  computeAllowanceBudgetSummary,
  convertAllowanceMonthsOnVariantChange,
  resolveFatherAllowanceVariant,
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
  it("validates ElterngeldVariant values and rejects raw invalid strings", () => {
    assert.equal(isElterngeldVariant("BASIS"), true);
    assert.equal(isElterngeldVariant("PLUS"), true);
    assert.equal(isElterngeldVariant("basis"), false);
    assert.equal(toElterngeldVariant("BASIS"), ElterngeldVariant.Basis);
    assert.equal(toElterngeldVariant("PLUS"), ElterngeldVariant.Plus);
    assert.throws(() => toElterngeldVariant("INVALID"), TypeError);
  });

  it("defaults legacy pregnancies to ElterngeldPlus and converts default months for Basis", () => {
    assert.equal(resolveMotherAllowanceVariant(basePregnancy), ElterngeldVariant.Plus);
    assert.equal(resolveFatherAllowanceVariant(basePregnancy), ElterngeldVariant.Plus);
    assert.equal(resolveMotherOrdinaryMonthsCount(basePregnancy), 12);

    const basisPregnancy: PregnancyAction = {
      ...basePregnancy,
      motherAllowanceVariant: ElterngeldVariant.Basis,
    };
    assert.equal(resolveMotherAllowanceVariant(basisPregnancy), ElterngeldVariant.Basis);
    assert.equal(resolveMotherOrdinaryMonthsCount(basisPregnancy), 6);
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
});
