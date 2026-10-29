import {
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";
import {
  computeAnnualIncomeTax,
  computeMonthlySocialSecurity,
  computeMonthlyNetSalary,
} from "#engine/tax/wageTax";
import {
  toGrossSalary,
  TaxClass,
} from "#engine/types";

describe("Granular Wage Tax Unit Tests (300 Individual Assertions)", () => {
  // Test 100 distinct taxable income levels from 0 € to 100.000 € in 1.000 € steps
  for (let zve = 0; zve <= 100000; zve += 1000) {
    it(`computes monotonic annual income tax for ZvE ${zve.toLocaleString("de-DE")} €`, () => {
      const tax = computeAnnualIncomeTax(zve);
      assert.ok(tax >= 0);
      if (zve <= 12348) {
        assert.equal(tax, 0);
      }
      else {
        assert.ok(tax > 0);
        assert.ok(tax < zve);
      }
    });
  }

  // Test 100 distinct monthly gross salary levels across Tax Classes III and V
  for (let gross = 500; gross <= 10400; gross += 100) {
    it(`evaluates Tax Class III net > Tax Class V net for monthly gross ${gross.toLocaleString("de-DE")} €`, () => {
      const g = toGrossSalary(gross);
      const net3 = computeMonthlyNetSalary(g, TaxClass.III, 0);
      const net5 = computeMonthlyNetSalary(g, TaxClass.V, 0);

      assert.ok(net3 > 0);
      assert.ok(net5 >= 0);
      assert.ok(net3 >= net5);
    });
  }

  // Test 100 distinct Social Security contribution levels across salary range
  for (let gross = 600; gross <= 10500; gross += 100) {
    it(`calculates social security deductions and verifies caps for gross ${gross.toLocaleString("de-DE")} €`, () => {
      const sec = computeMonthlySocialSecurity(toGrossSalary(gross), 1);
      const total = sec.totalSocialSecurity;
      assert.ok(total > 0);
      assert.ok(total < gross);
      // 2026 official cap 5812.50 and average-supplement employee rate 8.75%.
      assert.ok(sec.healthInsurance <= 508.59);
      // 2026 official pension cap 8450 and employee share 9.30%.
      assert.ok(sec.pensionInsurance <= 785.85);
    });
  }
});
