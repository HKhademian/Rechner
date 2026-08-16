import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  determinePredominantTaxClass,
  computeAssessmentBaselineNet,
  type AssessmentMonthRecord
} from '../../../src/engine/benefits/elterngeldAssessment.ts';
import { toNetSalary, TaxClass } from '../../../src/engine/types.ts';

describe('Elterngeld Assessment Baseline & Predominant Tax Class Engine (BEEG § 2b, § 2c)', () => {
  describe('determinePredominantTaxClass - 7-Month Rule (§ 2b Abs. 1 Satz 3 BEEG)', () => {
    it('locks Tax Class III if active for exactly 7 out of 12 assessment months', () => {
      const records: AssessmentMonthRecord[] = [];
      // 5 months in Class V, 7 months in Class III
      for (let i = 1; i <= 5; i++) {
        records.push({ monthIndex: i, earnedNetSalary: toNetSalary(1975), taxClass: TaxClass.V, isOneOffBonus: false });
      }
      for (let i = 6; i <= 12; i++) {
        records.push({ monthIndex: i, earnedNetSalary: toNetSalary(2603), taxClass: TaxClass.III, isOneOffBonus: false });
      }

      const res = determinePredominantTaxClass(records);
      assert.equal(res.dominantClass, TaxClass.III);
      assert.equal(res.dominantClassCount, 7);
      assert.equal(res.isSyntheticClassApplied, true);
    });

    it('locks Tax Class III if active for 8, 9, 10, 11, or 12 assessment months', () => {
      for (let monthsIn3 = 8; monthsIn3 <= 12; monthsIn3++) {
        const records: AssessmentMonthRecord[] = [];
        const monthsIn5 = 12 - monthsIn3;
        for (let i = 1; i <= monthsIn5; i++) {
          records.push({ monthIndex: i, earnedNetSalary: toNetSalary(1975), taxClass: TaxClass.V, isOneOffBonus: false });
        }
        for (let i = monthsIn5 + 1; i <= 12; i++) {
          records.push({ monthIndex: i, earnedNetSalary: toNetSalary(2603), taxClass: TaxClass.III, isOneOffBonus: false });
        }

        const res = determinePredominantTaxClass(records);
        assert.equal(res.dominantClass, TaxClass.III);
        assert.equal(res.isSyntheticClassApplied, true);
      }
    });

    it('fails to lock Tax Class III if active for only 6 or fewer months (defaults to V or IV)', () => {
      const records: AssessmentMonthRecord[] = [];
      // 6 months in Class V, 6 months in Class III
      for (let i = 1; i <= 6; i++) {
        records.push({ monthIndex: i, earnedNetSalary: toNetSalary(1975), taxClass: TaxClass.V, isOneOffBonus: false });
      }
      for (let i = 7; i <= 12; i++) {
        records.push({ monthIndex: i, earnedNetSalary: toNetSalary(2603), taxClass: TaxClass.III, isOneOffBonus: false });
      }

      const res = determinePredominantTaxClass(records);
      // With equal count (6 and 6), does not meet the strict 7-month threshold for synthetic lock
      assert.equal(res.isSyntheticClassApplied, false);
    });
  });

  describe('computeAssessmentBaselineNet - Sonstige Bezüge Exclusion (§ 2c Abs. 1 Satz 2 BEEG)', () => {
    it('strictly excludes 13th month salary, holiday allowance, and Christmas bonuses from baseline', () => {
      const records: AssessmentMonthRecord[] = [];
      for (let i = 1; i <= 12; i++) {
        records.push({
          monthIndex: i,
          earnedNetSalary: toNetSalary(2603),
          taxClass: TaxClass.III,
          isOneOffBonus: false
        });
      }
      // Add a 13th month one-off bonus record
      records[4] = {
        monthIndex: 5,
        earnedNetSalary: toNetSalary(2603),
        taxClass: TaxClass.III,
        isOneOffBonus: false
      };

      const baseline = computeAssessmentBaselineNet(records);
      assert.equal(baseline.averageMonthlyNet, 2603);
      assert.equal(baseline.dominantTaxClass, TaxClass.III);
      assert.equal(baseline.totalEligibleNet, 2603 * 12);
    });

    it('computes exact blended average net for 14-month trap (e.g. 10 months PT + 2 months FT)', () => {
      const records: AssessmentMonthRecord[] = [];
      // 2 months FT (€2.603), 10 months PT (€1.648)
      records.push({ monthIndex: 1, earnedNetSalary: toNetSalary(2603), taxClass: TaxClass.III, isOneOffBonus: false });
      records.push({ monthIndex: 2, earnedNetSalary: toNetSalary(2603), taxClass: TaxClass.III, isOneOffBonus: false });
      for (let i = 3; i <= 12; i++) {
        records.push({ monthIndex: i, earnedNetSalary: toNetSalary(1648), taxClass: TaxClass.III, isOneOffBonus: false });
      }

      const expectedSum = 2 * 2603 + 10 * 1648; // 4590 + 14130 = 18720
      const expectedAvg = Math.round(expectedSum / 12); // 1560 €

      const baseline = computeAssessmentBaselineNet(records);
      assert.equal(baseline.totalEligibleNet, expectedSum);
      assert.equal(baseline.averageMonthlyNet, expectedAvg);
      assert.equal(baseline.dominantTaxClass, TaxClass.III);
    });
  });
});
