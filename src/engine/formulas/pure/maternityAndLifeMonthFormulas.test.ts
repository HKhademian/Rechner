import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  addCalendarDays,
  addCalendarMonthsClamped,
  checkReturnDateLifeMonthOverlapFormula,
  daysInCalendarMonth,
  evaluateBeegMotherAssessmentWindowFormula,
  evaluateElterngeldLifeMonthFormula,
  evaluateMutterschutzMonthlyPayFormula,
  evaluateMutterschutzWindowFormula,
  listFullCalendarMonthsInsideInterval,
} from "#engine/formulas/pure/maternityAndLifeMonthFormulas";
import {
  formatGermanDate,
  isIsoCalendarDate,
  toEuroAmount,
  toIsoCalendarDate,
} from "#engine/types";

describe("Tier 1 Pure Date, Mutterschutz & BEEG Life-Month Formulas", () => {
  it("validates real Gregorian ISO dates and clamps month-end transitions per § 187/188 BGB", () => {
    assert.equal(isIsoCalendarDate("2027-06-28"), true);
    assert.equal(isIsoCalendarDate("2028-02-29"), true); // leap year
    assert.equal(isIsoCalendarDate("2027-02-29"), false); // non-leap year
    assert.equal(isIsoCalendarDate("2027-04-31"), false);
    assert.throws(() => toIsoCalendarDate("2027-02-29"), TypeError);

    assert.equal(formatGermanDate(toIsoCalendarDate("2027-06-28")), "28.06.2027");
    assert.equal(daysInCalendarMonth(2027, 2), 28);
    assert.equal(daysInCalendarMonth(2028, 2), 29);
    assert.equal(addCalendarDays(toIsoCalendarDate("2027-06-28"), -42), "2027-05-17");
    assert.equal(addCalendarMonthsClamped(toIsoCalendarDate("2027-01-31"), 1), "2027-02-28");
    assert.equal(addCalendarMonthsClamped(toIsoCalendarDate("2028-01-31"), 1), "2028-02-29");
  });

  it("computes exact Mutterschutz 42d+56d window, 3-month MuSchG reference, and partial-month proration for 28.06.2027", () => {
    const win = evaluateMutterschutzWindowFormula({
      expectedDueDate: toIsoCalendarDate("2027-06-28"),
    });

    assert.equal(win.preBirthStart, "2027-05-17");
    assert.equal(win.postBirthEnd, "2027-08-23");
    assert.equal(win.firstElternzeitDay, "2027-08-24");
    assert.equal(win.totalProtectedDays, 99); // 42 pre + birth day + 56 post

    // § 20 Abs. 1 Satz 2 MuSchG: 3 completed calendar months strictly before May 2027
    assert.deepEqual(
      win.threeMonthReferenceMonths.map((m) => m.monthId),
      ["M02.2027", "M03.2027", "M04.2027"],
    );

    // Exact calendar-month overlaps: May 15/31, June 30/30, July 31/31, Aug 23/31
    assert.deepEqual(
      win.monthlyBreakdown.map((m) => ({
        monthId: m.monthId,
        days: m.overlapDays,
        total: m.totalDaysInMonth,
      })),
      [
        { monthId: "M05.2027",
          days: 15,
          total: 31 },
        { monthId: "M06.2027",
          days: 30,
          total: 30 },
        { monthId: "M07.2027",
          days: 31,
          total: 31 },
        { monthId: "M08.2027",
          days: 23,
          total: 31 },
      ],
    );

    // Prorated Mutterschutz pay in May 2027 (15/31 of €3,100 = €1,500; GKV = 15*€13 = €195; Employer = €1,305)
    const mayPay = evaluateMutterschutzMonthlyPayFormula({
      referenceMonthlyNet: toEuroAmount(3100),
      mutterschutzDaysInMonth: 15,
      totalDaysInMonth: 31,
    });
    assert.equal(mayPay.totalMonthlyBenefit, 1500);
    assert.equal(mayPay.gkvShare, 195);
    assert.equal(mayPay.employerSupplement, 1305);

    // Multiples / premature birth extends post-birth Mutterschutz to 84 days (+4 weeks)
    const twinsWin = evaluateMutterschutzWindowFormula({
      expectedDueDate: toIsoCalendarDate("2027-06-28"),
      isMultipleOrPrematureBirth: true,
    });
    assert.equal(twinsWin.postBirthDays, 84);
    assert.equal(twinsWin.postBirthEnd, "2027-09-20");
    assert.equal(twinsWin.firstElternzeitDay, "2027-09-21");
  });

  it("computes exact BEEG Life Months, 12-month pre-Mutterschutz window, and detects Dec 24 vs Dec 28 return trap", () => {
    const dueDate = toIsoCalendarDate("2027-06-28");

    // § 2b Abs. 1 BEEG: May 2027 has 15 Mutterschutz days -> excluded! Window = 05.2026..04.2027
    const window12 = evaluateBeegMotherAssessmentWindowFormula(dueDate);
    assert.equal(window12.length, 12);
    assert.equal(window12[0].monthId, "M05.2026");
    assert.equal(window12[11].monthId, "M04.2027");

    // Life Month 1: 28.06.2027..27.07.2027; Life Month 6: 28.11.2027..27.12.2027; Life Month 7: 28.12.2027..27.01.2028
    const lm1 = evaluateElterngeldLifeMonthFormula(dueDate, 1);
    assert.equal(lm1.startDate, "2027-06-28");
    assert.equal(lm1.endDate, "2027-07-27");

    const lm6 = evaluateElterngeldLifeMonthFormula(dueDate, 6);
    assert.equal(lm6.startDate, "2027-11-28");
    assert.equal(lm6.endDate, "2027-12-27");

    const lm7 = evaluateElterngeldLifeMonthFormula(dueDate, 7);
    assert.equal(lm7.startDate, "2027-12-28");
    assert.equal(lm7.endDate, "2028-01-27");

    // Returning 24.12.2027 overlaps Life Month 6 by 4 days -> suggests 28.12.2027
    const trapCheck = checkReturnDateLifeMonthOverlapFormula(
      dueDate,
      toIsoCalendarDate("2027-12-24"),
      6,
    );
    assert.equal(trapCheck.overlapsActiveBasisLifeMonth, true);
    assert.equal(trapCheck.overlappedLifeMonth?.lifeMonthNumber, 6);
    assert.equal(trapCheck.overlapDaysInLifeMonth, 4);
    assert.equal(trapCheck.suggestedSafeReturnDate, "2027-12-28");

    // Returning 28.12.2027 has zero overlap with LM 1..6!
    const safeCheck = checkReturnDateLifeMonthOverlapFormula(
      dueDate,
      toIsoCalendarDate("2027-12-28"),
      6,
    );
    assert.equal(safeCheck.overlapsActiveBasisLifeMonth, false);
    assert.equal(safeCheck.overlapDaysInLifeMonth, 0);

    // Full calendar months strictly inside 24.08.2027..27.12.2027 -> Sep, Oct, Nov only (3 months, NOT Aug or Dec!)
    const fullMonths = listFullCalendarMonthsInsideInterval(
      toIsoCalendarDate("2027-08-24"),
      toIsoCalendarDate("2027-12-27"),
    );
    assert.deepEqual(
      fullMonths.map((m) => m.monthId),
      ["M09.2027", "M10.2027", "M11.2027"],
    );
  });
});
