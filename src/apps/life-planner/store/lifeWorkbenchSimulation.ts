import {
  batch,
  computed,
  effect,
  signal,
} from "@preact/signals";
import {
  CalculationStatus,
  createCalculationScheduler,
} from "#utils/calculationScheduler";
import {
  type LifeWorkbenchBundle,
  evaluateLifeWorkbenchBundle,
} from "#engine/lifeSimulator/scenarioBuilder";
import {
  DISASTER_PRESETS,
} from "#engine/lifeSimulator/disasterSimulator";
import {
  activeDisasterPresetId,
  commitmentStressDeltaEur,
  disasterTriggerMonth,
  lifeWorkbenchPlan,
} from "#/apps/life-planner/store/lifeWorkbenchState.ts";
import {
  applyLifeWorkbenchDampening,
  lifeWorkbenchDampening,
} from "#/apps/life-planner/store/lifeWorkbenchDampening.ts";
import {
  LifeScenarioView,
  activeLifeScenarioView,
} from "#/apps/life-planner/store/lifeWorkbenchUiState.ts";

export {
  CalculationStatus,
};

export const LIFE_WORKBENCH_DEBOUNCE_MS = 220;

export const lifeCalculationStatus = signal<CalculationStatus>(CalculationStatus.Calculated);
export const lifePendingChanges = signal<number>(0);

function evaluateBundleSnapshot(): LifeWorkbenchBundle {
  const rawPlan = lifeWorkbenchPlan.peek();
  const effectivePlan = applyLifeWorkbenchDampening(rawPlan, lifeWorkbenchDampening.peek());
  const presetId = activeDisasterPresetId.peek();
  const trigger = disasterTriggerMonth.peek();
  const delta = commitmentStressDeltaEur.peek();
  const preset = DISASTER_PRESETS.find((p) => p.id === presetId) ?? DISASTER_PRESETS[0];
  const shocks = preset.buildShocks(trigger);
  return evaluateLifeWorkbenchBundle(effectivePlan, shocks, delta);
}

const committedBundle = signal<LifeWorkbenchBundle>(evaluateBundleSnapshot());

const scheduler = createCalculationScheduler({
  debounceMs: LIFE_WORKBENCH_DEBOUNCE_MS,
  onStatusChange: (status, pending) => {
    batch(() => {
      lifeCalculationStatus.value = status;
      lifePendingChanges.value = pending;
    });
  },
  onCalculate: () => {
    committedBundle.value = evaluateBundleSnapshot();
  },
});

let isFirstEffectRun = true;
effect(() => {
  void lifeWorkbenchPlan.value;
  void lifeWorkbenchDampening.value;
  void activeDisasterPresetId.value;
  void disasterTriggerMonth.value;
  void commitmentStressDeltaEur.value;
  if (isFirstEffectRun) {
    isFirstEffectRun = false;
    return;
  }
  scheduler.notifyInputChange();
});

export function flushLifeWorkbenchCalculations(): void {
  scheduler.flush();
}

export const displayedLifeBundle = computed(() => committedBundle.value);

export const displayedActiveScenarioResult = computed(() => {
  const bundle = committedBundle.value;
  switch (activeLifeScenarioView.value) {
    case LifeScenarioView.Baseline:
      return bundle.baseline;
    case LifeScenarioView.StressTest:
      return bundle.stressTest;
    case LifeScenarioView.Planned:
    case LifeScenarioView.Compare:
      return bundle.planned;
  }
});
