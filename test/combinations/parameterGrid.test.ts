import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateTimelineSimulation } from '../../src/engine/simulator/timelineGenerator.ts';
import {
  toNetSalary,
  toEuroAmount,
  toSimulationMonth,
  toCalendarMonth,
  ScenarioId
} from '../../src/engine/types.ts';

describe('Combinatorial Parameter Grid Sweep & Invariance Tests', () => {
  const husbandSalaries = [
    { h3: 3000, h5: 2600 },
    { h3: 2895, h5: 2191 },
    { h3: 4500, h5: 3400 },
    { h3: 5500, h5: 4100 }
  ];

  const wifeSalaries = [
    { w5FT: 1800, w3FT: 2400, w5PT: 1100, w3PT: 1500 },
    { w5FT: 1975, w3FT: 2603, w5PT: 1328, w3PT: 1648 },
    { w5FT: 2500, w3FT: 3300, w5PT: 1600, w3PT: 2100 }
  ];

  const birthSpacings = [18, 24, 27, 30, 36];
  const swapLeads = [6, 7, 8];

  it('runs exhaustive 180-permutation combinatorial grid with zero errors and invariant conservation', () => {
    let scenarioCount = 0;

    for (const h of husbandSalaries) {
      for (const w of wifeSalaries) {
        for (const spacing of birthSpacings) {
          for (const lead of swapLeads) {
            scenarioCount++;

            const simParams = {
              scenarioKey: ScenarioId.C,
              husbandClass3Net: toNetSalary(h.h3),
              husbandClass5Net: toNetSalary(h.h5),
              wifeClass5FullTimeNet: toNetSalary(w.w5FT),
              wifeClass3FullTimeNet: toNetSalary(w.w3FT),
              wifeClass5PartTimeNet: toNetSalary(w.w5PT),
              wifeClass3PartTimeNet: toNetSalary(w.w3PT),
              kindergeldPerChild: toEuroAmount(259),
              prePregnancyPlanningMonths: 3,
              child1BirthMonth: toSimulationMonth(12),
              birthSpacingMonths: spacing,
              swapLeadMonths: lead,
              enable13thSalary: true,
              bonus40Month: toCalendarMonth(5),
              bonus60Month: toCalendarMonth(11),
              taxReturnMonth: toCalendarMonth(3)
            };

            const res = generateTimelineSimulation(simParams);
            assert.equal(res.months.length, 60);

            // Verify each month satisfies conservation
            res.months.forEach(m => {
              const reg = m.regularMonthlyTotal as number;
              const sp = m.specialEventsTotal as number;
              const tot = m.monthlyTotal as number;
              assert.equal(tot, reg + sp);
            });

            // Verify cumulative grand total matches sum of components
            const sumSalaries = res.summary.totalSalaries as number;
            const sumBenefits = res.summary.totalBenefits as number;
            const sumTax = res.summary.totalTaxRefunds as number;
            const grand = res.summary.grandTotal as number;

            assert.equal(grand, sumSalaries + sumBenefits + sumTax);
          }
        }
      }
    }

    assert.equal(scenarioCount, 180);
  });
});
