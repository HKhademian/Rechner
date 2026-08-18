import {
  describe, it, 
} from "node:test";
import assert from "node:assert/strict";
import {
  generateTimelineSimulation, 
} from "#engine/simulator/timelineGenerator";
import {
  toNetSalary,
  toEuroAmount,
  toSimulationMonth,
  toCalendarMonth,
  toMonthDuration,
  ScenarioId,
} from "#engine/types";

describe("Granular Simulation Matrix Tests (250 Individual Scenario Assertions)", () => {
  // Test 250 distinct timeline configurations
  for (let s = 1; s <= 250; s++) {
    const spacing = 18 + (s % 24); // Spacings 18 to 41 months
    const h3Net = 3600 + (s % 30) * 50; // €3.600 to €5.050
    const w3Net = 2400 + (s % 20) * 40; // €2.400 to €3.160

    it(`simulates 60-month multi-year financial timeline for configuration #${s} (spacing: ${spacing}M, H3: ${h3Net} €)`, () => {
      const sim = generateTimelineSimulation({
        scenarioKey: ScenarioId.C,
        husbandClass3Net: toNetSalary(h3Net),
        husbandClass5Net: toNetSalary(h3Net - 950),
        wifeClass5FullTimeNet: toNetSalary(w3Net - 720),
        wifeClass3FullTimeNet: toNetSalary(w3Net),
        wifeClass5PartTimeNet: toNetSalary(Math.round(w3Net * 0.5)),
        wifeClass3PartTimeNet: toNetSalary(Math.round(w3Net * 0.65)),
        kindergeldPerChild: toEuroAmount(259),
        prePregnancyPlanningMonths: toMonthDuration(3),
        child1BirthMonth: toSimulationMonth(12),
        birthSpacingMonths: toMonthDuration(spacing),
        swapLeadMonths: toMonthDuration(7),
        enable13thSalary: true,
        bonus40Month: toCalendarMonth(5),
        bonus60Month: toCalendarMonth(11),
        taxReturnMonth: toCalendarMonth(3),
      });

      assert.equal(sim.months.length, 60);

      // Verify mathematical balance for Month 1, Month 12 (Birth 1), Month 15 (Tax Return 1), and Month 60 (End)
      assert.ok((sim.months[0].monthlyTotal as number) > 0);
      assert.ok((sim.months[11].monthlyTotal as number) > 0);
      assert.ok((sim.months[14].monthlyTotal as number) > 0);
      assert.ok((sim.months[59].cumulatedTotal as number) > 200000);
      assert.equal(sim.summary.grandTotal, sim.months[59].cumulatedTotal);
    });
  }
});
