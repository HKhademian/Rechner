import {
  describe, it, 
} from "node:test";
import assert from "node:assert/strict";
import {
  computeMonthlyMutterschutz, 
} from "#engine/benefits/mutterschutz";
import {
  toNetSalary, 
} from "#engine/types";

describe("Maternity Protection Benefits Engine (MuSchG § 19, § 20)", () => {
  it("guarantees 100% net wage replacement across all income levels", () => {
    for (let net = 500; net <= 5000; net += 250) {
      const benefit = computeMonthlyMutterschutz(toNetSalary(net));
      assert.equal(benefit.totalMaternityBenefit, net);
      assert.equal(
        benefit.healthInsuranceShare + benefit.employerSupplement,
        net,
      );
    }
  });

  it("splits benefit between GKV Mutterschaftsgeld (€13/day ~ €390/mo) and Arbeitgeberzuschuss", () => {
    const net = toNetSalary(2600);
    const benefit = computeMonthlyMutterschutz(net);
    assert.equal(benefit.healthInsuranceShare, 390);
    assert.equal(benefit.employerSupplement, 2600 - 390); // 2210
    assert.equal(benefit.totalMaternityBenefit, 2600);
  });

  it("handles low income where net is less than maximum GKV share", () => {
    const net = toNetSalary(300);
    const benefit = computeMonthlyMutterschutz(net);
    assert.equal(benefit.healthInsuranceShare, 300);
    assert.equal(benefit.employerSupplement, 0);
    assert.equal(benefit.totalMaternityBenefit, 300);
  });

  it("handles zero income cleanly", () => {
    const benefit = computeMonthlyMutterschutz(toNetSalary(0));
    assert.equal(benefit.totalMaternityBenefit, 0);
    assert.equal(benefit.healthInsuranceShare, 0);
    assert.equal(benefit.employerSupplement, 0);
  });
});
