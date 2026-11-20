import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  toEuroCents,
} from "#engine/types";
import {
  CASH_BALANCE_FORMULA_VERSION,
  ExplanationFormulaKind,
  ExplanationStatus,
  explainEventCashProjection,
  explainRecurringCashProjection,
  toExplanationFormulaKind,
  toExplanationStatus,
  toFormulaVersion,
} from "#engine/lifeProfile/calculationExplanation";
import {
  CashOverlapPolicy,
} from "#engine/lifeProfile/cashForecastOverlap";

it("validates explanation metadata guards and explains recurring and event cash projections", () => {
  assert.equal(toFormulaVersion("v1.0"), "v1.0");
  assert.throws(() => toFormulaVersion(" "));
  assert.equal(toExplanationFormulaKind("statutory"), ExplanationFormulaKind.Statutory);
  assert.throws(() => toExplanationFormulaKind("other"));
  assert.equal(toExplanationStatus("projected"), ExplanationStatus.Projected);
  assert.throws(() => toExplanationStatus("maybe"));

  const recurring = explainRecurringCashProjection({
    originMonth: "2026-11",
    monthCount: 6,
    opening: toEuroCents(100000),
    recurringInflow: toEuroCents(300000),
    recurringExpense: toEuroCents(200000),
    policy: CashOverlapPolicy.AddExplicitExtraEventsOnly,
    selectedExtraCount: 2,
  });
  assert.equal(recurring.kind, ExplanationFormulaKind.PureArithmetic);
  assert.equal(recurring.status, ExplanationStatus.Supported);
  assert.equal(recurring.formulaVersion, CASH_BALANCE_FORMULA_VERSION);
  assert.equal(recurring.inputs.some((item) => item.label === "Selected extra one-off events" && item.value === "2"), true);
  assert.equal(recurring.parameters.length, 0);

  const eventOnly = explainEventCashProjection({
    originMonth: "2026-11",
    monthCount: 6,
    opening: undefined,
    includePlanned: true,
    includedEventCount: 3,
    reconciledPlanCount: 1,
  });
  assert.equal(eventOnly.kind, ExplanationFormulaKind.PureArithmetic);
  assert.equal(eventOnly.inputs.find((item) => item.label === "Opening balance")?.value, "Unknown");
  assert.equal(eventOnly.inputs.find((item) => item.label === "Reconciled planned entries preserved")?.value, "1 (not double-counted)");
});
