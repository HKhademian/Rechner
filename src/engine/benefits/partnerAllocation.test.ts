import {
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";
import {
  toSimulationMonth,
  toMonthDuration,
  toWorkingHours,
} from "#engine/types";
import {
  createBenefitRules,
} from "#engine/config/benefitRules";
import {
  isOrdinaryPartnerPaymentMonth,
  validatePartnerMonths,
} from "#engine/benefits/partnerAllocation";

describe("Ordinary partner Plus allocation", () => {
  it("honors the requested Plus duration without borrowing bonus months", () => {
    for (const count of [0, 2, 4]) {
      const paid = [];
      for (let month = 10; month <= 20; month++) {
        if (isOrdinaryPartnerPaymentMonth(toSimulationMonth(month), toSimulationMonth(12), toMonthDuration(count), toWorkingHours(32))) {
          paid.push(month);
        }
      }
      assert.deepEqual(paid, count === 0 ? [] : count === 2 ? [12, 13] : [12, 13, 14, 15]);
    }
  });

  it("checks active hours and configurable eligibility and allocation limits", () => {
    assert.equal(isOrdinaryPartnerPaymentMonth(toSimulationMonth(12), toSimulationMonth(12), toMonthDuration(4), toWorkingHours(33)), false);
    const rules = createBenefitRules({ maximumWeeklyHours: 30,
      additionalPartnerBasisMonths: 3 });
    assert.equal(isOrdinaryPartnerPaymentMonth(toSimulationMonth(17), toSimulationMonth(12), toMonthDuration(6), toWorkingHours(30), rules), true);
    assert.equal(isOrdinaryPartnerPaymentMonth(toSimulationMonth(12), toSimulationMonth(12), toMonthDuration(6), toWorkingHours(31), rules), false);
    assert.throws(() => validatePartnerMonths(toMonthDuration(1)), TypeError);
    assert.throws(() => validatePartnerMonths(toMonthDuration(1.5)), TypeError);
    assert.throws(() => validatePartnerMonths(toMonthDuration(5)), TypeError);
  });
});
