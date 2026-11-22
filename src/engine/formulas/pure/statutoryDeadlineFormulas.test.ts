import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  evaluateStatutoryDeadlinesFormula,
} from "#engine/formulas/pure/statutoryDeadlineFormulas";
import {
  StatutoryDeadlineCategory,
  StatutoryDeadlineSeverity,
  toIsoCalendarDate,
} from "#engine/types";

describe("Tier 1 Pure Statutory Deadlines & Diagnostic Notifications", () => {
  it("computes exact chronological German statutory deadlines for due date 28.06.2027 with optimal tax switch and Dec 28 return", () => {
    const result = evaluateStatutoryDeadlinesFormula({
      childIndex: 1,
      expectedDueDate: toIsoCalendarDate("2027-06-28"),
      taxSwitchIntoEffectiveDate: toIsoCalendarDate("2026-10-01"),
      taxSwitchRevertEffectiveDate: toIsoCalendarDate("2027-05-01"),
      motherReturnToWorkDate: toIsoCalendarDate("2027-12-28"),
      motherBasisLifeMonthsCount: 6,
      fatherPartnerMonthsCount: 2,
      fatherElternzeitStartDate: toIsoCalendarDate("2027-06-28"),
      motherAnnualVacationDays: 30,
      motherVacationDaysTakenPreLeave: 0,
    });

    assert.equal(result.mutterschutzStart, "2027-05-17");
    assert.equal(result.mutterschutzEnd, "2027-08-23");
    assert.equal(result.firstElternzeitDay, "2027-08-24");
    assert.equal(result.assessmentWindowStart, "2026-05-01");
    assert.equal(result.assessmentWindowEnd, "2027-04-30");

    // Deadlines must be sorted chronologically by targetDate
    for (let i = 1; i < result.deadlines.length; i++) {
      assert.ok(result.deadlines[i - 1].targetDate <= result.deadlines[i].targetDate);
    }

    // Tax switch IN (Oct 2026 -> 7 months inside May 2026..Apr 2027) is Optimal
    const taxIn = result.deadlines.find((d) => d.deadlineId === "DL-C1-TAX-IN");
    assert.equal(taxIn?.severity, StatutoryDeadlineSeverity.Optimal);

    // Tax switch BACK (May 2027 -> after Apr 2027 closes) is Optimal
    const taxRev = result.deadlines.find((d) => d.deadlineId === "DL-C1-TAX-REVERT");
    assert.equal(taxRev?.severity, StatutoryDeadlineSeverity.Optimal);

    // Mother Elternzeit notice deadline: 7 weeks before 24.08.2027 = 06.07.2027 (tight 1-week post-birth window)
    const motherEz = result.deadlines.find((d) => d.deadlineId === "DL-C1-MOTHER-EZ");
    assert.equal(motherEz?.targetDate, "2027-07-06");

    // Father Elternzeit notice window: 8..7 weeks before 28.06.2027 = 03.05..10.05.2027
    const fatherEz = result.deadlines.find((d) => d.deadlineId === "DL-C1-FATHER-EZ");
    assert.equal(fatherEz?.windowStartDate, "2027-05-03");
    assert.equal(fatherEz?.windowEndDate, "2027-05-10");

    // Working hours return notice: 7 weeks before 28.12.2027 = 09.11.2027 (no Life-Month overlap warning)
    const workHours = result.deadlines.find((d) => d.deadlineId === "DL-C1-WORK-HOURS");
    assert.equal(workHours?.severity, StatutoryDeadlineSeverity.ActionNeeded);
    assert.equal(workHours?.targetDate, "2027-11-09");
  });

  it("raises explicit Warnings for too-early tax revert (April 2027), Dec 24 Life-Month overlap, and Dec 31 month-end vacation trap", () => {
    const warningsResult = evaluateStatutoryDeadlinesFormula({
      childIndex: 1,
      expectedDueDate: toIsoCalendarDate("2027-06-28"),
      taxSwitchIntoEffectiveDate: toIsoCalendarDate("2027-01-01"), // Only 4 months in Class III!
      taxSwitchRevertEffectiveDate: toIsoCalendarDate("2027-04-01"), // Damages April MuSchG reference month!
      motherReturnToWorkDate: toIsoCalendarDate("2027-12-24"), // Overlaps LM 6 (28.11..27.12)!
      motherBasisLifeMonthsCount: 6,
      motherAnnualVacationDays: 30,
    });

    assert.equal(
      warningsResult.deadlines.find((d) => d.deadlineId === "DL-C1-TAX-IN")?.severity,
      StatutoryDeadlineSeverity.Warning,
    );
    assert.equal(
      warningsResult.deadlines.find((d) => d.deadlineId === "DL-C1-TAX-REVERT")?.severity,
      StatutoryDeadlineSeverity.Warning,
    );
    const workHours = warningsResult.deadlines.find((d) => d.deadlineId === "DL-C1-WORK-HOURS");
    assert.equal(workHours?.severity, StatutoryDeadlineSeverity.Warning);
    assert.ok(workHours?.summary.includes("28.12.2027"));

    // Separate check for Dec 31 month-end vacation trap (returning 01.01.2028)
    const trapResult = evaluateStatutoryDeadlinesFormula({
      childIndex: 1,
      expectedDueDate: toIsoCalendarDate("2027-06-28"),
      motherReturnToWorkDate: toIsoCalendarDate("2028-01-01"),
      motherBasisLifeMonthsCount: 6,
      motherAnnualVacationDays: 30,
    });
    const vacWarn = trapResult.deadlines.find((d) => d.category === StatutoryDeadlineCategory.Vacation);
    assert.equal(vacWarn?.severity, StatutoryDeadlineSeverity.Warning);
    assert.ok(vacWarn?.title.includes("+2.5"));
  });
});
