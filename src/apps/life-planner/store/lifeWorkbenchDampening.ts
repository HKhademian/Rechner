import {
  signal,
} from "@preact/signals";
import {
  toPercentageRate,
} from "#engine/types";
import {
  type LifePlanInput,
  LifeEventDomain,
} from "#engine/lifeSimulator/types";

export const LifeDampeningKey = {
  Career: "career",
  Family: "family",
  HousingAsset: "housing-asset",
  Tax: "tax",
  ExpenseTravel: "expense-travel",
  InflationIndexing: "inflation-indexing",
} as const;
export type LifeDampeningKey = (typeof LifeDampeningKey)[keyof typeof LifeDampeningKey];

export function toLifeDampeningKey(value: string): LifeDampeningKey {
  if (!Object.values(LifeDampeningKey).includes(value as LifeDampeningKey)) {
    throw new TypeError(`Unknown LifeDampeningKey: ${value}`);
  }
  return value as LifeDampeningKey;
}

/**
 * Non-destructive event-group dampening switches.
 * Suppresses selected domains during live simulation without erasing stored user events.
 */
export interface LifeWorkbenchDampeningState {
  readonly dampenCareer: boolean;
  readonly dampenFamily: boolean;
  readonly dampenHousingAsset: boolean;
  readonly dampenTax: boolean;
  readonly dampenExpenseTravel: boolean;
  readonly dampenInflationIndexing: boolean;
}

export const DEFAULT_LIFE_DAMPENING: LifeWorkbenchDampeningState = Object.freeze({
  dampenCareer: false,
  dampenFamily: false,
  dampenHousingAsset: false,
  dampenTax: false,
  dampenExpenseTravel: false,
  dampenInflationIndexing: false,
});

export const lifeWorkbenchDampening = signal<LifeWorkbenchDampeningState>(DEFAULT_LIFE_DAMPENING);

export function toggleLifeDampening(key: LifeDampeningKey): void {
  const prev = lifeWorkbenchDampening.peek();
  switch (key) {
    case LifeDampeningKey.Career:
      lifeWorkbenchDampening.value = Object.freeze({
        ...prev,
        dampenCareer: !prev.dampenCareer,
      });
      return;
    case LifeDampeningKey.Family:
      lifeWorkbenchDampening.value = Object.freeze({
        ...prev,
        dampenFamily: !prev.dampenFamily,
      });
      return;
    case LifeDampeningKey.HousingAsset:
      lifeWorkbenchDampening.value = Object.freeze({
        ...prev,
        dampenHousingAsset: !prev.dampenHousingAsset,
      });
      return;
    case LifeDampeningKey.Tax:
      lifeWorkbenchDampening.value = Object.freeze({
        ...prev,
        dampenTax: !prev.dampenTax,
      });
      return;
    case LifeDampeningKey.ExpenseTravel:
      lifeWorkbenchDampening.value = Object.freeze({
        ...prev,
        dampenExpenseTravel: !prev.dampenExpenseTravel,
      });
      return;
    case LifeDampeningKey.InflationIndexing:
      lifeWorkbenchDampening.value = Object.freeze({
        ...prev,
        dampenInflationIndexing: !prev.dampenInflationIndexing,
      });
      return;
  }
}

export function resetLifeDampening(): void {
  lifeWorkbenchDampening.value = DEFAULT_LIFE_DAMPENING;
}

export function countActiveLifeDampened(d: LifeWorkbenchDampeningState): number {
  return (
    (d.dampenCareer ? 1 : 0) +
    (d.dampenFamily ? 1 : 0) +
    (d.dampenHousingAsset ? 1 : 0) +
    (d.dampenTax ? 1 : 0) +
    (d.dampenExpenseTravel ? 1 : 0) +
    (d.dampenInflationIndexing ? 1 : 0)
  );
}

/** Pure non-destructive projection filtering suppressed event domains and inflation. */
export function applyLifeWorkbenchDampening(
  plan: LifePlanInput,
  d: LifeWorkbenchDampeningState,
): LifePlanInput {
  if (countActiveLifeDampened(d) === 0) {
    return plan;
  }
  const filteredEvents = plan.events.filter((ev) => {
    if (d.dampenCareer && ev.domain === LifeEventDomain.Career) {
      return false;
    }
    if (d.dampenFamily && ev.domain === LifeEventDomain.Family) {
      return false;
    }
    if (d.dampenHousingAsset && ev.domain === LifeEventDomain.HousingAsset) {
      return false;
    }
    if (d.dampenTax && ev.domain === LifeEventDomain.Tax) {
      return false;
    }
    if (d.dampenExpenseTravel && ev.domain === LifeEventDomain.ExpenseTravel) {
      return false;
    }
    return true;
  });

  const baseline = d.dampenInflationIndexing
    ? Object.freeze({
      ...plan.baseline,
      annualInflationRate: toPercentageRate(0),
      annualRentIndexationRate: toPercentageRate(0),
      indexFutureTaxBrackets: false,
    })
    : plan.baseline;

  return Object.freeze({
    baseline,
    events: Object.freeze(filteredEvents),
  });
}
