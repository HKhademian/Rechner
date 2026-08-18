import {
  describe, it, 
} from "node:test";
import assert from "node:assert/strict";
import {
  computeAnnualIncomeTax,
  computeMonthlySocialSecurity,
  computeGrossToNetBreakdown,
  computeMonthlyNetSalary,
  deriveSpousalNetSalaries,
  computeWageTaxZone,
} from "#engine/tax/wageTax";
import {
  TaxClass,
  WageTaxZone,
  SalaryInputMode,
  BonusTaxMethod,
  toGrossSalary,
  toEuroAmount,
  toWorkingHours,
  toSalaryInputMode,
  toWageTaxZone,
  toBonusTaxMethod,
} from "#engine/types";

describe("German Gross-to-Net Engine & Statutory Tax Benchmark Suite", () => {
  describe("Const Enums, Guards & Runtime Constructors", () => {
    it("validates SalaryInputMode const enum and constructor", () => {
      assert.equal(toSalaryInputMode("gross"), SalaryInputMode.Gross);
      assert.equal(toSalaryInputMode("net"), SalaryInputMode.Net);
      assert.equal(toSalaryInputMode("GROSS"), SalaryInputMode.Gross);
      assert.throws(
        () => toSalaryInputMode("invalid"),
        /Invalid SalaryInputMode/,
      );
    });

    it("validates WageTaxZone const enum and constructor", () => {
      assert.equal(toWageTaxZone(WageTaxZone.Zone1Null), WageTaxZone.Zone1Null);
      assert.equal(
        toWageTaxZone(WageTaxZone.Zone4Proportional42),
        WageTaxZone.Zone4Proportional42,
      );
      assert.throws(() => toWageTaxZone("UNKNOWN_ZONE"), /Invalid WageTaxZone/);
    });

    it("validates BonusTaxMethod const enum and constructor", () => {
      assert.equal(
        toBonusTaxMethod(BonusTaxMethod.RegularWage),
        BonusTaxMethod.RegularWage,
      );
      assert.equal(
        toBonusTaxMethod(BonusTaxMethod.SonstigeBezuegeAnnualDiff),
        BonusTaxMethod.SonstigeBezuegeAnnualDiff,
      );
      assert.throws(
        () => toBonusTaxMethod("FLAT_TAX"),
        /Invalid BonusTaxMethod/,
      );
    });
  });

  describe("Statutory Tariff Zones (§ 32a EStG) & Progressive Income Tax", () => {
    it("correctly maps taxable income (ZvE) to § 32a tariff zones", () => {
      assert.equal(computeWageTaxZone(10000), WageTaxZone.Zone1Null);
      assert.equal(computeWageTaxZone(11784), WageTaxZone.Zone1Null);
      assert.equal(computeWageTaxZone(15000), WageTaxZone.Zone2Progression1);
      assert.equal(computeWageTaxZone(17005), WageTaxZone.Zone2Progression1);
      assert.equal(computeWageTaxZone(30000), WageTaxZone.Zone3Progression2);
      assert.equal(computeWageTaxZone(66760), WageTaxZone.Zone3Progression2);
      assert.equal(computeWageTaxZone(100000), WageTaxZone.Zone4Proportional42);
      assert.equal(computeWageTaxZone(277825), WageTaxZone.Zone4Proportional42);
      assert.equal(
        computeWageTaxZone(300000),
        WageTaxZone.Zone5Reichensteuer45,
      );
    });

    it("calculates zero tax in Zone 1 (Nullzone <= 11.784 €)", () => {
      assert.equal(computeAnnualIncomeTax(0), 0);
      assert.equal(computeAnnualIncomeTax(5000), 0);
      assert.equal(computeAnnualIncomeTax(11784), 0);
    });

    it("applies progressive formula monotonically as income increases", () => {
      let prevTax = 0;
      for (let zve = 12000; zve <= 300000; zve += 10000) {
        const tax = computeAnnualIncomeTax(zve);
        assert.ok(
          tax > prevTax,
          `Tax for ${zve} (${tax}) must be strictly greater than previous (${prevTax})`,
        );
        prevTax = tax;
      }
    });
  });

  describe("Social Insurance Deductions & Beitragsbemessungsgrenzen (BBG)", () => {
    it("caps health & care insurance contributions at €5.175/mo ceiling", () => {
      const atCap = computeMonthlySocialSecurity(toGrossSalary(5175), 0);
      const aboveCap1 = computeMonthlySocialSecurity(toGrossSalary(7500), 0);
      const aboveCap2 = computeMonthlySocialSecurity(toGrossSalary(12000), 0);

      assert.equal(
        atCap.healthInsurance,
        aboveCap1.healthInsurance,
      );
      assert.equal(
        atCap.healthInsurance,
        aboveCap2.healthInsurance,
      );
      assert.equal(
        atCap.careInsurance,
        aboveCap1.careInsurance,
      );
    });

    it("caps pension & unemployment insurance contributions at €7.550/mo ceiling", () => {
      const atCap = computeMonthlySocialSecurity(toGrossSalary(7550), 0);
      const aboveCap = computeMonthlySocialSecurity(toGrossSalary(15000), 0);

      assert.equal(
        atCap.pensionInsurance,
        aboveCap.pensionInsurance,
      );
      assert.equal(
        atCap.unemploymentInsurance,
        aboveCap.unemploymentInsurance,
      );
    });

    it("applies statutory care insurance child discounts (§ 55 Abs. 3 SGB XI)", () => {
      const gross = toGrossSalary(4000);
      const c0 = computeMonthlySocialSecurity(gross, 0); // 2.80%
      const c1 = computeMonthlySocialSecurity(gross, 1); // 2.20%
      const c2 = computeMonthlySocialSecurity(gross, 2); // 1.95%
      const c3 = computeMonthlySocialSecurity(gross, 3); // 1.70%
      const c4 = computeMonthlySocialSecurity(gross, 4); // 1.45%
      const c5 = computeMonthlySocialSecurity(gross, 5); // 1.20% (max discount)

      assert.equal(c0.careInsuranceRate, 0.028);
      assert.equal(c1.careInsuranceRate, 0.022);
      assert.equal(c2.careInsuranceRate, 0.0195);
      assert.equal(c3.careInsuranceRate, 0.017);
      assert.equal(c4.careInsuranceRate, 0.0145);
      assert.equal(c5.careInsuranceRate, 0.012);

      assert.ok(c0.careInsurance > c1.careInsurance);
      assert.ok(c1.careInsurance > c2.careInsurance);
      assert.ok(c2.careInsurance > c3.careInsurance);
      assert.ok(c3.careInsurance > c4.careInsurance);
      assert.ok(c4.careInsurance > c5.careInsurance);
    });
  });

  describe("Comprehensive Tax Class Benchmark (I, II, III, IV, V, VI)", () => {
    const grossBrackets = [
      1500, 2000, 2500, 3000, 3000, 4000, 4500, 5000, 5500, 6000, 5000, 7000,
      8000, 10000, 12000,
    ];

    grossBrackets.forEach((grossNum) => {
      it(`calculates tax class ordering for gross ${grossNum.toLocaleString("de-DE")} €: Net(III) >= Net(IV) >= Net(I) > Net(V)`, () => {
        const gross = toGrossSalary(grossNum);
        const net3 = computeMonthlyNetSalary(gross, TaxClass.III, 0);
        const net4 = computeMonthlyNetSalary(gross, TaxClass.IV, 0);
        const net1 = computeMonthlyNetSalary(gross, TaxClass.I, 0);
        const net2 = computeMonthlyNetSalary(gross, TaxClass.II, 1);
        const net5 = computeMonthlyNetSalary(gross, TaxClass.V, 0);
        const net6 = computeMonthlyNetSalary(gross, TaxClass.VI, 0);

        assert.ok(
          net3 >= net4,
          `Class III net (${net3}) must be >= Class IV (${net4})`,
        );
        assert.ok(
          net4 >= net1,
          `Class IV net (${net4}) must be >= Class I net (${net1}) due to married Solz threshold`,
        );
        assert.ok(
          net2 >= net1,
          `Single parent Class II (${net2}) must be >= Class I (${net1}) due to § 24b relief`,
        );
        assert.ok(
          net4 > net5,
          `Class IV net (${net4}) must be > Class V net (${net5})`,
        );
        assert.ok(
          net4 > net6,
          `Class IV net (${net4}) must be > Class VI net (${net6})`,
        );
      });
    });

    it("computes accurate baseline numbers for project typical salaries", () => {
      // Husband ~4.500 € Gross
      const hGross = toGrossSalary(4500);
      const hClass3 = computeGrossToNetBreakdown(hGross, TaxClass.III, 0);
      const hClass5 = computeGrossToNetBreakdown(hGross, TaxClass.V, 0);

      assert.ok(
        hClass3.monthlyNetTakeHome >= 4200 &&
          hClass3.monthlyNetTakeHome <= 4400,
      );
      assert.ok(
        hClass5.monthlyNetTakeHome >= 3000 &&
          hClass5.monthlyNetTakeHome <= 3200,
      );

      // Wife ~3.000 € Gross Full-Time
      const wGross = toGrossSalary(3000);
      const wClass5 = computeGrossToNetBreakdown(wGross, TaxClass.V, 0);
      const wClass3 = computeGrossToNetBreakdown(wGross, TaxClass.III, 0);

      assert.ok(
        wClass5.monthlyNetTakeHome >= 1950 &&
          wClass5.monthlyNetTakeHome <= 2150,
      );
      assert.ok(
        wClass3.monthlyNetTakeHome >= 2550 &&
          wClass3.monthlyNetTakeHome <= 2750,
      );
    });
  });

  describe("13th-Month Salary & One-Off Bonus Taxation (§ 39b Abs. 3 EStG & § 2c BEEG)", () => {
    it("applies differential annual wage taxation on non-recurrent bonuses (Sonstige Bezüge)", () => {
      const gross = toGrossSalary(4000);
      const regular = computeGrossToNetBreakdown(gross, TaxClass.IV, 0);
      const withBonus = computeGrossToNetBreakdown(
        gross,
        TaxClass.IV,
        0,
        toEuroAmount(2000),
      );

      assert.equal(withBonus.oneOffBonusAmount, 2000);
      assert.ok(
        withBonus.bonusTaxDeduction && withBonus.bonusTaxDeduction > 0,
      );
      assert.ok(
        withBonus.monthlyNetTakeHome >
          regular.monthlyNetTakeHome,
      );

      // Effective take-home increases by bonus minus bonus tax
      const netGain =
        withBonus.monthlyNetTakeHome -
        regular.monthlyNetTakeHome;
      assert.ok(netGain > 1000 && netGain < 2000);
    });

    it("strictly isolates synthetic Elterngeld assessment net without bonus inflation per § 2c BEEG", () => {
      const gross = toGrossSalary(3000);
      const regular = computeGrossToNetBreakdown(gross, TaxClass.III, 0);
      const withBonus = computeGrossToNetBreakdown(
        gross,
        TaxClass.III,
        0,
        toEuroAmount(2500),
      );

      // While take-home pay is higher due to bonus, elterngeldSyntheticNet MUST remain unchanged
      assert.ok(
        withBonus.monthlyNetTakeHome >
          regular.monthlyNetTakeHome,
      );
      assert.equal(
        withBonus.elterngeldSyntheticNet,
        regular.elterngeldSyntheticNet,
        "Statutory Elterngeld baseline must exclude Sonstige Bezüge bonuses per § 2c Abs. 1 Satz 2 BEEG",
      );
    });
  });

  describe("Spousal Household Derivation (deriveSpousalNetSalaries)", () => {
    it("derives all 6 spousal tax class and full-time / part-time net salary combinations", () => {
      const hGross = toGrossSalary(4500);
      const wGross = toGrossSalary(3000);
      const set = deriveSpousalNetSalaries(
        hGross,
        wGross,
        toWorkingHours(24),
        toWorkingHours(40),
        0,
      );

      assert.equal(set.husbandGross, 4500);
      assert.equal(set.wifeGrossFullTime, 3000);
      assert.equal(set.wifeGrossPartTime, 2100); // 3000 * (24/40)

      assert.ok(
        set.husbandClass3Net > set.husbandClass5Net,
      );
      assert.ok(
        set.wifeClass3FullTimeNet >
          set.wifeClass5FullTimeNet,
      );
      assert.ok(
        set.wifeClass3PartTimeNet >
          set.wifeClass5PartTimeNet,
      );
      assert.ok(
        set.wifeClass5FullTimeNet >
          set.wifeClass5PartTimeNet,
      );
    });
  });
});
