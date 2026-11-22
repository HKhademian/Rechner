import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  evaluateParentalLeaveVacationFormula,
} from "#engine/formulas/pure/vacationOptimizationFormulas";
import {
  toIsoCalendarDate,
} from "#engine/types";

describe("Tier 1 Pure Vacation Optimization Formulas (§ 24 MuSchG & § 17 BEEG)", () => {
  it("protects partial boundary months (Aug 24–31 & Dec 1–27) and saves +2.5 days for 30-day contract when returning 28.12.2027", () => {
    // Due 28.06.2027 -> Mutterschutz 17.05..23.08.2027 -> Full Elternzeit 24.08..27.12.2027 -> Return 28.12.2027
    const optimized = evaluateParentalLeaveVacationFormula({
      annualVacationDays: 30,
      expectedDueDate: toIsoCalendarDate("2027-06-28"),
      fullElternzeitEndDate: toIsoCalendarDate("2027-12-27"),
      vacationDaysTakenPreLeave: 0,
    });

    assert.equal(optimized.fullElternzeitStartDate, "2027-08-24");
    assert.equal(optimized.returnToWorkDate, "2027-12-28");
    // Only Sep, Oct, Nov 2027 are FULL calendar months (3/12 cut = 7.5d -> 22.5d entitled)
    assert.equal(optimized.totalFullCalendarMonthsCut, 3);
    assert.equal(optimized.totalStatutoryReductionDays, 7.5);
    assert.equal(optimized.birthYearEntitledDaysAfterCut, 22.5);
    assert.equal(optimized.remainingUnusedCarryoverDays, 22.5);
    assert.equal(optimized.birthYearOverusedDays, 0);
    assert.equal(optimized.carryoverExpiryDate, "2028-12-31");
    assert.equal(optimized.monthEndOptimization.hasMonthEndTrap, false);
    assert.equal(optimized.monthEndOptimization.isMonthEndOptimized, true);
    assert.equal(optimized.monthEndOptimization.vacationDaysDelta, 2.5);
    assert.deepEqual(optimized.yearlyBreakdowns[0].cutMonthIds, [
      "M09.2027",
      "M10.2027",
      "M11.2027",
    ]);
    assert.deepEqual(optimized.yearlyBreakdowns[0].protectedBoundaryMonthIds, [
      "M08.2027",
      "M12.2027",
    ]);
  });

  it("flags month-end trap when ending full Elternzeit on 31.12.2027 (4/12 cut vs 3/12) for 28-day and 30-day contracts", () => {
    const trap30 = evaluateParentalLeaveVacationFormula({
      annualVacationDays: 30,
      expectedDueDate: toIsoCalendarDate("2027-06-28"),
      fullElternzeitEndDate: toIsoCalendarDate("2027-12-31"),
    });
    assert.equal(trap30.totalFullCalendarMonthsCut, 4); // Sep, Oct, Nov, Dec
    assert.equal(trap30.totalStatutoryReductionDays, 10);
    assert.equal(trap30.birthYearEntitledDaysAfterCut, 20);
    assert.equal(trap30.monthEndOptimization.hasMonthEndTrap, true);
    assert.equal(trap30.monthEndOptimization.vacationDaysDelta, 2.5);

    // 28-day contract with all 28 days taken before Mutterschutz -> § 17 Abs. 4 BEEG over-usage check
    const preConsumed28 = evaluateParentalLeaveVacationFormula({
      annualVacationDays: 28,
      expectedDueDate: toIsoCalendarDate("2027-06-28"),
      fullElternzeitEndDate: toIsoCalendarDate("2027-12-27"),
      vacationDaysTakenPreLeave: 28,
    });
    // 3/12 of 28 = 7 days cut -> 21 days post-cut entitlement -> 7 overused days deducted from 2028 (zero cash clawback)
    assert.equal(preConsumed28.totalStatutoryReductionDays, 7);
    assert.equal(preConsumed28.birthYearEntitledDaysAfterCut, 21);
    assert.equal(preConsumed28.remainingUnusedCarryoverDays, 0);
    assert.equal(preConsumed28.birthYearOverusedDays, 7);
  });

  it("extends § 17 Abs. 2 carryover expiry when directly chained into a second Elternzeit", () => {
    const chained = evaluateParentalLeaveVacationFormula({
      annualVacationDays: 30,
      expectedDueDate: toIsoCalendarDate("2027-06-28"),
      fullElternzeitEndDate: toIsoCalendarDate("2027-12-27"),
      chainedNextElternzeitEndDate: toIsoCalendarDate("2029-05-15"),
    });
    assert.equal(chained.carryoverExpiryDate, "2030-12-31");
  });
});
