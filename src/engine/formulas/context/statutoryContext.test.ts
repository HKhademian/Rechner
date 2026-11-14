import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  buildFormulaEvaluationAudit,
  createStatutoryCalculationContext,
} from "#engine/formulas/context/statutoryContext";
import {
  CalculationTier,
  FormulaId,
} from "#engine/formulas/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  toFullCalendarYear,
} from "#engine/types";

describe("StatutoryCalculationContext", () => {
  it("resolves year-indexed parameters deterministically from unified parameter storage", () => {
    const context2025 = createStatutoryCalculationContext({
      calendarYear: toFullCalendarYear(2025),
    });
    const context2026 = createStatutoryCalculationContext({
      calendarYear: toFullCalendarYear(2026),
    });

    assert.equal(Object.isFrozen(context2025), true);
    assert.equal(context2025.getParameterEuroAmount(ParameterId.Tax_BasicAllowance), 12096);
    assert.equal(context2026.getParameterEuroAmount(ParameterId.Tax_BasicAllowance), 12348);
    assert.equal(context2025.getParameterPercentageRate(ParameterId.Tax_HealthSupplementTotalRate), 0.025);
    assert.equal(context2026.getParameterPercentageRate(ParameterId.Tax_HealthSupplementTotalRate), 0.029);
  });

  it("permits validated Customizable overrides while rejecting StatutoryFixed and YearIndexed overrides", () => {
    const customized = createStatutoryCalculationContext({
      calendarYear: toFullCalendarYear(2026),
      customParameterOverrides: {
        [ParameterId.Tax_HealthSupplementTotalRate]: 0.032,
      },
    });
    assert.equal(customized.getParameterPercentageRate(ParameterId.Tax_HealthSupplementTotalRate), 0.032);
    assert.deepEqual(customized.overriddenParameterIds, [ParameterId.Tax_HealthSupplementTotalRate]);

    assert.throws(
      () =>
        createStatutoryCalculationContext({
          calendarYear: toFullCalendarYear(2026),
          customParameterOverrides: {
            [ParameterId.Tax_BasicAllowance]: 20000,
          },
        }),
      /published year-indexed statutory value/i,
    );

    assert.throws(
      () =>
        createStatutoryCalculationContext({
          calendarYear: toFullCalendarYear(2026),
          customParameterOverrides: {
            [ParameterId.Benefit_StandardReplacementRate]: 0.8,
          },
        }),
      /fixed by federal statute/i,
    );
  });

  it("builds immutable audit metadata linking governing LawIds and ParameterIds", () => {
    const context = createStatutoryCalculationContext({
      calendarYear: toFullCalendarYear(2026),
      customParameterOverrides: {
        [ParameterId.Tax_HealthSupplementTotalRate]: 0.031,
      },
    });

    const audit = buildFormulaEvaluationAudit(
      FormulaId.HealthInsuranceContribution,
      CalculationTier.ContextAwareStatutoryEvaluator,
      context,
      [
        ParameterId.Tax_HealthEmployeeRate,
        ParameterId.Tax_HealthSupplementTotalRate,
      ],
      [LawId.BVV_2],
    );

    assert.equal(audit.customOverrideApplied, true);
    assert.equal(audit.governingLawIds.includes(LawId.SGB5_241), true);
    assert.equal(audit.governingLawIds.includes(LawId.BVV_2), true);
    assert.deepEqual(audit.consumedParameterIds, [
      ParameterId.Tax_HealthEmployeeRate,
      ParameterId.Tax_HealthSupplementTotalRate,
    ]);
  });
});
