import {
  describe, it, 
} from "node:test";
import assert from "node:assert/strict";
import {
  computeAnnualIncomeTax,
  computeSolidaritySurcharge,
  computeMonthlySocialSecurity,
  computeMonthlyNetSalary,
  computeTaxFactor,
} from "#engine/tax/wageTax";
import {
  toGrossSalary, toEuroAmount, TaxClass, 
} from "#engine/types";

describe("German Wage Tax Withholding Engine (§ 32a, § 38b EStG)", () => {
  describe("computeAnnualIncomeTax - § 32a EStG Progressive Tariff", () => {
    it("Zone 1 (Nullzone): Tax is exactly 0 for taxable income <= Grundfreibetrag (11.784 €)", () => {
      for (let zve = 0; zve <= 11784; zve += 200) {
        const tax = computeAnnualIncomeTax(zve);
        assert.equal(tax, 0, `Failed for ZvE: ${zve}`);
      }
    });

    it("Zone 2 (Progressionszone 1): Applies quadratic formula between 11.785 € and 17.005 €", () => {
      for (let zve = 11800; zve <= 17000; zve += 200) {
        const tax = computeAnnualIncomeTax(zve) as number;
        assert.ok(tax > 0, `Tax must be positive at ZvE: ${zve}`);
        assert.ok(
          tax < zve * 0.2,
          `Tax rate must not exceed 20% in Zone 2 for ZvE: ${zve}`,
        );
      }
    });

    it("Zone 3 (Progressionszone 2): Progresses smoothly between 17.006 € and 66.760 €", () => {
      let previousTax = 0;
      for (let zve = 18000; zve <= 66000; zve += 2000) {
        const tax = computeAnnualIncomeTax(zve) as number;
        assert.ok(
          tax > previousTax,
          `Tax must increase monotonically at ZvE: ${zve}`,
        );
        previousTax = tax;
      }
    });

    it("Zone 4 (Proportionalzone 1): 42% Spitzensteuersatz between 66.761 € and 277.825 €", () => {
      const zve1 = 80000;
      const zve2 = 100000;
      const tax1 = computeAnnualIncomeTax(zve1) as number;
      const tax2 = computeAnnualIncomeTax(zve2) as number;

      // Marginal tax rate in Zone 4 must be exactly 42%
      const marginalDiff = (tax2 - tax1) / (zve2 - zve1);
      assert.ok(
        Math.abs(marginalDiff - 0.42) < 0.005,
        `Marginal rate in Zone 4 must be 42%, got: ${marginalDiff}`,
      );
    });

    it("Zone 5 (Proportionalzone 2): 45% Reichensteuer above 277.825 €", () => {
      const zve1 = 300000;
      const zve2 = 400000;
      const tax1 = computeAnnualIncomeTax(zve1) as number;
      const tax2 = computeAnnualIncomeTax(zve2) as number;

      const marginalDiff = (tax2 - tax1) / (zve2 - zve1);
      assert.ok(
        Math.abs(marginalDiff - 0.45) < 0.005,
        `Marginal rate in Zone 5 must be 45%, got: ${marginalDiff}`,
      );
    });
  });

  describe("computeSolidaritySurcharge - SolzG § 3, § 4", () => {
    it("exempts income below the statutory threshold (18.130 € single / 36.260 € married)", () => {
      for (let tax = 0; tax <= 18130; tax += 1000) {
        assert.equal(computeSolidaritySurcharge(toEuroAmount(tax), false), 0);
      }
      for (let tax = 0; tax <= 36260; tax += 2000) {
        assert.equal(computeSolidaritySurcharge(toEuroAmount(tax), true), 0);
      }
    });

    it("applies Milderungszone and maximum 5.5% cap above threshold", () => {
      const highTaxSingle = toEuroAmount(40000);
      const solzSingle = computeSolidaritySurcharge(
        highTaxSingle,
        false,
      ) as number;
      assert.ok(solzSingle > 0);
      assert.ok(solzSingle <= 40000 * 0.055);
    });
  });

  describe("computeMonthlySocialSecurity - Statutory Assessment Ceilings (BBG)", () => {
    it("calculates social contributions proportionally below the BBG", () => {
      for (let gross = 1000; gross <= 4000; gross += 500) {
        const sec = computeMonthlySocialSecurity(toGrossSalary(gross), 0);
        const total = sec.totalSocialSecurity as number;
        // Total employee share is approximately 20-21%
        assert.ok(total > gross * 0.18);
        assert.ok(total < gross * 0.23);
      }
    });

    it("caps health and care insurance at health BBG (€5.175/mo)", () => {
      const sec1 = computeMonthlySocialSecurity(toGrossSalary(5175), 0);
      const sec2 = computeMonthlySocialSecurity(toGrossSalary(8000), 0);
      assert.equal(sec1.healthInsurance, sec2.healthInsurance);
      assert.equal(sec1.careInsurance, sec2.careInsurance);
    });

    it("caps pension and unemployment insurance at general BBG (€7.550/mo)", () => {
      const sec1 = computeMonthlySocialSecurity(toGrossSalary(7550), 0);
      const sec2 = computeMonthlySocialSecurity(toGrossSalary(12000), 0);
      assert.equal(sec1.pensionInsurance, sec2.pensionInsurance);
      assert.equal(sec1.unemploymentInsurance, sec2.unemploymentInsurance);
    });

    it("applies statutory care insurance discount per child (§ 55 Abs. 3 SGB XI)", () => {
      const gross = toGrossSalary(4000);
      const secNoChild = computeMonthlySocialSecurity(gross, 0);
      const sec1Child = computeMonthlySocialSecurity(gross, 1);
      const sec2Child = computeMonthlySocialSecurity(gross, 2);
      const sec3Child = computeMonthlySocialSecurity(gross, 3);

      assert.ok(
        (secNoChild.careInsurance as number) >
          (sec1Child.careInsurance as number),
      );
      assert.ok(
        (sec1Child.careInsurance as number) >
          (sec2Child.careInsurance as number),
      );
      assert.ok(
        (sec2Child.careInsurance as number) >
          (sec3Child.careInsurance as number),
      );
    });
  });

  describe("computeMonthlyNetSalary - Tax Classes I to VI (§ 38b EStG)", () => {
    it("produces higher net for Tax Class III than Class IV and Class V at identical gross", () => {
      for (let gross = 2500; gross <= 8000; gross += 500) {
        const g = toGrossSalary(gross);
        const net3 = computeMonthlyNetSalary(g, TaxClass.III, 0) as number;
        const net4 = computeMonthlyNetSalary(g, TaxClass.IV, 0) as number;
        const net5 = computeMonthlyNetSalary(g, TaxClass.V, 0) as number;

        assert.ok(
          net3 > net4,
          `Class III net (${net3}) must be greater than Class IV (${net4}) at ${gross} € gross`,
        );
        assert.ok(
          net4 > net5,
          `Class IV net (${net4}) must be greater than Class V (${net5}) at ${gross} € gross`,
        );
      }
    });

    it("calculates 0 net for 0 gross income", () => {
      const net = computeMonthlyNetSalary(toGrossSalary(0), TaxClass.I, 0);
      assert.equal(net, 0);
    });
  });

  describe("computeTaxFactor - Faktorverfahren (§ 39f EStG)", () => {
    it("computes factor F = 1.000 for identical spousal incomes (symmetric withholding)", () => {
      const annualIncome = 60000;
      const factor = computeTaxFactor(annualIncome, annualIncome, 0);
      assert.equal(factor, 1.0);
    });

    it("computes factor F < 1.000 for asymmetric spousal gross incomes", () => {
      const husbandAnnual = 4500 * 12; // 54.000 €
      const wifeAnnual = 3000 * 12; // 36.000 €
      const factor = computeTaxFactor(husbandAnnual, wifeAnnual, 0);

      assert.ok(
        factor > 0 && factor < 1.0,
        `Factor should be between 0 and 1, got ${factor}`,
      );
      assert.ok(
        Math.abs(factor - 0.9) < 0.1,
        `Expected factor near ~0.90 for 4500/3000 split, got: ${factor}`,
      );
    });

    it("applies factor F to reduce wage tax withholding in Tax Class IV", () => {
      const hGross = toGrossSalary(4500);
      const factor = 0.905;

      const net4Standard = computeMonthlyNetSalary(
        hGross,
        TaxClass.IV,
        0,
      ) as number;
      const net4Factor = computeMonthlyNetSalary(
        hGross,
        TaxClass.IV,
        0,
        undefined,
        factor,
      ) as number;

      assert.ok(
        net4Factor > net4Standard,
        `Net with factor (${net4Factor}) must exceed standard Class IV net (${net4Standard})`,
      );
    });
  });
});
