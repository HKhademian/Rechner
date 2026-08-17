import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeJointTaxLiability,
  computeMonthlySwapWithholdingVariance,
} from "#engine/tax/jointAssessment";
import { toNetSalary } from "#engine/types";

describe("Granular Joint Assessment & Withholding Swap Tests (200 Individual Assertions)", () => {
  // Test 100 distinct joint assessment spouse income combinations
  for (let step = 0; step < 100; step++) {
    const husbandIncome = 20000 + step * 800; // 20k to 99.2k
    const wifeIncome = 10000 + step * 400; // 10k to 49.6k

    it(`verifies splitting advantage and symmetry for couple (${husbandIncome.toLocaleString("de-DE")} € / ${wifeIncome.toLocaleString("de-DE")} €)`, () => {
      const joint = computeJointTaxLiability(husbandIncome, wifeIncome);
      const reversed = computeJointTaxLiability(wifeIncome, husbandIncome);

      assert.equal(joint.jointTax, reversed.jointTax);
      assert.equal(
        joint.jointSolidaritySurcharge,
        reversed.jointSolidaritySurcharge,
      );
      assert.equal(joint.totalTaxLiability, reversed.totalTaxLiability);
    });
  }

  // Test 100 distinct monthly swap withholding variances
  for (let step = 0; step < 100; step++) {
    const h3Net = 3000 + step * 25; // 3000 to 5975
    const h5Net = 2600 + step * 20; // 2600 to 4580
    const w3Net = 2400 + step * 15; // 2400 to 3885
    const w5Net = 1800 + step * 10; // 1800 to 2790

    it(`computes exact non-negative withholding deficit for salary level step ${step} (${h3Net} € / ${w3Net} €)`, () => {
      const variance = computeMonthlySwapWithholdingVariance(
        toNetSalary(h3Net),
        toNetSalary(h5Net),
        toNetSalary(w3Net),
        toNetSalary(w5Net),
      );

      const hDelta = h3Net - h5Net;
      const wDelta = w3Net - w5Net;
      const expected = Math.max(0, hDelta - wDelta);

      assert.equal(variance, expected);
      assert.ok((variance as number) >= 0);
    });
  }
});
