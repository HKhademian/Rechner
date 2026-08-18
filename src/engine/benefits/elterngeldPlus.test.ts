import {
  describe, it, 
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

    it("caps ElterngeldPlus at statutory maximum €900/month", () => {
      const benefit = computeElterngeldBenefits(
        toNetSalary(2603),
        toNetSalary(0),
      );
      assert.equal(benefit.elterngeldPlus, 900);
      assert.equal(benefit.isMaxCapped, true);
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
      // Wife baseline Class V (€1.975) and part-time (€1.328) -> Loss €770 * 65% = €500,50 -> €501
      const benefit = computeElterngeldBenefits(
        toNetSalary(1975),
        toNetSalary(1328),
      );
      assert.equal(benefit.elterngeldPlus, 501);
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
        assert.equal(benefit.elterngeldPlus, 900);
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
