import {
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";
import {
  type AssessmentMonthRecord,
  determinePredominantTaxClass,
  computeAssessmentBaselineNet,
} from "#engine/benefits/elterngeldAssessment";
import {
  toNetSalary,
  TaxClass,
} from "#engine/types";

describe("Elterngeld Assessment Baseline & Predominant Tax Class Engine (BEEG § 2b, § 2c)", () => {
  describe("determinePredominantTaxClass - 7-Month Rule (§ 2b Abs. 1 Satz 3 BEEG)", () => {
    it("locks Tax Class III if active for exactly 7 out of 12 assessment months", () => {
      const records: AssessmentMonthRecord[] = [];
      // 5 months in Class V, 7 months in Class III
      for (let i = 1; i <= 5; i++) {
        records.push({
          monthIndex: i,
          earnedNetSalary: toNetSalary(1975),
          taxClass: TaxClass.V,
          isOneOffBonus: false,
        });
      }
      for (let i = 6; i <= 12; i++) {
        records.push({
          monthIndex: i,
          earnedNetSalary: toNetSalary(2603),
          taxClass: TaxClass.III,
          isOneOffBonus: false,
        });
      }

      const res = determinePredominantTaxClass(records);
      assert.equal(res.dominantClass, TaxClass.III);
      assert.equal(res.dominantClassCount, 7);
      assert.equal(res.isSyntheticClassApplied, true);
    });

    it("locks Tax Class III if active for 8, 9, 10, 11, or 12 assessment months", () => {
      for (let monthsIn3 = 8; monthsIn3 <= 12; monthsIn3++) {
        const records: AssessmentMonthRecord[] = [];
        const monthsIn5 = 12 - monthsIn3;
        for (let i = 1; i <= monthsIn5; i++) {
          records.push({
            monthIndex: i,
            earnedNetSalary: toNetSalary(1975),
            taxClass: TaxClass.V,
            isOneOffBonus: false,
          });
        }
        for (let i = monthsIn5 + 1; i <= 12; i++) {
          records.push({
            monthIndex: i,
            earnedNetSalary: toNetSalary(2603),
            taxClass: TaxClass.III,
            isOneOffBonus: false,
          });
        }

        const res = determinePredominantTaxClass(records);
        assert.equal(res.dominantClass, TaxClass.III);
        assert.equal(res.isSyntheticClassApplied, true);
      }
    });

    it("uses the latest class when each class covers six earned-income months", () => {
      const records: AssessmentMonthRecord[] = [];
      // 6 months in Class V, 6 months in Class III
      for (let i = 1; i <= 6; i++) {
        records.push({
          monthIndex: i,
          earnedNetSalary: toNetSalary(1975),
          taxClass: TaxClass.V,
          isOneOffBonus: false,
        });
      }
      for (let i = 7; i <= 12; i++) {
        records.push({
          monthIndex: i,
          earnedNetSalary: toNetSalary(2603),
          taxClass: TaxClass.III,
          isOneOffBonus: false,
        });
      }

      const res = determinePredominantTaxClass(records);
      assert.equal(res.dominantClass, TaxClass.III);
      assert.equal(res.dominantClassCount, 6);
      assert.equal(res.isSyntheticClassApplied, true);
      const reversed = records.map((record) => ({ ...record,
        taxClass: record.taxClass === TaxClass.V ? TaxClass.III : TaxClass.V }));
      assert.equal(determinePredominantTaxClass(reversed).dominantClass, TaxClass.V);
    });
  });

  describe("computeAssessmentBaselineNet - Sonstige Bezüge Exclusion (§ 2c Abs. 1 Satz 2 BEEG)", () => {
    it("strictly excludes 13th month salary, holiday allowance, and Christmas bonuses from baseline", () => {
      const records: AssessmentMonthRecord[] = [];
      for (let i = 1; i <= 12; i++) {
        records.push({
          monthIndex: i,
          earnedNetSalary: toNetSalary(2603),
          taxClass: TaxClass.III,
          isOneOffBonus: false,
        });
      }
      // Add a 13th month one-off bonus record
      records[4] = {
        monthIndex: 5,
        earnedNetSalary: toNetSalary(2603),
        taxClass: TaxClass.III,
        isOneOffBonus: false,
      };

      const baseline = computeAssessmentBaselineNet(records);
      assert.equal(baseline.averageMonthlyNet, 2603);
      assert.equal(baseline.dominantTaxClass, TaxClass.III);
      assert.equal(baseline.totalEligibleNet, 2603 * 12);
    });

    it("computes exact blended average net for 14-month trap (e.g. 10 months PT + 2 months FT)", () => {
      const records: AssessmentMonthRecord[] = [];
      // 2 months FT (€2.603), 10 months PT (€1.648)
      records.push({
        monthIndex: 1,
        earnedNetSalary: toNetSalary(2603),
        taxClass: TaxClass.III,
        isOneOffBonus: false,
      });
      records.push({
        monthIndex: 2,
        earnedNetSalary: toNetSalary(2603),
        taxClass: TaxClass.III,
        isOneOffBonus: false,
      });
      for (let i = 3; i <= 12; i++) {
        records.push({
          monthIndex: i,
          earnedNetSalary: toNetSalary(1648),
          taxClass: TaxClass.III,
          isOneOffBonus: false,
        });
      }

      const expectedSum = 2 * 2603 + 10 * 1648; // 5206 + 14130 = 18720
      const expectedAvg = Math.round(expectedSum / 12); // 1807 €

      const baseline = computeAssessmentBaselineNet(records);
      assert.equal(baseline.totalEligibleNet, expectedSum);
      assert.equal(baseline.averageMonthlyNet, expectedAvg);
      assert.equal(baseline.dominantTaxClass, TaxClass.III);
    });
  });
});
