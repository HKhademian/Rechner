import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runScenarioBatches } from "#engine/simulator/timelineGenerator";
import {
  TaxClass,
  ScenarioId,
  toNetSalary,
  toEuroAmount,
  toWorkingHours,
  toSimulationMonth,
  toCalendarMonth,
  type PreexistingConditions,
  type PregnancyAction,
  type TaxClassSwitchAction,
  type SalaryRaiseAction,
} from "#engine/types";

describe("Sandbox Unit Tests: Simulation Duration & Horizon Calibration", () => {
  const basePreexisting: PreexistingConditions = {
    startCalendarYear: 2026,
    startCalendarMonth: toCalendarMonth(1),
    simulationDurationMonths: 60,
    husbandInitialTaxClass: TaxClass.III,
    husbandInitialNet: toNetSalary(2895),
    husbandInitialClass5Net: toNetSalary(2191),
    husbandWeeklyHours: toWorkingHours(32),
    wifeInitialTaxClass: TaxClass.V,
    wifeInitialFullTimeNet: toNetSalary(1975),
    wifeInitialClass3FullTimeNet: toNetSalary(2603),
    wifeInitialPartTimeClass5Net: toNetSalary(1328),
    wifeInitialPartTimeClass3Net: toNetSalary(1648),
    wifeWeeklyHours: toWorkingHours(40),
    existingChildrenCount: 0,
    kindergeldPerChild: toEuroAmount(259),
    enable13thSalary: true,
    bonus40Month: toCalendarMonth(5),
    bonus60Month: toCalendarMonth(11),
    taxReturnMonth: toCalendarMonth(3),
  };

  const emptyPregnancies: readonly PregnancyAction[] = [];
  const emptySwitches: readonly TaxClassSwitchAction[] = [];
  const emptyRaises: readonly SalaryRaiseAction[] = [];

  const durations = [12, 24, 36, 48, 60, 72, 84, 96, 120];

  it("accurately generates exact length of months matching configured duration", () => {
    for (const duration of durations) {
      const preexisting = {
        ...basePreexisting,
        simulationDurationMonths: duration,
      };
      const res = runScenarioBatches({
        scenarioKey: ScenarioId.A,
        preexisting,
        pregnancies: emptyPregnancies,
        taxClassSwitches: emptySwitches,
        salaryRaises: emptyRaises,
      });

      assert.equal(
        res.months.length,
        duration,
        `Result length must exactly equal ${duration}`,
      );
      assert.equal(res.months[0].month, 1);
      assert.equal(res.months[duration - 1].month, duration);
    }
  });

  it("guarantees cumulative mathematical conservation at every month across variable horizons", () => {
    for (const duration of [12, 36, 60, 120]) {
      const preexisting = {
        ...basePreexisting,
        simulationDurationMonths: duration,
      };
      const res = runScenarioBatches({
        scenarioKey: ScenarioId.A,
        preexisting,
        pregnancies: emptyPregnancies,
        taxClassSwitches: emptySwitches,
        salaryRaises: emptyRaises,
      });

      let expectedCumulativeSalaries = 0;
      let expectedCumulativeBenefits = 0;
      let expectedCumulativeTaxRefunds = 0;
      let expectedCumulativeTotal = 0;

      for (let i = 0; i < res.months.length; i++) {
        const m = res.months[i];
        expectedCumulativeSalaries += m.earnedSalaries as number;
        expectedCumulativeBenefits += m.stateBenefits as number;
        expectedCumulativeTaxRefunds += m.taxRefund as number;
        expectedCumulativeTotal += m.monthlyTotal as number;

        assert.equal(m.cumulatedSalaries, expectedCumulativeSalaries);
        assert.equal(m.cumulatedBenefits, expectedCumulativeBenefits);
        assert.equal(m.cumulatedTaxRefunds, expectedCumulativeTaxRefunds);
        assert.equal(m.cumulatedTotal, expectedCumulativeTotal);
      }

      // Summary metrics match final month cumulative totals
      const lastMonth = res.months[duration - 1];
      assert.equal(res.summary.totalSalaries, lastMonth.cumulatedSalaries);
      assert.equal(res.summary.totalBenefits, lastMonth.cumulatedBenefits);
      assert.equal(res.summary.totalTaxRefunds, lastMonth.cumulatedTaxRefunds);
      assert.equal(res.summary.grandTotal, lastMonth.cumulatedTotal);
    }
  });

  it("creates valid, non-empty audit transactions for every single active month regardless of duration", () => {
    const preexisting = { ...basePreexisting, simulationDurationMonths: 72 };
    const res = runScenarioBatches({
      scenarioKey: ScenarioId.A,
      preexisting,
      pregnancies: emptyPregnancies,
      taxClassSwitches: emptySwitches,
      salaryRaises: emptyRaises,
    });

    res.months.forEach((m) => {
      assert.ok(
        m.transactions.length >= 2,
        `Month ${m.month} must have at least 2 salary transactions`,
      );
      const sumTxAmounts = m.transactions.reduce(
        (acc, tx) => acc + (tx.amount as number),
        0,
      );
      assert.equal(
        sumTxAmounts,
        m.monthlyTotal,
        `Transactions sum must equal monthly total in Month ${m.month}`,
      );
    });
  });
});
