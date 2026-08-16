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

describe('End-to-End Simulation Scenarios (Scenarios A, B, C & Parameter Variations)', () => {
  const defaultParams = {
    husbandClass3Net: toNetSalary(2895),
    husbandClass5Net: toNetSalary(2191),
    wifeClass5FullTimeNet: toNetSalary(1975),
    wifeClass3FullTimeNet: toNetSalary(2603),
    wifeClass5PartTimeNet: toNetSalary(1328),
    wifeClass3PartTimeNet: toNetSalary(1648),
    kindergeldPerChild: toEuroAmount(259),
    prePregnancyPlanningMonths: 3,
    child1BirthMonth: toSimulationMonth(12),
    birthSpacingMonths: 27,
    swapLeadMonths: 7,
    enable13thSalary: true,
    bonus40Month: toCalendarMonth(5),
    bonus60Month: toCalendarMonth(11),
    taxReturnMonth: toCalendarMonth(3)
  };

  describe('Scenario A - Baseline Career (No Children)', () => {
    it('produces constant regular monthly income and 13th month bonuses without parental leave or benefits', () => {
      const res = generateTimelineSimulation({ ...defaultParams, scenarioKey: ScenarioId.A });
      assert.equal(res.months.length, 60);

      res.months.forEach(m => {
        assert.equal(m.husbandSalary, 2895);
        assert.equal(m.wifeSalary, 1975);
        assert.equal(m.mutterschutz, 0);
        assert.equal(m.wifeElterngeld, 0);
        assert.equal(m.husbandElterngeld, 0);
        assert.equal(m.kindergeld, 0);
        assert.equal(m.regularMonthlyTotal, 6125);
      });

      assert.equal(res.summary.totalBenefits, 0);
    });
  });

  describe('Scenario B - Unoptimized (Static Class III/V)', () => {
    it('accurately models Mutterschutz at Class V and unoptimized ElterngeldPlus', () => {
      const res = generateTimelineSimulation({ ...defaultParams, scenarioKey: ScenarioId.B });
      assert.equal(res.months.length, 60);

      // Mutterschutz 1 (M11, M12, M13) at Class V FT (€1.975)
      [11, 12, 13].forEach(mIndex => {
        const m = res.months[mIndex - 1];
        assert.equal(m.isMutterschutz, true);
        assert.equal(m.mutterschutz, 1975);
        assert.equal(m.wifeSalary, 0);
      });

      // Child 1 ElterngeldPlus (M14 to M25) = €501
      for (let i = 14; i <= 25; i++) {
        const m = res.months[i - 1];
        assert.equal(m.wifeElterngeld, 501);
      }
    });
  });

  describe('Scenario C - Optimized Proactive Tax Class Swap (III/V)', () => {
    it('accurately models Swap 1, Mutterschutz at Class III FT (€2.603), and maxed €900 ElterngeldPlus', () => {
      const res = generateTimelineSimulation({ ...defaultParams, scenarioKey: ScenarioId.C });
      assert.equal(res.months.length, 60);

      // Mutterschutz 1 (M11, M12, M13) at Class III FT (€2.603)
      [11, 12, 13].forEach(mIndex => {
        const m = res.months[mIndex - 1];
        assert.equal(m.isMutterschutz, true);
        assert.equal(m.mutterschutz, 2603);
      });

      // Child 1 ElterngeldPlus (M14 to M25) = €900 (Maxed out!)
      for (let i = 14; i <= 25; i++) {
        const m = res.months[i - 1];
        assert.equal(m.wifeElterngeld, 900);
      }
    });

    it('calculates exact annual tax refunds for Year 1 (+3.050 €) and Year 3 (+4.060 €)', () => {
      const res = generateTimelineSimulation({ ...defaultParams, scenarioKey: ScenarioId.C });

      // Month 15: Year 1 Return = 8 * 275 (2200) + 850 = 3050 €
      const m15 = res.months[14];
      assert.equal(m15.taxRefund, 3050);

      // Month 27: Year 2 Return = 0 deficit + 850 = 850 €
      const m27 = res.months[26];
      assert.equal(m27.taxRefund, 850);

      // Month 39: Year 3 Return = 6 * 535 (3210) + 850 = 4060 €
      const m39 = res.months[38];
      assert.equal(m39.taxRefund, 4060);

      // Month 51: Year 4 Return = 2 * 535 (1070) + 850 = 1920 €
      const m51 = res.months[50];
      assert.equal(m51.taxRefund, 1920);
    });
  });

  describe('Optimization Advantage Audit (Scenario C vs Scenario B)', () => {
    it('proves Scenario C provides substantial net financial gain over Scenario B', () => {
      const b = generateTimelineSimulation({ ...defaultParams, scenarioKey: ScenarioId.B });
      const c = generateTimelineSimulation({ ...defaultParams, scenarioKey: ScenarioId.C });

      const netGain = (c.summary.grandTotal as number) - (b.summary.grandTotal as number);
      const benefitsGain = (c.summary.totalBenefits as number) - (b.summary.totalBenefits as number);

      assert.ok(netGain > 10000, `Net gain (${netGain} €) must exceed 10.000 €`);
      assert.ok(benefitsGain > 8000, `Benefits gain (${benefitsGain} €) must exceed 8.000 €`);
    });
  });
});
