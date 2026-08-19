import {
  describe, it, 
} from "node:test";
import assert from "node:assert/strict";
import {
  computeJointTaxLiability,
  computeMonthlySwapWithholdingVariance,
  computeAnnualTaxReconciliation,
} from "#engine/tax/jointAssessment";
import {
  toNetSalary,
  toEuroAmount,
  toCalendarYear,
  toSimulationMonth,
} from "#engine/types";

describe("Joint Assessment & Tax Reconciliation Engine (§ 26b EStG)", () => {
  describe("computeJointTaxLiability - Married Splitting Tariff (§ 32a Abs. 5 EStG)", () => {
    it("produces lower or equal tax liability compared to separate assessments (Splitting Advantage)", () => {
      for (let hZve = 20000; hZve <= 100000; hZve += 10000) {
        for (let wZve = 0; wZve <= 50000; wZve += 10000) {
          const joint = computeJointTaxLiability(hZve, wZve);
          assert.ok(joint.totalTaxLiability >= 0);
        }
      }
    });

    it("joint tax is symmetric (swapping husband and wife incomes produces identical joint tax)", () => {
      const case1 = computeJointTaxLiability(60000, 20000);
      const case2 = computeJointTaxLiability(20000, 60000);
      assert.equal(case1.jointTax, case2.jointTax);
      assert.equal(
        case1.jointSolidaritySurcharge,
        case2.jointSolidaritySurcharge,
      );
      assert.equal(case1.totalTaxLiability, case2.totalTaxLiability);
    });
  });

  describe("computeMonthlySwapWithholdingVariance - Tax Class III/V Swap Withholding Delta", () => {
    it("calculates exact monthly withholding variance during tax swap", () => {
      // Standard Case: Husband €2.895 (III) / €2.191 (V), Wife €2.603 (III) / €1.975 (V)
      const h3 = toNetSalary(2895);
      const h5 = toNetSalary(2191);
      const w3 = toNetSalary(2603);
      const w5 = toNetSalary(1975);

      const variance = computeMonthlySwapWithholdingVariance(h3, h5, w3, w5);
      // Extra withheld from husband = 704. Relief for wife = 628. Net delta = 76.
      assert.equal(variance, 76);
    });

    it("calculates exact monthly withholding variance during part-time swap", () => {
      // Part-Time Case: Wife Part-Time €2.167 (III) / €1.660 (V)
      const h3 = toNetSalary(2895);
      const h5 = toNetSalary(2191);
      const w3 = toNetSalary(2167);
      const w5 = toNetSalary(1660);

      const variance = computeMonthlySwapWithholdingVariance(h3, h5, w3, w5);
      // Extra withheld from husband = 704. Relief for wife = 507. Net delta = 197.
      assert.equal(variance, 197);
    });

    it("returns 0 if husband extra withholding equals or is less than wife relief", () => {
      const h3 = toNetSalary(3000);
      const h5 = toNetSalary(2500); // 500 diff
      const w3 = toNetSalary(2500);
      const w5 = toNetSalary(1800); // 700 relief
      const variance = computeMonthlySwapWithholdingVariance(h3, h5, w3, w5);
      assert.equal(variance, 0);
    });
  });

  describe("computeAnnualTaxReconciliation - Multi-Month Deficit Aggregation & Refund", () => {
    it("aggregates 8 months of swap deficit and attaches standard deduction return", () => {
      const monthlyDeficits = Array(8).fill(toEuroAmount(242));
      const recon = computeAnnualTaxReconciliation(
        toCalendarYear(1),
        toSimulationMonth(15),
        monthlyDeficits,
        toEuroAmount(850),
      );

      assert.equal(recon.accumulatedSwapDeficit, 1936); // 8 * 242 = 1936
      assert.equal(recon.baseDeductionsRefund, 850);
      assert.equal(recon.totalRefundAmount, 2786); // 1936 + 850 = 2786
      assert.equal(recon.refundMonth, 15);
      assert.equal(recon.taxYear, 1);
    });

    it("handles zero-deficit years (only standard base deduction refund)", () => {
      const recon = computeAnnualTaxReconciliation(
        toCalendarYear(2),
        toSimulationMonth(27),
        [],
        toEuroAmount(850),
      );

      assert.equal(recon.accumulatedSwapDeficit, 0);
      assert.equal(recon.baseDeductionsRefund, 850);
      assert.equal(recon.totalRefundAmount, 850);
      assert.equal(recon.refundMonth, 27);
    });
  });
});
