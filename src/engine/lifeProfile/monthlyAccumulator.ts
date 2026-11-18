import {
  type Brand,
} from "#engine/types";
import {
  type MonthlySnapshot,
  type ReplayMonth,
  replayMonthly,
} from "#engine/lifeProfile/monthlyReplay";

export type AccumulatorId = Brand<string, "AccumulatorId">;
export type AccumulatorUnit = Brand<string, "AccumulatorUnit">;
export type AccumulatorScope = Brand<string, "AccumulatorScope">;

export function toAccumulatorId(value: string): AccumulatorId {
  if (!value || value.trim() !== value) {
    throw new TypeError("Accumulator ID must not be empty or contain surrounding whitespace.");
  }
  return value as AccumulatorId;
}

export function toAccumulatorUnit(value: string): AccumulatorUnit {
  if (!value || value.trim() !== value) {
    throw new TypeError("Accumulator unit must not be empty or contain surrounding whitespace.");
  }
  return value as AccumulatorUnit;
}

export function toAccumulatorScope(value: string): AccumulatorScope {
  if (!value || value.trim() !== value) {
    throw new TypeError("Accumulator scope must not be empty or contain surrounding whitespace.");
  }
  return value as AccumulatorScope;
}

export interface AccumulatorModule<Value, Contribution, Event, Scenario> {
  readonly id: AccumulatorId;
  readonly unit: AccumulatorUnit;
  readonly scope: AccumulatorScope;
  readonly contribution: (month: ReplayMonth, events: readonly Event[], scenario: Scenario) => Contribution | undefined;
  /** Domain-owned logic defines how unknowns, carry and resets are handled. */
  readonly advance: (opening: Value | undefined, contribution: Contribution | undefined, month: ReplayMonth, scenario: Scenario) => Value | undefined;
}

export interface AccumulatorMonth<Value, Contribution> {
  readonly opening: Value | undefined;
  readonly contribution: Contribution | undefined;
  readonly closing: Value | undefined;
}

export function replayAccumulator<Value, Contribution, Event, Scenario>(input: {
  readonly module: AccumulatorModule<Value, Contribution, Event, Scenario>;
  readonly origin: ReplayMonth;
  readonly viewStart: ReplayMonth;
  readonly through: ReplayMonth;
  readonly opening: Value | undefined;
  readonly events: readonly Event[];
  readonly scenario: Scenario;
}): readonly MonthlySnapshot<AccumulatorMonth<Value, Contribution>>[] {
  return replayMonthly<AccumulatorMonth<Value, Contribution>, Event, Scenario>({
    origin: input.origin,
    viewStart: input.viewStart,
    through: input.through,
    openingState: { opening: input.opening,
      contribution: undefined,
      closing: input.opening },
    events: input.events,
    scenario: input.scenario,
    advance: (previous, month, events, scenario) => {
      const contribution = input.module.contribution(month, events, scenario);
      return { opening: previous.closing,
        contribution,
        closing: input.module.advance(previous.closing, contribution, month, scenario) };
    },
  });
}
