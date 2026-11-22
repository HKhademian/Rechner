import {
  type EuroAmount,
  toEuroAmount,
} from "#engine/types";
import {
  simulateLifePlan,
} from "#engine/lifeSimulator/lifeSimulator";
import {
  applyDisasterShocks,
} from "#engine/lifeSimulator/disasterSimulator";
import {
  evaluateCommitmentAffordability,
} from "#engine/lifeSimulator/commitmentAffordability";
import {
  type CommitmentAffordabilityOptions,
  type CommitmentAffordabilityResult,
  type DisasterShockConfig,
  type LifePlanInput,
  type LifeSimulationResult,
  LifeScenarioKey,
} from "#engine/lifeSimulator/types";

export interface LifeScenarioDelta {
  readonly cumulativeCashflowDiff: EuroAmount;
  readonly endingLiquidCashDiff: EuroAmount;
  readonly endingNetWorthDiff: EuroAmount;
  readonly minLiquidCashDiff: EuroAmount;
  readonly totalNetTaxDiff: EuroAmount;
}

export interface LifeWorkbenchBundle {
  readonly planned: LifeSimulationResult;
  readonly baseline: LifeSimulationResult;
  readonly stressTest: LifeSimulationResult;
  readonly plannedVsBaseline: LifeScenarioDelta;
  readonly stressVsPlanned: LifeScenarioDelta;
  readonly affordability: CommitmentAffordabilityResult;
}

function roundToCents(value: number): EuroAmount {
  return toEuroAmount(Math.round(value * 100 + Number.EPSILON * Math.abs(value) * 100) / 100);
}

function computeDelta(
  target: LifeSimulationResult,
  reference: LifeSimulationResult,
): LifeScenarioDelta {
  return Object.freeze({
    cumulativeCashflowDiff: roundToCents(
      target.summary.cumulativeNetCashflow - reference.summary.cumulativeNetCashflow,
    ),
    endingLiquidCashDiff: roundToCents(
      target.summary.endingLiquidCash - reference.summary.endingLiquidCash,
    ),
    endingNetWorthDiff: roundToCents(
      target.summary.endingNetWorth - reference.summary.endingNetWorth,
    ),
    minLiquidCashDiff: roundToCents(
      target.summary.minLiquidCash - reference.summary.minLiquidCash,
    ),
    totalNetTaxDiff: roundToCents(
      target.summary.totalNetTaxPaid - reference.summary.totalNetTaxPaid,
    ),
  });
}

/**
 * Evaluates all three synchronized Life Planner scenarios (Planned, Baseline, StressTest),
 * comparison deltas, and the Commitment Affordability Safe Ceiling in one pure pass.
 */
export function evaluateLifeWorkbenchBundle(
  plan: LifePlanInput,
  disasterShocks: readonly DisasterShockConfig[],
  additionalMonthlyCommitmentEur: EuroAmount = toEuroAmount(0),
  affordabilityOptions: CommitmentAffordabilityOptions = {},
): LifeWorkbenchBundle {
  const planned = simulateLifePlan(plan, LifeScenarioKey.Planned);
  const baseline = simulateLifePlan(
    Object.freeze({
      baseline: plan.baseline,
      events: Object.freeze([]),
    }),
    LifeScenarioKey.Baseline,
  );
  const stressedPlan = applyDisasterShocks(plan, disasterShocks, additionalMonthlyCommitmentEur);
  const stressTest = simulateLifePlan(stressedPlan, LifeScenarioKey.StressTest);
  const affordability = evaluateCommitmentAffordability(
    plan,
    disasterShocks,
    affordabilityOptions,
  );

  return Object.freeze({
    planned,
    baseline,
    stressTest,
    plannedVsBaseline: computeDelta(planned, baseline),
    stressVsPlanned: computeDelta(stressTest, planned),
    affordability,
  });
}
