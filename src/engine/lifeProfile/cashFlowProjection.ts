import {
  type EuroCents,
} from "#engine/types";
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
  closingCashBalance,
} from "#engine/lifeProfile/cashFlowFormula";

export interface CashFlowAssumption {
  readonly inflow?: EuroCents;
  readonly expense?: EuroCents;
}

const cashBalanceModule: AccumulatorModule<EuroCents, CashFlowAssumption, never, CashFlowAssumption> = {
  id: toAccumulatorId("cash.balance"),
  unit: toAccumulatorUnit("EUR cents"),
  scope: toAccumulatorScope("cash-flow-scenario"),
  contribution: (_month, _events, scenario) => scenario,
  advance: (opening, contribution) => opening === undefined || contribution?.inflow === undefined || contribution.expense === undefined
    ? undefined : closingCashBalance(opening, contribution.inflow, contribution.expense),
};

/** The opening balance applies immediately before the origin month. */
export function projectCashFlow(
  origin: ReplayMonth,
  viewStart: ReplayMonth,
  through: ReplayMonth,
  opening: EuroCents | undefined,
  assumption: CashFlowAssumption,
) {
  return replayAccumulator({ module: cashBalanceModule,
    origin,
    viewStart,
    through,
    opening,
    events: [],
    scenario: assumption });
}
