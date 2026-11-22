import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  runScenarioBatches,
} from "#engine/simulator/timelineGenerator";
import {
  createInflationAssumptionsFromContext,
  createTimelineConventionsFromContext,
  extractTaxRuleOverridesFromContext,
} from "#engine/parameters/contextAdapters";
import {
  activeStatutoryContext,
} from "#store/parameterStore";
import {
  SimulationStrategy,
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";
import {
  PlanCapDiagnosticStatus,
} from "#engine/formulas/pure/parentalPlanDiagnostics";
import {
  WORKBENCH_PRESETS,
  WorkbenchPresetId,
} from "#engine/simulator/workbenchPresets";
import {
  exportStateToJson,
  importStateFromJson,
} from "#engine/storage/exportImport";
import {
  applyOptimalWorkbenchTaxSwitches,
  applyWorkbenchPreset,
  buildWorkbenchPreexisting,
  clearWorkbenchPlan,
  clearWorkbenchTaxSwitches,
  getDefaultWorkbenchExtras,
  importWorkbenchState,
  updateWorkbenchExtras,
  workbenchExtras,
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";
import {
  computeWorkbenchScenario,
  displayedWorkbenchDeductibles,
  displayedWorkbenchDiagnostics,
  displayedWorkbenchMetrics,
  displayedWorkbenchScenarioB,
  displayedWorkbenchScenarioC,
  flushWorkbenchCalculations,
} from "#/apps/parental-planner/store/workbenchSimulation.ts";
import {
  WorkbenchGranularModal,
  WorkbenchTab,
  toWorkbenchGranularModal,
  toWorkbenchTab,
} from "#/apps/parental-planner/store/workbenchUiState.ts";

describe("parental-planner store", () => {
  it("validates UI enums strictly", () => {
    assert.equal(toWorkbenchTab("overview"), WorkbenchTab.Overview);
    assert.equal(toWorkbenchTab("deadlines"), WorkbenchTab.Deadlines);
    assert.throws(() => toWorkbenchTab("unknown"), TypeError);

    assert.equal(toWorkbenchGranularModal("income"), WorkbenchGranularModal.Income);
    assert.equal(toWorkbenchGranularModal("costs"), WorkbenchGranularModal.Costs);
    assert.throws(() => toWorkbenchGranularModal("invalid"), TypeError);
  });

  it("matches direct runScenarioBatches bit-for-bit across all steady-salary presets", () => {
    for (const preset of WORKBENCH_PRESETS) {
      applyWorkbenchPreset(preset.id);
      flushWorkbenchCalculations();
      const s = workbenchState.peek();
      const ctx = activeStatutoryContext.peek();
      const base = buildWorkbenchPreexisting(s);
      const preexisting = {
        ...base,
        timelineConventions: createTimelineConventionsFromContext(ctx),
        taxRuleOverrides: extractTaxRuleOverridesFromContext(ctx),
        inflationAssumptions: createInflationAssumptionsFromContext(ctx, s.indexFutureTaxBrackets ?? false),
      };
      const dynamicPregnancies = s.customPregnancies.map((p) => ({
        ...p,
        motherPostBirthPartTimeClass5Net: preexisting.wifeInitialPartTimeClass5Net,
        motherPostBirthPartTimeClass3Net: preexisting.wifeInitialPartTimeClass3Net,
      }));
      const directC = runScenarioBatches({
        scenarioKey: SimulationStrategy.StatutoryOptimized,
        preexisting,
        pregnancies: dynamicPregnancies,
        taxClassSwitches: s.customTaxClassSwitches,
        salaryRaises: s.customSalaryRaises,
        workingHoursChanges: s.customWorkingHoursChanges,
        financialEvents: s.customFinancialEvents,
      });
      const workbenchC = computeWorkbenchScenario(
        SimulationStrategy.StatutoryOptimized,
        s,
        getDefaultWorkbenchExtras(),
      );
      assert.equal(workbenchC.summary.grandTotal, directC.summary.grandTotal);
      assert.equal(workbenchC.summary.totalWifeElterngeld, directC.summary.totalWifeElterngeld);
      assert.equal(workbenchC.months.length, directC.months.length);
    }
  });

  it("synthesizes and clears optimal § 2b BEEG tax class switches and reflects gain in diagnostics", () => {
    applyWorkbenchPreset(WorkbenchPresetId.ClassicOneChild);
    clearWorkbenchTaxSwitches();
    flushWorkbenchCalculations();
    assert.equal(workbenchState.peek().customTaxClassSwitches.length, 0);

    applyOptimalWorkbenchTaxSwitches();
    flushWorkbenchCalculations();
    assert.ok(workbenchState.peek().customTaxClassSwitches.length > 0);
    assert.equal(
      displayedWorkbenchMetrics.value.gainCvsB,
      displayedWorkbenchScenarioC.value.summary.grandTotal - displayedWorkbenchScenarioB.value.summary.grandTotal,
    );
    assert.equal(displayedWorkbenchDiagnostics.value.incomeCap.status, PlanCapDiagnosticStatus.Eligible);
  });

  it("injects annual deductible-expense tax refunds and regional family benefits into cashflow", () => {
    applyWorkbenchPreset(WorkbenchPresetId.ClassicOneChild);
    flushWorkbenchCalculations();
    const baselineTotal = displayedWorkbenchScenarioC.value.summary.grandTotal;

    updateWorkbenchExtras({
      werbungskostenAnnual: toEuroAmount(3230),
      householdServicesLaborAnnual: toEuroAmount(2000),
      marginalTaxRate: toPercentageRate(0.35),
      regionalBenefitMonthly: toEuroAmount(250),
    });
    flushWorkbenchCalculations();

    assert.ok(displayedWorkbenchDeductibles.value.totalEstimatedAnnualTaxRefund > 0);
    assert.equal(workbenchExtras.peek().regionalBenefitMonthly, 250);
    assert.ok(displayedWorkbenchScenarioC.value.summary.grandTotal > baselineTotal);

    // Reset back to clean default
    applyWorkbenchPreset(WorkbenchPresetId.ClassicOneChild);
    flushWorkbenchCalculations();
  });

  it("round-trips JSON plans cleanly with Classic Planner schema compatibility", () => {
    applyWorkbenchPreset(WorkbenchPresetId.TwoChildrenSiblingBonus);
    flushWorkbenchCalculations();
    const beforeTotal = displayedWorkbenchScenarioC.value.summary.grandTotal;
    const beforeEg = displayedWorkbenchScenarioC.value.summary.totalWifeElterngeld;
    const json = exportStateToJson(workbenchState.peek());

    applyWorkbenchPreset(WorkbenchPresetId.BlankPlan);
    flushWorkbenchCalculations();
    assert.notEqual(displayedWorkbenchScenarioC.value.summary.grandTotal, beforeTotal);

    const parsed = importStateFromJson(json);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      importWorkbenchState(parsed.state);
      flushWorkbenchCalculations();
      assert.equal(displayedWorkbenchScenarioC.value.summary.grandTotal, beforeTotal);
      assert.equal(displayedWorkbenchScenarioC.value.summary.totalWifeElterngeld, beforeEg);
    }

    applyWorkbenchPreset(WorkbenchPresetId.ClassicOneChild);
    flushWorkbenchCalculations();
  });

  it("clears all salaries, births, switches, and extras cleanly to a €0 blank slate", () => {
    applyWorkbenchPreset(WorkbenchPresetId.TwoChildrenSiblingBonus);
    clearWorkbenchPlan();
    flushWorkbenchCalculations();
    const s = workbenchState.peek();
    assert.equal(s.husbandGross, 0);
    assert.equal(s.wifeGross, 0);
    assert.equal(s.customPregnancies.length, 0);
    assert.equal(s.customTaxClassSwitches.length, 0);
    assert.equal(s.childcarePlan?.enabled, false);
    assert.equal(displayedWorkbenchScenarioC.value.summary.grandTotal, 0);
  });
});
