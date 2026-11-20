import {
  type EuroCents,
  toEuroCents,
} from "#engine/types";
import {
  type CashEventPayload,
  CashDirection,
} from "#engine/lifeProfile/cashEvent";
import {
  cashEventsForMonth,
} from "#engine/lifeProfile/cashEventView";
import {
  closingCashBalance,
} from "#engine/lifeProfile/cashFlowFormula";
import {
  type CashFlowAssumption,
} from "#engine/lifeProfile/cashFlowProjection";
import {
  type AccumulatorModule,
  replayAccumulator,
  toAccumulatorId,
  toAccumulatorScope,
  toAccumulatorUnit,
} from "#engine/lifeProfile/monthlyAccumulator";
import {
  type ReplayMonth,
} from "#engine/lifeProfile/monthlyReplay";
import {
  type PersonId,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
  type LifeEventId,
} from "#engine/lifeProfile/timeline";

export const CashOverlapPolicy = {
  KeepSeparate: "keep-separate",
  AddExplicitExtraEventsOnly: "add-explicit-extra-events-only",
  EventsReplaceRecurringInEventMonths: "events-replace-recurring-in-event-months",
} as const;
export type CashOverlapPolicy = (typeof CashOverlapPolicy)[keyof typeof CashOverlapPolicy];

export function toCashOverlapPolicy(value: string): CashOverlapPolicy {
  if (!Object.values(CashOverlapPolicy).includes(value as CashOverlapPolicy)) {
    throw new TypeError("Invalid cash forecast overlap policy.");
  }
  return value as CashOverlapPolicy;
}

export interface CombinedCashScenario {
  readonly personId: PersonId;
  readonly includePlanned: boolean;
  readonly assumption: CashFlowAssumption;
  readonly policy: CashOverlapPolicy;
  /** Event IDs explicitly confirmed by the user as extra one-offs outside the recurring monthly assumption. */
  readonly extraEventIds: ReadonlySet<LifeEventId>;
}

export interface CombinedCashContribution {
  readonly policy: CashOverlapPolicy;
  readonly recurringApplied: boolean;
  readonly recurringInflow?: EuroCents;
  readonly recurringExpense?: EuroCents;
  readonly includedSources: readonly LifeEvent<CashEventPayload>[];
  readonly excludedSources: readonly LifeEvent<CashEventPayload>[];
  readonly inflow?: EuroCents;
  readonly expense?: EuroCents;
}

function sumCents(values: readonly EuroCents[]): EuroCents {
  const total = values.reduce((sum, amount) => sum + BigInt(amount), 0n);
  if (total < 0n || total > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new TypeError("Combined cash total exceeds the supported safe integer cent range.");
  }
  return toEuroCents(Number(total));
}

function eventTotal(
  sources: readonly LifeEvent<CashEventPayload>[],
  direction: CashDirection,
): EuroCents {
  return sumCents(sources
    .filter((entry) => entry.payload.direction === direction)
    .map((entry) => entry.payload.amount));
}

function isMarkedExtra(
  event: LifeEvent<CashEventPayload>,
  extraEventIds: ReadonlySet<LifeEventId>,
): boolean {
  if (extraEventIds.has(event.id)) {
    return true;
  }
  return event.payload.reconcilesEventId !== undefined && extraEventIds.has(event.payload.reconcilesEventId);
}

const combinedCashModule: AccumulatorModule<EuroCents, CombinedCashContribution, LifeEvent<unknown>, CombinedCashScenario> = {
  id: toAccumulatorId("cash.combined-balance"),
  unit: toAccumulatorUnit("EUR cents"),
  scope: toAccumulatorScope("person-cash-combined"),
  contribution: (month, events, scenario) => {
    const active = cashEventsForMonth(events, scenario.personId, month, scenario.includePlanned);
    if (scenario.policy === CashOverlapPolicy.KeepSeparate) {
      return {
        policy: scenario.policy,
        recurringApplied: true,
        recurringInflow: scenario.assumption.inflow,
        recurringExpense: scenario.assumption.expense,
        includedSources: [],
        excludedSources: active,
        inflow: scenario.assumption.inflow,
        expense: scenario.assumption.expense,
      };
    }
    if (scenario.policy === CashOverlapPolicy.EventsReplaceRecurringInEventMonths) {
      if (active.length > 0) {
        return {
          policy: scenario.policy,
          recurringApplied: false,
          includedSources: active,
          excludedSources: [],
          inflow: eventTotal(active, CashDirection.Inflow),
          expense: eventTotal(active, CashDirection.Outflow),
        };
      }
      return {
        policy: scenario.policy,
        recurringApplied: true,
        recurringInflow: scenario.assumption.inflow,
        recurringExpense: scenario.assumption.expense,
        includedSources: [],
        excludedSources: [],
        inflow: scenario.assumption.inflow,
        expense: scenario.assumption.expense,
      };
    }
    const includedSources = active.filter((entry) => isMarkedExtra(entry, scenario.extraEventIds));
    const excludedSources = active.filter((entry) => !isMarkedExtra(entry, scenario.extraEventIds));
    const eventInflow = eventTotal(includedSources, CashDirection.Inflow);
    const eventExpense = eventTotal(includedSources, CashDirection.Outflow);
    const inflow = scenario.assumption.inflow === undefined
      ? undefined
      : sumCents([scenario.assumption.inflow, eventInflow]);
    const expense = scenario.assumption.expense === undefined
      ? undefined
      : sumCents([scenario.assumption.expense, eventExpense]);
    return {
      policy: scenario.policy,
      recurringApplied: true,
      recurringInflow: scenario.assumption.inflow,
      recurringExpense: scenario.assumption.expense,
      includedSources,
      excludedSources,
      inflow,
      expense,
    };
  },
  advance: (opening, contribution) => {
    if (opening === undefined || contribution?.inflow === undefined || contribution.expense === undefined) {
      return undefined;
    }
    return closingCashBalance(opening, contribution.inflow, contribution.expense);
  },
};

/** Replays recurring cash assumptions and sourced cash events under an explicit overlap policy so no entry is silently double-counted. */
export function projectCombinedCashFlow(input: {
  readonly origin: ReplayMonth;
  readonly viewStart: ReplayMonth;
  readonly through: ReplayMonth;
  readonly opening: EuroCents | undefined;
  readonly assumption: CashFlowAssumption;
  readonly events: readonly LifeEvent<unknown>[];
  readonly personId: PersonId;
  readonly includePlanned: boolean;
  readonly policy: CashOverlapPolicy;
  readonly extraEventIds?: ReadonlySet<LifeEventId>;
}) {
  return replayAccumulator({
    module: combinedCashModule,
    origin: input.origin,
    viewStart: input.viewStart,
    through: input.through,
    opening: input.opening,
    events: input.events,
    scenario: {
      personId: input.personId,
      includePlanned: input.includePlanned,
      assumption: input.assumption,
      policy: input.policy,
      extraEventIds: input.extraEventIds ?? new Set<LifeEventId>(),
    },
  });
}
