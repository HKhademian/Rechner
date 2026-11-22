import {
  batch,
  computed,
  effect,
  signal,
} from "@preact/signals";
import {
  type FinancialEventAction,
  type SalaryRaiseAction,
  type ScenarioId as ScenarioIdType,
  type SimulationResult,
  ActiveScenarioView,
  FinancialEventCategory,
  ScenarioId,
  SimulationStrategy,
  TargetPerson,
  toCalendarMonth,
  toFinancialEventId,
  toFullCalendarYear,
  toPercentageRate,
  toRaiseId,
  toSimulationMonth,
} from "#engine/types";
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
  CalculationStatus,
  createCalculationScheduler,
} from "#utils/calculationScheduler";
import {
  type DeductibleExpensesFormulaResult,
  evaluateDeductibleExpensesFormula,
} from "#engine/formulas/pure/deductibleExpensesFormula";
import {
  type ParentalPlanDiagnostics,
  evaluateParentalPlanDiagnostics,
} from "#engine/formulas/pure/parentalPlanDiagnostics";
import {
  type WorkbenchExtrasState,
  buildWorkbenchPreexisting,
  workbenchExtras,
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";
import {
  type ElterngeldPersistedState,
} from "#engine/storage/persistence";
import {
  simMonthToCalendarDate,
} from "#engine/simulator/calendarNavigation";

export {
  CalculationStatus,
};

export interface WorkbenchComparisonMetrics {
  readonly gainCvsB: number;
  readonly diffCvsA: number;
  readonly wifeEgGainCvsB: number;
}

function buildEffectiveSalaryRaises(
  state: ElterngeldPersistedState,
): readonly SalaryRaiseAction[] {
  const custom = [...state.customSalaryRaises];
  if (!state.enableSalaryRaises || state.annualSalaryRaisePercent <= 0) {
    return custom;
  }
  const years = Math.floor(state.simulationDurationMonths / 12);
  for (let y = 1; y < years; y++) {
    const simMonth = toSimulationMonth(y * 12 + 1);
    const cal = simMonthToCalendarDate(simMonth, state.startCalendarYear, state.startCalendarMonth);
    custom.push({
      raiseId: toRaiseId(`AUTO-RAISE-Y${y + 1}`),
      effectiveSimulationMonth: simMonth,
      effectiveCalendarMonth: cal.calendarMonth,
      effectiveCalendarYear: cal.calendarYear,
      targetPerson: TargetPerson.Both,
      percentageIncrease: toPercentageRate(state.annualSalaryRaisePercent),
      reason: `Annual raise (+${(state.annualSalaryRaisePercent * 100).toFixed(1)}%)`,
    });
  }
  return custom;
}

function buildEffectiveFinancialEvents(
  state: ElterngeldPersistedState,
  extras: WorkbenchExtrasState,
  deductibles: DeductibleExpensesFormulaResult,
): readonly FinancialEventAction[] {
  const events: FinancialEventAction[] = [...state.customFinancialEvents];

  // Optional recurring regional family benefit (e.g. Bayerisches Familiengeld months 13..36 of child 1)
  if (extras.regionalBenefitMonthly > 0 && state.customPregnancies.length > 0) {
    const firstBirth = [...state.customPregnancies].sort(
      (a, b) => a.calculatedDeliverySimulationMonth - b.calculatedDeliverySimulationMonth,
    )[0];
    const startSim = firstBirth.calculatedDeliverySimulationMonth + 12;
    const endSim = Math.min(state.simulationDurationMonths, firstBirth.calculatedDeliverySimulationMonth + 35);
    for (let m = startSim; m <= endSim; m++) {
      const simMonth = toSimulationMonth(m);
      const cal = simMonthToCalendarDate(simMonth, state.startCalendarYear, state.startCalendarMonth);
      events.push({
        eventId: toFinancialEventId(`WB-REGBEN-${m}`),
        effectiveSimulationMonth: simMonth,
        effectiveCalendarMonth: cal.calendarMonth,
        effectiveCalendarYear: cal.calendarYear,
        amount: extras.regionalBenefitMonthly,
        category: FinancialEventCategory.HealthcareFamily,
        title: extras.regionalBenefitLabel,
        description: "Optional recurring regional family benefit modeled in Section 4.",
      });
    }
  }

  // Optional annual tax-refund credit from user-entered deductible expenses (§§ 9, 10, 35a EStG)
  if (deductibles.totalEstimatedAnnualTaxRefund > 0) {
    const returnMonth = state.taxReturnMonth;
    for (let m = 13; m <= state.simulationDurationMonths; m++) {
      const simMonth = toSimulationMonth(m);
      const cal = simMonthToCalendarDate(simMonth, state.startCalendarYear, state.startCalendarMonth);
      if (cal.calendarMonth === returnMonth) {
        events.push({
          eventId: toFinancialEventId(`WB-DEDUCT-REFUND-${cal.calendarYear}`),
          effectiveSimulationMonth: simMonth,
          effectiveCalendarMonth: toCalendarMonth(cal.calendarMonth),
          effectiveCalendarYear: toFullCalendarYear(cal.calendarYear),
          amount: deductibles.totalEstimatedAnnualTaxRefund,
          category: FinancialEventCategory.TaxAdjustment,
          title: `Tax refund from deductible expenses (${cal.calendarYear - 1})`,
          description: "Estimated annual refund from §§ 9, 10, 35a EStG deductions & credits.",
        });
      }
    }
  }

  return events;
}

/** Runs the core statutory simulator for a single scenario key against the supplied workbench state. */
export function computeWorkbenchScenario(
  scenarioKey: ScenarioIdType,
  state: ElterngeldPersistedState = workbenchState.value,
  extras: WorkbenchExtrasState = workbenchExtras.value,
): SimulationResult {
  const ctx = activeStatutoryContext.value;
  const basePreexisting = buildWorkbenchPreexisting(state);
  const preexisting = {
    ...basePreexisting,
    timelineConventions: createTimelineConventionsFromContext(ctx),
    taxRuleOverrides: extractTaxRuleOverridesFromContext(ctx),
    inflationAssumptions: createInflationAssumptionsFromContext(
      ctx,
      state.indexFutureTaxBrackets ?? false,
    ),
  };
  const deductibles = evaluateDeductibleExpensesFormula({
    werbungskostenAnnual: extras.werbungskostenAnnual,
    sonderausgabenAnnual: extras.sonderausgabenAnnual,
    householdServicesLaborAnnual: extras.householdServicesLaborAnnual,
    craftsmenLaborAnnual: extras.craftsmenLaborAnnual,
    marginalTaxRate: extras.marginalTaxRate,
  });
  const dynamicPregnancies = state.customPregnancies.map((p) => ({
    ...p,
    motherPostBirthPartTimeClass5Net: preexisting.wifeInitialPartTimeClass5Net,
    motherPostBirthPartTimeClass3Net: preexisting.wifeInitialPartTimeClass3Net,
  }));

  return runScenarioBatches({
    scenarioKey,
    preexisting,
    pregnancies: dynamicPregnancies,
    taxClassSwitches: state.customTaxClassSwitches,
    salaryRaises: buildEffectiveSalaryRaises(state),
    workingHoursChanges: state.customWorkingHoursChanges,
    financialEvents: buildEffectiveFinancialEvents(state, extras, deductibles),
  });
}

export const WORKBENCH_DEBOUNCE_MS = 250;

export const workbenchCalculationStatus = signal<CalculationStatus>(CalculationStatus.Calculated);
export const workbenchPendingChanges = signal<number>(0);
export const workbenchLastCalcDurationMs = signal<number | null>(null);

interface WorkbenchSnapshot {
  readonly scenarioA: SimulationResult;
  readonly scenarioB: SimulationResult;
  readonly scenarioC: SimulationResult;
  readonly diagnostics: ParentalPlanDiagnostics;
  readonly deductibles: DeductibleExpensesFormulaResult;
}

function evaluateSnapshot(): WorkbenchSnapshot {
  const state = workbenchState.peek();
  const extras = workbenchExtras.peek();
  const scenarioA = computeWorkbenchScenario(SimulationStrategy.StatusQuo, state, extras);
  const scenarioB = computeWorkbenchScenario(SimulationStrategy.UnoptimizedBaseline, state, extras);
  const scenarioC = computeWorkbenchScenario(SimulationStrategy.StatutoryOptimized, state, extras);
  const preexisting = buildWorkbenchPreexisting(state);
  const diagnostics = evaluateParentalPlanDiagnostics({
    preexisting,
    pregnancies: state.customPregnancies,
    taxClassSwitches: state.customTaxClassSwitches,
    householdTaxableIncome: state.householdTaxableIncome ?? [],
    scenarioC,
    scenarioB,
  });
  const deductibles = evaluateDeductibleExpensesFormula({
    werbungskostenAnnual: extras.werbungskostenAnnual,
    sonderausgabenAnnual: extras.sonderausgabenAnnual,
    householdServicesLaborAnnual: extras.householdServicesLaborAnnual,
    craftsmenLaborAnnual: extras.craftsmenLaborAnnual,
    marginalTaxRate: extras.marginalTaxRate,
  });
  return Object.freeze({
    scenarioA,
    scenarioB,
    scenarioC,
    diagnostics,
    deductibles,
  });
}

const committedSnapshot = signal<WorkbenchSnapshot>(evaluateSnapshot());

const scheduler = createCalculationScheduler({
  debounceMs: WORKBENCH_DEBOUNCE_MS,
  onStatusChange: (status, pending) => {
    batch(() => {
      workbenchCalculationStatus.value = status;
      workbenchPendingChanges.value = pending;
    });
  },
  onCalculate: () => {
    const start = typeof performance !== "undefined" ? performance.now() : Date.now();
    const next = evaluateSnapshot();
    const end = typeof performance !== "undefined" ? performance.now() : Date.now();
    batch(() => {
      committedSnapshot.value = next;
      workbenchLastCalcDurationMs.value = Math.max(0, Math.round(end - start));
    });
  },
});

let isFirstEffectRun = true;
effect(() => {
  // Subscribe to state, extras, and statutory parameter context changes.
  void workbenchState.value;
  void workbenchExtras.value;
  void activeStatutoryContext.value;
  if (isFirstEffectRun) {
    isFirstEffectRun = false;
    return;
  }
  scheduler.notifyInputChange();
});

export function flushWorkbenchCalculations(): void {
  scheduler.flush();
}

export const displayedWorkbenchScenarioA = computed<SimulationResult>(
  () => committedSnapshot.value.scenarioA,
);
export const displayedWorkbenchScenarioB = computed<SimulationResult>(
  () => committedSnapshot.value.scenarioB,
);
export const displayedWorkbenchScenarioC = computed<SimulationResult>(
  () => committedSnapshot.value.scenarioC,
);
export const displayedWorkbenchDiagnostics = computed<ParentalPlanDiagnostics>(
  () => committedSnapshot.value.diagnostics,
);
export const displayedWorkbenchDeductibles = computed<DeductibleExpensesFormulaResult>(
  () => committedSnapshot.value.deductibles,
);

export const displayedWorkbenchCurrentScenario = computed<SimulationResult>(() => {
  const view = workbenchState.value.activeScenario;
  if (view === ActiveScenarioView.StatusQuo) {
    return displayedWorkbenchScenarioA.value;
  }
  if (view === ActiveScenarioView.UnoptimizedBaseline) {
    return displayedWorkbenchScenarioB.value;
  }
  return displayedWorkbenchScenarioC.value;
});

export const displayedWorkbenchMetrics = computed<WorkbenchComparisonMetrics>(() => {
  const a = displayedWorkbenchScenarioA.value.summary;
  const b = displayedWorkbenchScenarioB.value.summary;
  const c = displayedWorkbenchScenarioC.value.summary;
  return Object.freeze({
    gainCvsB: c.grandTotal - b.grandTotal,
    diffCvsA: c.grandTotal - a.grandTotal,
    wifeEgGainCvsB: c.totalWifeElterngeld - b.totalWifeElterngeld,
  });
});

export function getWorkbenchScenarioResult(id: ScenarioIdType): SimulationResult {
  if (id === ScenarioId.A) {
    return displayedWorkbenchScenarioA.value;
  }
  if (id === ScenarioId.B) {
    return displayedWorkbenchScenarioB.value;
  }
  return displayedWorkbenchScenarioC.value;
}
