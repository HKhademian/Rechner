import {
  signal,
} from "@preact/signals";
import {
  type ElterngeldPersistedState,
} from "#engine/storage/persistence";
import {
  AnnualSalariesCount,
  toEuroAmount,
  toGrossSalary,
  toPercentageRate,
} from "#engine/types";
import type {
  WorkbenchExtrasState,
} from "#/apps/parental-planner/store/workbenchState.ts";

export const WorkbenchDampeningKey = {
  TaxSwitches: "tax-switches",
  KitaCosts: "kita-costs",
  RaisesAndBonuses: "raises-and-bonuses",
  BenefitsAndDeductibles: "benefits-and-deductibles",
  InflationIndexing: "inflation-indexing",
} as const;
export type WorkbenchDampeningKey =
  (typeof WorkbenchDampeningKey)[keyof typeof WorkbenchDampeningKey];

export function toWorkbenchDampeningKey(value: string): WorkbenchDampeningKey {
  if (!Object.values(WorkbenchDampeningKey).includes(value as WorkbenchDampeningKey)) {
    throw new TypeError(`Unknown workbench dampening key: ${value}`);
  }
  return value as WorkbenchDampeningKey;
}

/**
 * Non-destructive scenario dampening switches.
 * When `true`, the corresponding feature is temporarily suppressed in live simulation
 * without erasing the user's configured inputs in persisted state.
 */
export interface WorkbenchDampeningState {
  readonly dampenTaxSwitches: boolean;
  readonly dampenKitaCosts: boolean;
  readonly dampenRaisesAndBonuses: boolean;
  readonly dampenBenefitsAndDeductibles: boolean;
  readonly dampenInflationIndexing: boolean;
}

export const DEFAULT_WORKBENCH_DAMPENING: WorkbenchDampeningState = Object.freeze({
  dampenTaxSwitches: false,
  dampenKitaCosts: false,
  dampenRaisesAndBonuses: false,
  dampenBenefitsAndDeductibles: false,
  dampenInflationIndexing: false,
});

export const workbenchDampening = signal<WorkbenchDampeningState>(DEFAULT_WORKBENCH_DAMPENING);

export function setWorkbenchDampening(key: WorkbenchDampeningKey, dampened: boolean): void {
  const prev = workbenchDampening.peek();
  switch (key) {
    case WorkbenchDampeningKey.TaxSwitches:
      workbenchDampening.value = Object.freeze({
        ...prev,
        dampenTaxSwitches: dampened,
      });
      return;
    case WorkbenchDampeningKey.KitaCosts:
      workbenchDampening.value = Object.freeze({
        ...prev,
        dampenKitaCosts: dampened,
      });
      return;
    case WorkbenchDampeningKey.RaisesAndBonuses:
      workbenchDampening.value = Object.freeze({
        ...prev,
        dampenRaisesAndBonuses: dampened,
      });
      return;
    case WorkbenchDampeningKey.BenefitsAndDeductibles:
      workbenchDampening.value = Object.freeze({
        ...prev,
        dampenBenefitsAndDeductibles: dampened,
      });
      return;
    case WorkbenchDampeningKey.InflationIndexing:
      workbenchDampening.value = Object.freeze({
        ...prev,
        dampenInflationIndexing: dampened,
      });
      return;
  }
}

export function toggleWorkbenchDampening(key: WorkbenchDampeningKey): void {
  const prev = workbenchDampening.peek();
  switch (key) {
    case WorkbenchDampeningKey.TaxSwitches:
      setWorkbenchDampening(key, !prev.dampenTaxSwitches);
      return;
    case WorkbenchDampeningKey.KitaCosts:
      setWorkbenchDampening(key, !prev.dampenKitaCosts);
      return;
    case WorkbenchDampeningKey.RaisesAndBonuses:
      setWorkbenchDampening(key, !prev.dampenRaisesAndBonuses);
      return;
    case WorkbenchDampeningKey.BenefitsAndDeductibles:
      setWorkbenchDampening(key, !prev.dampenBenefitsAndDeductibles);
      return;
    case WorkbenchDampeningKey.InflationIndexing:
      setWorkbenchDampening(key, !prev.dampenInflationIndexing);
      return;
  }
}

export function resetWorkbenchDampening(): void {
  workbenchDampening.value = DEFAULT_WORKBENCH_DAMPENING;
}

export function countActiveDampenedSwitches(dampening: WorkbenchDampeningState): number {
  let count = 0;
  if (dampening.dampenTaxSwitches) {
    count += 1;
  }
  if (dampening.dampenKitaCosts) {
    count += 1;
  }
  if (dampening.dampenRaisesAndBonuses) {
    count += 1;
  }
  if (dampening.dampenBenefitsAndDeductibles) {
    count += 1;
  }
  if (dampening.dampenInflationIndexing) {
    count += 1;
  }
  return count;
}

export function hasConfiguredRaisesOrBonuses(state: ElterngeldPersistedState): boolean {
  return (
    state.customSalaryRaises.length > 0 ||
    (state.enableSalaryRaises && state.annualSalaryRaisePercent > 0) ||
    state.enable13thSalary ||
    state.husbandSalariesCount !== AnnualSalariesCount.Twelve ||
    state.wifeSalariesCount !== AnnualSalariesCount.Twelve ||
    state.annualBonusGross > 0 ||
    state.investmentReturnMonthly > 0
  );
}

export function hasConfiguredBenefitsOrDeductibles(
  state: ElterngeldPersistedState,
  extras: WorkbenchExtrasState,
): boolean {
  return (
    state.customFinancialEvents.length > 0 ||
    extras.regionalBenefitMonthly > 0 ||
    extras.werbungskostenAnnual > 0 ||
    extras.sonderausgabenAnnual > 0 ||
    extras.householdServicesLaborAnnual > 0 ||
    extras.craftsmenLaborAnnual > 0
  );
}

export interface DampenedWorkbenchInputs {
  readonly effectiveState: ElterngeldPersistedState;
  readonly effectiveExtras: WorkbenchExtrasState;
  readonly dampenedCount: number;
}

/**
 * Pure projection applying active dampening switches over persisted state and extras
 * without mutating any stored user inputs.
 */
export function applyWorkbenchDampening(
  state: ElterngeldPersistedState,
  extras: WorkbenchExtrasState,
  dampening: WorkbenchDampeningState,
): DampenedWorkbenchInputs {
  const dampenedCount = countActiveDampenedSwitches(dampening);
  if (dampenedCount === 0) {
    return Object.freeze({
      effectiveState: state,
      effectiveExtras: extras,
      dampenedCount: 0,
    });
  }

  let effectiveState: ElterngeldPersistedState = state;
  let effectiveExtras: WorkbenchExtrasState = extras;

  if (dampening.dampenTaxSwitches) {
    effectiveState = {
      ...effectiveState,
      customTaxClassSwitches: [],
    };
  }

  if (dampening.dampenKitaCosts && effectiveState.childcarePlan) {
    effectiveState = {
      ...effectiveState,
      childcarePlan: Object.freeze({
        ...effectiveState.childcarePlan,
        enabled: false,
      }),
    };
  }

  if (dampening.dampenRaisesAndBonuses) {
    effectiveState = {
      ...effectiveState,
      enableSalaryRaises: false,
      annualSalaryRaisePercent: 0,
      enable13thSalary: false,
      husbandSalariesCount: AnnualSalariesCount.Twelve,
      wifeSalariesCount: AnnualSalariesCount.Twelve,
      husbandBonusDistribution: [],
      wifeBonusDistribution: [],
      annualBonusGross: toGrossSalary(0),
      investmentReturnMonthly: toEuroAmount(0),
      customSalaryRaises: [],
    };
  }

  if (dampening.dampenBenefitsAndDeductibles) {
    effectiveState = {
      ...effectiveState,
      customFinancialEvents: [],
    };
    effectiveExtras = Object.freeze({
      werbungskostenAnnual: toEuroAmount(0),
      sonderausgabenAnnual: toEuroAmount(0),
      householdServicesLaborAnnual: toEuroAmount(0),
      craftsmenLaborAnnual: toEuroAmount(0),
      marginalTaxRate: toPercentageRate(extras.marginalTaxRate),
      regionalBenefitMonthly: toEuroAmount(0),
      regionalBenefitLabel: extras.regionalBenefitLabel,
    });
  }

  if (dampening.dampenInflationIndexing) {
    effectiveState = {
      ...effectiveState,
      indexFutureTaxBrackets: false,
    };
  }

  return Object.freeze({
    effectiveState,
    effectiveExtras,
    dampenedCount,
  });
}
