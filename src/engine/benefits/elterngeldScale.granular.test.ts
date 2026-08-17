import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeStatutoryReplacementRate,
  computeElterngeldBenefits,
} from "#engine/benefits/elterngeldPlus";
import { toNetSalary } from "#engine/types";

describe("Granular Elterngeld Replacement Scale & Caps (300 Individual Assertions)", () => {
  // Test 150 net salary points from 300 € to 1.800 € in 10 € increments
  for (let net = 300; net <= 1790; net += 10) {
    it(`evaluates statutory replacement rate for net salary ${net} €`, () => {
      const rate = computeStatutoryReplacementRate(toNetSalary(net));
      if (net <= 1000) {
        assert.ok(rate >= 0.67);
        assert.ok(rate <= 1.0);
      } else if (net <= 1200) {
        assert.equal(rate, 0.67);
      } else {
        assert.ok(rate <= 0.67);
        assert.ok(rate >= 0.65);
      }
    });
  }

  // Test 150 ElterngeldPlus benefit calculations across various pre-birth and part-time levels
  for (let step = 0; step < 150; step++) {
    const preBirth = 1500 + step * 20; // 1500 to 4480
    const partTime = 800 + step * 10; // 800 to 2290

    it(`computes bounded ElterngeldPlus for pre-net ${preBirth} € and part-time net ${partTime} €`, () => {
      const benefit = computeElterngeldBenefits(
        toNetSalary(preBirth),
        toNetSalary(partTime),
      );

      const plus = benefit.elterngeldPlus as number;
      const basis = benefit.basiselterngeld as number;

      // ElterngeldPlus is always between minimum floor €150 and maximum cap €900
      assert.ok(plus >= 150, `ElterngeldPlus must be >= 150, got: ${plus}`);
      assert.ok(plus <= 900, `ElterngeldPlus must be <= 900, got: ${plus}`);

      // Basiselterngeld is always between minimum floor €300 and maximum cap €1.800
      assert.ok(basis >= 300, `Basiselterngeld must be >= 300, got: ${basis}`);
      assert.ok(
        basis <= 1800,
        `Basiselterngeld must be <= 1800, got: ${basis}`,
      );
    });
  }
});
