import {
  describe, it, 
} from "node:test";
import assert from "node:assert/strict";
import {
  createTransaction, 
} from "#engine/ledger/transaction";
import {
  buildMonthlyLedgerEntry, 
} from "#engine/ledger/ledger";
import {
  toSimulationMonth,
  toCalendarYear,
  toFullCalendarYear,
  toCalendarMonth,
  toMonthId,
  toMonthRef,
  toEuroAmount,
  TransactionType,
  TransactionDirection,
} from "#engine/types";

describe("Atomic Ledger & Transaction Integrity Engine", () => {
  describe("createTransaction", () => {
    it("creates immutable, validly branded transaction records", () => {
      const tx = createTransaction({
        transactionId: "TX-M01.2026-TEST",
        monthId: toMonthId(1, 2026),
        month: toSimulationMonth(1),
        year: toCalendarYear(1),
        type: TransactionType.SalaryBase,
        direction: TransactionDirection.Inflow,
        amount: toEuroAmount(2895),
        statutoryCitation: "§ 19 EStG",
        taxClassLabel: "H: III",
        description: "Husband salary",
        auditTrail: "Monthly net salary",
      });

      assert.equal(tx.transactionId, "TX-M01.2026-TEST");
      assert.equal(tx.monthId, "M01.2026");
      assert.equal(tx.amount, 2895);
      assert.equal(tx.statutoryCitation, "§ 19 EStG");
    });
  });

  describe("buildMonthlyLedgerEntry - Conservation of Balance Audit", () => {
    it("maintains strict accounting equality: MonthlyTotal == RegularTotal + SpecialEventsTotal", () => {
      for (let m = 1; m <= 60; m++) {
        const sMonth = toSimulationMonth(m);
        const cy = toCalendarYear(Math.ceil(m / 12));
        const cm = toCalendarMonth(((m - 1) % 12) + 1);
        const calYearNum = 2026 + cy - 1;
        const mId = toMonthId(cm, calYearNum);

        const hSalary = toEuroAmount(4000);
        const wSalary = toEuroAmount(2000);
        const bonus40 = cm === 5 ? toEuroAmount(1600) : toEuroAmount(0);
        const bonus60 = cm === 11 ? toEuroAmount(2400) : toEuroAmount(0);
        const taxRefund = cm === 3 ? toEuroAmount(850) : toEuroAmount(0);

        const { entry } = buildMonthlyLedgerEntry(
          {
            monthId: mId,
            month: sMonth,
            year: cy,
            monthInYear: cm,
            calendarYearNum: calYearNum,
            calendarMonthNum: cm,
            calendarLabel: `M${sMonth}`,
            relativeBirthLabel: `M${sMonth}`,
            relativeMonthLabel: `M${sMonth}`,
            relativeMonthIndex: m,
            husbandSalary: hSalary,
            wifeSalary: wSalary,
            mutterschutz: toEuroAmount(0),
            wifeElterngeld: toEuroAmount(0),
            husbandElterngeld: toEuroAmount(0),
            kindergeld: toEuroAmount(259),
            taxRefund,
            bonus40Amount: bonus40,
            bonus60Amount: bonus60,
            specialEvents: [],
            taxClassLabel: "III/V",
            phaseLabel: "Test",
            eventTag: null,
            eventType: null,
            isSwapActive: false,
            isMutterschutz: false,
            isPartnerschaftsbonus: false,
            hasSiblingBonus: false,
            transactions: [],
          },
          0,
          0,
          0,
          0,
        );

        const expectedRegular = 4000 + 2000 + 259;
        const expectedSpecial =
          bonus40 + bonus60 + taxRefund;
        const expectedTotal = expectedRegular + expectedSpecial;

        assert.equal(entry.monthId, mId);
        assert.equal(entry.monthRef, `M${sMonth}`);
        assert.equal(entry.regularMonthlyTotal, expectedRegular);
        assert.equal(entry.specialEventsTotal, expectedSpecial);
        assert.equal(entry.monthlyTotal, expectedTotal);
      }
    });

    it("correctly handles costing/expense events (negative amounts) reducing monthlyTotal and cumulatedTotal", () => {
      const sMonth = toSimulationMonth(17);
      const cy = toCalendarYear(2);
      const cm = toCalendarMonth(5);
      const mId = toMonthId(5, 2027);

      const hSalary = toEuroAmount(2895);
      const wSalary = toEuroAmount(0);
      const mutterschutz = toEuroAmount(2603);
      const kindergeld = toEuroAmount(259);

      // One-off baby equipment cost (-1500 €)
      const costEvent = {
        eventId: "EVENT-M05.2027-EQUIPMENT" as any,
        monthId: mId,
        monthRef: toMonthRef("M9 (Birth 1)"),
        month: sMonth,
        year: cy,
        calendarYearNum: toFullCalendarYear(2027),
        calendarMonthNum: cm,
        calendarLabel: "05.2027",
        relativeBirthLabel: "M9 (Birth 1)",
        relativeMonthLabel: toMonthRef("M9 (Birth 1)"),
        type: "custom_cost" as any,
        title: "Child #1 Initial Equipment",
        category: "Baby Equipment (*Erstausstattung*)" as any,
        statutory: "Out-of-Pocket Expense" as any,
        taxClassLabel: "H: V | W: III",
        amount: toEuroAmount(-1500),
        description: "Baby nursery and stroller",
      };

      const { entry, nextCumulatedTotal } = buildMonthlyLedgerEntry(
        {
          monthId: mId,
          monthRef: toMonthRef("M9 (Birth 1)"),
          month: sMonth,
          year: cy,
          monthInYear: cm,
          calendarYearNum: toFullCalendarYear(2027),
          calendarMonthNum: cm,
          calendarLabel: "05.2027",
          relativeBirthLabel: "M9 (Birth 1)",
          relativeMonthLabel: toMonthRef("M9 (Birth 1)"),
          husbandSalary: hSalary,
          wifeSalary: wSalary,
          mutterschutz,
          wifeElterngeld: toEuroAmount(0),
          husbandElterngeld: toEuroAmount(0),
          kindergeld,
          taxRefund: toEuroAmount(0),
          bonus40Amount: toEuroAmount(0),
          bonus60Amount: toEuroAmount(0),
          specialEvents: [costEvent],
          taxClassLabel: "H: V | W: III",
          phaseLabel: "Post-Birth Mutterschutz",
          eventTag: null,
          eventType: null,
          isSwapActive: true,
          isMutterschutz: true,
          isPartnerschaftsbonus: false,
          hasSiblingBonus: false,
          transactions: [],
        },
        60850,
        0,
        0,
        60850,
      );

      const regularTotal = 2895 + 2603 + 259; // 5738 €
      const expectedSpecial = -1500;
      const expectedMonthly = regularTotal - 1500; // 4238 €

      assert.equal(entry.monthId, "M05.2027");
      assert.equal(entry.monthSimRef, "Sim17");
      assert.equal(entry.regularMonthlyTotal, regularTotal);
      assert.equal(entry.specialEventsTotal, expectedSpecial);
      assert.equal(entry.monthlyTotal, expectedMonthly);
      assert.equal(nextCumulatedTotal, 60850 + expectedMonthly);
      assert.equal(entry.cumulatedTotal, 60850 + expectedMonthly);
    });

    it("correctly handles generating/inflow events (positive amounts) increasing monthlyTotal and cumulatedTotal", () => {
      const sMonth = toSimulationMonth(12);
      const cy = toCalendarYear(1);
      const cm = toCalendarMonth(12);
      const mId = toMonthId(12, 2026);

      const hSalary = toEuroAmount(2895);
      const wSalary = toEuroAmount(1975);
      const kindergeld = toEuroAmount(0);

      // One-off bonus grant (+2000 €)
      const grantEvent = {
        eventId: "EVENT-M12.2026-GRANT" as any,
        monthId: mId,
        monthRef: toMonthRef("M-5"),
        month: sMonth,
        year: cy,
        calendarYearNum: toFullCalendarYear(2026),
        calendarMonthNum: cm,
        calendarLabel: "04.2026",
        relativeBirthLabel: "M-5",
        relativeMonthLabel: toMonthRef("M-5"),
        type: "custom_income" as any,
        title: "Employer Grant",
        category: "Career Bonus / Extra Income" as any,
        statutory: "Voluntary Benefit" as any,
        taxClassLabel: "H: III | W: V",
        amount: toEuroAmount(2000),
        description: "Family bonus grant",
      };

      const { entry, nextCumulatedTotal } = buildMonthlyLedgerEntry(
        {
          monthId: mId,
          monthRef: toMonthRef("M-5"),
          month: sMonth,
          year: cy,
          monthInYear: cm,
          calendarYearNum: toFullCalendarYear(2026),
          calendarMonthNum: cm,
          calendarLabel: "12.2026",
          relativeBirthLabel: "M-5",
          relativeMonthLabel: toMonthRef("M-5"),
          husbandSalary: hSalary,
          wifeSalary: wSalary,
          mutterschutz: toEuroAmount(0),
          wifeElterngeld: toEuroAmount(0),
          husbandElterngeld: toEuroAmount(0),
          kindergeld,
          taxRefund: toEuroAmount(0),
          bonus40Amount: toEuroAmount(0),
          bonus60Amount: toEuroAmount(0),
          specialEvents: [grantEvent],
          taxClassLabel: "H: III | W: V",
          phaseLabel: "Pre-Pregnancy Planning",
          eventTag: null,
          eventType: null,
          isSwapActive: false,
          isMutterschutz: false,
          isPartnerschaftsbonus: false,
          hasSiblingBonus: false,
          transactions: [],
        },
        60000,
        0,
        0,
        60000,
      );

      const regularTotal = 2895 + 1975; // 6125 €
      const expectedSpecial = 2000;
      const expectedMonthly = regularTotal + expectedSpecial; // 6935 €

      assert.equal(entry.monthId, "M12.2026");
      assert.equal(entry.monthSimRef, "Sim12");
      assert.equal(entry.regularMonthlyTotal, regularTotal);
      assert.equal(entry.specialEventsTotal, expectedSpecial);
      assert.equal(entry.monthlyTotal, expectedMonthly);
      assert.equal(nextCumulatedTotal, 60000 + expectedMonthly);
      assert.equal(entry.cumulatedTotal, 60000 + expectedMonthly);
    });
  });
});
