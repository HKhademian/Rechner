import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTransaction } from '../../../src/engine/ledger/transaction.ts';
import { buildMonthlyLedgerEntry } from '../../../src/engine/ledger/ledger.ts';
import {
  toSimulationMonth,
  toCalendarYear,
  toCalendarMonth,
  toEuroAmount,
  TransactionType,
  TransactionDirection
} from '../../../src/engine/types.ts';

describe('Atomic Ledger & Transaction Integrity Engine', () => {
  describe('createTransaction', () => {
    it('creates immutable, validly branded transaction records', () => {
      const tx = createTransaction({
        id: 'TX-M1-TEST',
        month: toSimulationMonth(1),
        year: toCalendarYear(1),
        type: TransactionType.SalaryBase,
        direction: TransactionDirection.Inflow,
        amount: toEuroAmount(2895),
        statutoryCitation: '§ 19 EStG',
        taxClassLabel: 'H: III',
        description: 'Husband salary',
        auditTrail: 'Monthly net salary'
      });

      assert.equal(tx.id, 'TX-M1-TEST');
      assert.equal(tx.amount, 2895);
      assert.equal(tx.statutoryCitation, '§ 19 EStG');
    });
  });

  describe('buildMonthlyLedgerEntry - Conservation of Balance Audit', () => {
    it('maintains strict accounting equality: MonthlyTotal == RegularTotal + SpecialEventsTotal', () => {
      for (let m = 1; m <= 60; m++) {
        const sMonth = toSimulationMonth(m);
        const cy = toCalendarYear(Math.ceil(m / 12));
        const cm = toCalendarMonth(((m - 1) % 12) + 1);

        const hSalary = toEuroAmount(4000);
        const wSalary = toEuroAmount(2000);
        const bonus40 = cm === 5 ? toEuroAmount(1600) : toEuroAmount(0);
        const bonus60 = cm === 11 ? toEuroAmount(2400) : toEuroAmount(0);
        const taxRefund = cm === 3 ? toEuroAmount(850) : toEuroAmount(0);

        const { entry } = buildMonthlyLedgerEntry(
          {
            month: sMonth,
            year: cy,
            monthInYear: cm,
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
            taxClassLabel: 'III/V',
            phaseLabel: 'Test',
            eventTag: null,
            eventType: null,
            isSwapActive: false,
            isMutterschutz: false,
            isPartnerschaftsbonus: false,
            hasSiblingBonus: false,
            transactions: []
          },
          0,
          0,
          0,
          0
        );

        const expectedRegular = 4000 + 2000 + 259;
        const expectedSpecial = (bonus40 as number) + (bonus60 as number) + (taxRefund as number);
        const expectedTotal = expectedRegular + expectedSpecial;

        assert.equal(entry.regularMonthlyTotal, expectedRegular);
        assert.equal(entry.specialEventsTotal, expectedSpecial);
        assert.equal(entry.monthlyTotal, expectedTotal);
      }
    });
  });
});
