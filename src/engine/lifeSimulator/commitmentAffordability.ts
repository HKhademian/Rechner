import {
  type EuroAmount,
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";
import {
  simulateLifePlan,
} from "#engine/lifeSimulator/lifeSimulator";
import {
  applyDisasterShocks,
} from "#engine/lifeSimulator/disasterSimulator";
import {
  type CommitmentAffordabilityOptions,
  type CommitmentAffordabilityResult,
  type DisasterShockConfig,
  type LifePlanInput,
  LifeScenarioKey,
  SolvencyVerdict,
} from "#engine/lifeSimulator/types";

const DEFAULT_MORTGAGE_INTEREST_RATE = toPercentageRate(0.038);
const DEFAULT_MORTGAGE_TILGUNG_RATE = toPercentageRate(0.02);
const BINARY_SEARCH_ITERATIONS = 18;
const MAX_MONTHLY_HEADROOM_SEARCH_EUR = 15000;

function roundToWholeEuro(value: number): EuroAmount {
  return toEuroAmount(Math.round(value));
}

/**
 * Pure Commitment Affordability & Safe Ceiling Solver.
 * Evaluates a household's life plan under one or more selected life disasters (e.g. fired,
 * resignation + Sperrzeit, long-term illness, emergency shock) and solves via binary search
 * for the maximum additional monthly fixed commitment (+€X/mo) — or required monthly cut
 * (−€X/mo) — that keeps liquid cash above the household's target emergency floor.
 */
export function evaluateCommitmentAffordability(
  plan: LifePlanInput,
  shocks: readonly DisasterShockConfig[],
  options: CommitmentAffordabilityOptions = {},
): CommitmentAffordabilityResult {
  const stressedPlan = applyDisasterShocks(plan, shocks);
  const stressedResult = simulateLifePlan(stressedPlan, LifeScenarioKey.StressTest);

  const essentialMonthly = Math.max(
    1,
    plan.baseline.monthlyRent + plan.baseline.monthlyLivingExpenses,
  );
  const emergencyFloorEur = options.emergencyFloorEur !== undefined
    ? options.emergencyFloorEur
    : roundToWholeEuro(Math.max(0, plan.baseline.emergencyBufferMonths) * essentialMonthly);

  const minLiquidCashEur = stressedResult.summary.minLiquidCash;
  const minLiquidCashMonth = stressedResult.summary.minLiquidCashMonth;

  const verdict: SolvencyVerdict = minLiquidCashEur < 0
    ? SolvencyVerdict.Insolvent
    : minLiquidCashEur < emergencyFloorEur
      ? SolvencyVerdict.Tight
      : SolvencyVerdict.Resilient;

  // Survival runway: months until cash first drops below €0, or full horizon + ending cash buffer.
  const survivalRunwayMonths = stressedResult.summary.shortfallMonth !== undefined
    ? Math.max(0, stressedResult.summary.shortfallMonth - 1)
    : plan.baseline.horizonMonths;

  // Binary-search the signed monthly commitment delta Δ such that minLiquidCash(Δ) >= emergencyFloorEur.
  const minCashWithDelta = (deltaEur: number): number => {
    const candidatePlan = applyDisasterShocks(plan, shocks, toEuroAmount(deltaEur));
    return simulateLifePlan(candidatePlan, LifeScenarioKey.StressTest).summary.minLiquidCash;
  };

  let low = -Math.max(essentialMonthly, MAX_MONTHLY_HEADROOM_SEARCH_EUR);
  let high = MAX_MONTHLY_HEADROOM_SEARCH_EUR;

  // Clamp lower bound to ensure negative delta doesn't exceed total monthly baseline outflows.
  const maxPossibleCut = -(plan.baseline.monthlyRent + plan.baseline.monthlyLivingExpenses);
  if (low < maxPossibleCut) {
    low = maxPossibleCut;
  }

  // If even at low we cannot meet emergencyFloorEur, keep low as the floor-derived cut.
  if (minCashWithDelta(low) < emergencyFloorEur) {
    // low already holds the maximum cut within search bounds
  }
  else if (minCashWithDelta(high) >= emergencyFloorEur) {
    low = high;
  }
  else {
    for (let i = 0; i < BINARY_SEARCH_ITERATIONS; i++) {
      const mid = (low + high) / 2;
      if (minCashWithDelta(mid) >= emergencyFloorEur) {
        low = mid;
      }
      else {
        high = mid;
      }
    }
  }

  const maxSafeAdditionalMonthlyCommitmentEur = roundToWholeEuro(low);
  const currentMonthlyHousingEur = plan.baseline.monthlyRent;
  const maxSafeTotalRentEur = roundToWholeEuro(
    Math.max(0, currentMonthlyHousingEur + maxSafeAdditionalMonthlyCommitmentEur),
  );
  const maxSafeMortgageAnnuityEur = maxSafeTotalRentEur;

  const interestRate = options.referenceMortgageInterestRate ?? DEFAULT_MORTGAGE_INTEREST_RATE;
  const tilgungRate = options.referenceMortgageTilgungRate ?? DEFAULT_MORTGAGE_TILGUNG_RATE;
  const combinedAnnualRate = Math.max(0.01, interestRate + tilgungRate);
  const impliedMaxLoanAmountEur = roundToWholeEuro(
    (maxSafeMortgageAnnuityEur * 12) / combinedAnnualRate,
  );

  return Object.freeze({
    verdict,
    emergencyFloorEur,
    minLiquidCashEur,
    minLiquidCashMonth,
    survivalRunwayMonths,
    maxSafeAdditionalMonthlyCommitmentEur,
    currentMonthlyHousingEur,
    maxSafeTotalRentEur,
    maxSafeMortgageAnnuityEur,
    impliedMaxLoanAmountEur,
  });
}
