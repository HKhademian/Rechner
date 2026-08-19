/**
 * Strategy Synthesizer Module
 *
 * Provides pure functional transformation of simulation action batches
 * according to statutory simulation strategies (StatusQuo, UnoptimizedBaseline, StatutoryOptimized).
 * Automatically derives optimal § 2b BEEG tax class switch windows when none are provided.
 *
 * @module engine/simulator/strategySynthesizer
 */

import {
  type StrategyId,
  type PregnancyAction,
  type TaxClassSwitchAction,
  type ScenarioActionBatches,
  type PreexistingConditions,
  SimulationStrategy,
  TaxClass,
  toSwitchId,
  toSimulationMonth,
  toCalendarMonth,
  toFullCalendarYear,
} from "#engine/types";

/**
 * Automatically synthesizes the statutorily optimal § 2b BEEG tax class switch actions
 * for all pregnancies present in the household scenario.
 *
 * Statutory Rule (§ 2b Abs. 1 Satz 3 BEEG, BFH VI R 2/13):
 * To establish the optimized tax class (Class III for higher-receiving spouse) as predominant
 * during the 12-month assessment period prior to the start of Mutterschutz (6 weeks prior to birth),
 * the switch must be effective at least 7 months before Mutterschutz begins (Month = Delivery - 8).
 * The switch reverts back at the month of delivery.
 *
 * @param pregnancies - Ordered list of pregnancy actions.
 * @param preexisting - Baseline preexisting conditions (to resolve calendar year and start offsets).
 * @returns Synthesized list of optimal `TaxClassSwitchAction` items.
 */
export function synthesizeOptimalTaxSwitches(
  pregnancies: readonly PregnancyAction[],
  preexisting?: PreexistingConditions,
): TaxClassSwitchAction[] {
  if (!pregnancies || pregnancies.length === 0) {
    return [];
  }

  const startYear = preexisting?.startCalendarYear ?? toFullCalendarYear(2026);
  const startMonth = preexisting?.startCalendarMonth ?? toCalendarMonth(1);

  return pregnancies.map((preg) => {
    const delivery = preg.calculatedDeliverySimulationMonth;
    // Switch effective 8 months prior to birth (7 months prior to Mutterschutz month delivery - 1)
    const effectiveSimMonth = Math.max(1, delivery - 8);
    const revertSimMonth = delivery;

    // Calculate calendar month and year for the switch
    const totalElapsedMonths = startMonth + effectiveSimMonth - 2;
    const effCalMonth = toCalendarMonth((totalElapsedMonths % 12) + 1);
    const effCalYear = toFullCalendarYear(
      startYear + Math.floor(totalElapsedMonths / 12),
    );

    return {
      switchId: toSwitchId(`SWAP-AUTO-CHILD-${preg.childIndex}`),
      effectiveSimulationMonth: toSimulationMonth(effectiveSimMonth),
      effectiveCalendarMonth: effCalMonth,
      effectiveCalendarYear: effCalYear,
      targetHusbandTaxClass: TaxClass.V,
      targetWifeTaxClass: TaxClass.III,
      targetUseTaxFactor: false,
      revertSimulationMonth: toSimulationMonth(revertSimMonth),
      revertHusbandTaxClass:
        preexisting?.husbandInitialTaxClass ?? TaxClass.III,
      revertWifeTaxClass: preexisting?.wifeInitialTaxClass ?? TaxClass.V,
      revertUseTaxFactor: preexisting?.initialUseTaxFactor ?? false,
      statutoryReason: `Auto-Synthesized § 2b BEEG Tax Class Switch for Child ${preg.childIndex} (7-month lead prior to Mutterschutz)`,
    };
  });
}

/**
 * Pure strategy transformation function that adapts input action batches for a target strategy.
 *
 * - **`SimulationStrategy.StatusQuo`**:
 *   Suppresses all pregnancies, parental leaves, and tax class switches to evaluate continuous dual-career progression.
 * - **`SimulationStrategy.UnoptimizedBaseline`**:
 *   Retains pregnancies and parental leaves, but suppresses tax class switches (holding static Class V/III baseline).
 * - **`SimulationStrategy.StatutoryOptimized`**:
 *   Retains pregnancies, applies existing custom tax switches or auto-synthesizes statutorily optimal § 2b BEEG switches.
 *
 * @param batches - Original strongly-typed `ScenarioActionBatches` input.
 * @param strategyOverride - Optional strategy identifier override.
 * @returns Synthesized `ScenarioActionBatches` tailored to the strategy.
 */
export function synthesizeStrategyBatches(
  batches: ScenarioActionBatches,
  strategyOverride?: StrategyId,
): ScenarioActionBatches {
  const strategy = strategyOverride ?? batches.scenarioKey;

  if (strategy === SimulationStrategy.StatusQuo) {
    return {
      ...batches,
      scenarioKey: SimulationStrategy.StatusQuo,
      pregnancies: [],
      taxClassSwitches: [],
    };
  }

  if (strategy === SimulationStrategy.UnoptimizedBaseline) {
    return {
      ...batches,
      scenarioKey: SimulationStrategy.UnoptimizedBaseline,
      taxClassSwitches: [],
    };
  }

  // StatutoryOptimized
  const taxClassSwitches =
    batches.taxClassSwitches && batches.taxClassSwitches.length > 0
      ? batches.taxClassSwitches
      : synthesizeOptimalTaxSwitches(batches.pregnancies, batches.preexisting);

  return {
    ...batches,
    scenarioKey: SimulationStrategy.StatutoryOptimized,
    taxClassSwitches,
  };
}
