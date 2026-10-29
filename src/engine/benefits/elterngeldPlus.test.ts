import {
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";
import {
  computeStatutoryReplacementRate,
  computeElterngeldBenefits,
  isElterngeldHoursEligible,
  isPartnerschaftsbonusEligible,
} from "#engine/benefits/elterngeldPlus";
import {
  toNetSalary,
  toWorkingHours,
} from "#engine/types";
import {
  createBenefitRules,
} from "#engine/config/benefitRules";

describe("Elterngeld & ElterngeldPlus Calculation Engine (BEEG § 2, § 4, § 4a)", () => {
  describe("computeStatutoryReplacementRate - Sliding Replacement Scale (§ 2 BEEG)", () => {
    it("applies 65% replacement rate for net incomes > 1.240 €", () => {
      for (let net = 1240; net <= 6000; net += 200) {
        const rate = computeStatutoryReplacementRate(toNetSalary(net));
        assert.equal(rate, 0.65, `Rate must be 0.65 for net ${net} €`);
      }
    });

    it("applies 67% replacement rate for net incomes between 1.000 € and 1.200 €", () => {
      for (let net = 1000; net <= 1200; net += 50) {
        const rate = computeStatutoryReplacementRate(toNetSalary(net));
        assert.equal(rate, 0.67, `Rate must be 0.67 for net ${net} €`);
      }
    });

    it("scales up replacement rate from 67% towards 100% for low incomes (< 1.000 €)", () => {
      // 500 € net -> 67% + (1000-500)/2 * 0.1% = 67% + 25% = 92%
      const rate500 = computeStatutoryReplacementRate(toNetSalary(500));
      assert.equal(rate500, 0.92);

      // 300 € net -> 67% + (1000-300)/2 * 0.1% = 67% + 35% = 100% (max 100%)
      const rate300 = computeStatutoryReplacementRate(toNetSalary(300));
      assert.equal(rate300, 1.0);
    });
  });

  describe("computeElterngeldBenefits - Basiselterngeld & ElterngeldPlus Caps & Floors", () => {
    it("caps Basiselterngeld at statutory maximum €1.800/month", () => {
      const highEarnerBenefit = computeElterngeldBenefits(toNetSalary(4000));
      assert.equal(highEarnerBenefit.basiselterngeld, 1800);
      assert.equal(highEarnerBenefit.elterngeldPlus, 900);
      assert.equal(highEarnerBenefit.isMaxCapped, true);
    });

    // BEEG § 4a(2); Familienportal's independently worked 2000 € examples.
    // BEEG guidelines 2.0.3.3.1 require cent rounding, including intermediates.
    it("limits Plus to half the personal no-income Basis entitlement", () => {
      for (const afterBirth of [0, 500]) {
        const benefit = computeElterngeldBenefits(
          toNetSalary(2000),
          toNetSalary(afterBirth),
        );
        assert.equal(benefit.elterngeldPlus, 650);
        assert.equal(benefit.isMaxCapped, true);
      }
    });

    it("preserves an income-loss benefit below the personal Plus ceiling", () => {
      const benefit = computeElterngeldBenefits(toNetSalary(2000), toNetSalary(1200));
      assert.equal(benefit.elterngeldPlus, 520);
      assert.equal(benefit.isMaxCapped, false);
    });

    it("rounds the personal ceiling to cents after halving Basis", () => {
      const benefit = computeElterngeldBenefits(
        toNetSalary(2603),
        toNetSalary(0),
      );
      assert.equal(benefit.basiselterngeld, 1691.95);
      assert.equal(benefit.elterngeldPlus, 845.98);
      assert.equal(benefit.isMaxCapped, true);
    });

    it("retains the eligible zero-income minima", () => {
      const benefit = computeElterngeldBenefits(toNetSalary(0));
      assert.equal(benefit.basiselterngeld, 300);
      assert.equal(benefit.elterngeldPlus, 150);
      assert.equal(benefit.isMinFloorApplied, true);
    });

    it("uses configured rates, entitlement limits, and hours instead of raw constants", () => {
      const rules = createBenefitRules({ minimumReplacementRate: 0.6,
        plusFraction: 0.4,
        maximumWeeklyHours: 30 });
      const benefit = computeElterngeldBenefits(toNetSalary(2000), toNetSalary(0), toWorkingHours(30), rules);
      assert.equal(benefit.basiselterngeld, 1200);
      assert.equal(benefit.elterngeldPlusCeiling, 480);
      assert.equal(benefit.elterngeldPlus, 480);
      assert.equal(isElterngeldHoursEligible(toWorkingHours(31), rules), false);
      assert.equal(computeElterngeldBenefits(toNetSalary(2000), toNetSalary(0), toWorkingHours(31), rules).elterngeldPlus, 0);
    });

    it("caps assessable pre-birth net before subtracting post-birth earnings", () => {
      // Familienportal example: min(3200, 2770) - 1570 = 1200; 65% = 780.
      const benefit = computeElterngeldBenefits(toNetSalary(3200), toNetSalary(1570));
      assert.equal(benefit.assessablePreBirthNet, 2770);
      assert.equal(benefit.netIncomeLoss, 1200);
      assert.equal(benefit.basiselterngeld, 780);
      assert.equal(benefit.elterngeldPlus, 780);
    });

    it("uses the configured income cap and floors income losses at zero", () => {
      const rules = createBenefitRules({ maximumAssessableNet: 2500 });
      const benefit = computeElterngeldBenefits(toNetSalary(3200), toNetSalary(1570), undefined, rules);
      assert.equal(benefit.netIncomeLoss, 930);
      assert.equal(benefit.elterngeldPlus, 604.5);
      for (const after of [2500, 3000]) {
        const noLoss = computeElterngeldBenefits(toNetSalary(3200), toNetSalary(after), undefined, rules);
        assert.equal(noLoss.netIncomeLoss, 0);
        assert.equal(noLoss.elterngeldPlus, 150);
      }
    });

    it("keeps the no-income benefit within its maximum around the assessment cap", () => {
      for (const before of [2769.99, 2770, 2770.01]) {
        const benefit = computeElterngeldBenefits(toNetSalary(before));
        assert.equal(benefit.basiselterngeld, 1800);
        assert.equal(benefit.elterngeldPlus, 900);
      }
    });

    it("applies statutory minimum floor of €150/month for ElterngeldPlus (§ 4a BEEG)", () => {
      // Case where loss calculation produces tiny benefit
      const lowLossBenefit = computeElterngeldBenefits(
        toNetSalary(1500),
        toNetSalary(1400),
      );
      assert.equal(lowLossBenefit.elterngeldPlus, 150);
      assert.equal(lowLossBenefit.isMinFloorApplied, true);
    });

    it("computes exact benefit for unoptimized Scenario B", () => {
      // Loss €647 * 65% = €420.55, below the personal ceiling.
      const benefit = computeElterngeldBenefits(
        toNetSalary(1975),
        toNetSalary(1328),
      );
      assert.equal(benefit.elterngeldPlus, 420.55);
      assert.equal(benefit.isMaxCapped, false);
      assert.equal(benefit.isMinFloorApplied, false);
    });

    it("disqualifies from Elterngeld entirely when weekly working hours exceed 32h (§ 1 Abs. 1 Nr. 4 BEEG)", () => {
      for (const hours of [33, 35, 38, 40, 45]) {
        const benefit = computeElterngeldBenefits(
          toNetSalary(2603),
          toNetSalary(1800),
          toWorkingHours(hours),
        );
        assert.equal(benefit.elterngeldPlus, 0);
        assert.equal(benefit.basiselterngeld, 0);
        assert.equal(benefit.replacementRate, 0);
        assert.ok(benefit.statutoryCitation.includes("Ausschluss"));
      }
    });

    it("permits standard ElterngeldPlus when working between 0 and 32 hours per week (§ 1 Abs. 1 Nr. 4 BEEG)", () => {
      for (const hours of [0, 10, 16, 20, 24, 30, 32]) {
        const benefit = computeElterngeldBenefits(
          toNetSalary(2603),
          toNetSalary(1328),
          toWorkingHours(hours),
        );
        assert.equal(benefit.elterngeldPlus, 828.75);
      }
    });
  });

  describe("Statutory Working Hours Eligibility Helpers (§ 1 Abs. 1 Nr. 4 & § 4b BEEG)", () => {
    it("isElterngeldHoursEligible validates maximum 32 hours threshold", () => {
      assert.equal(isElterngeldHoursEligible(toWorkingHours(0)), true);
      assert.equal(isElterngeldHoursEligible(toWorkingHours(20)), true);
      assert.equal(isElterngeldHoursEligible(toWorkingHours(24)), true);
      assert.equal(isElterngeldHoursEligible(toWorkingHours(32)), true);
      assert.equal(isElterngeldHoursEligible(toWorkingHours(33)), false);
      assert.equal(isElterngeldHoursEligible(toWorkingHours(40)), false);
    });

    it("isPartnerschaftsbonusEligible enforces 24-32h simultaneous corridor (§ 4b BEEG)", () => {
      assert.equal(
        isPartnerschaftsbonusEligible(toWorkingHours(24), toWorkingHours(32)),
        true,
      );
      assert.equal(
        isPartnerschaftsbonusEligible(toWorkingHours(28), toWorkingHours(28)),
        true,
      );
      assert.equal(
        isPartnerschaftsbonusEligible(toWorkingHours(32), toWorkingHours(24)),
        true,
      );

      // Outside corridor
      assert.equal(
        isPartnerschaftsbonusEligible(toWorkingHours(20), toWorkingHours(32)),
        false,
      ); // Mother < 24h
      assert.equal(
        isPartnerschaftsbonusEligible(toWorkingHours(35), toWorkingHours(30)),
        false,
      ); // Mother > 32h
      assert.equal(
        isPartnerschaftsbonusEligible(toWorkingHours(28), toWorkingHours(40)),
        false,
      ); // Father > 32h
      assert.equal(
        isPartnerschaftsbonusEligible(toWorkingHours(28), toWorkingHours(20)),
        false,
      ); // Father < 24h
      assert.equal(
        isPartnerschaftsbonusEligible(toWorkingHours(0), toWorkingHours(32)),
        false,
      ); // Mother 0h
    });
  });
});
