import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toSimulationMonth,
  toCalendarYear,
  toCalendarMonth,
  toWorkingHours,
  toEuroAmount,
  toEuroCents,
  toGrossSalary,
  toNetSalary,
  toStatutoryCitation,
  toTransactionId
} from '../../src/engine/types.ts';

describe('Strongly-Typed Domain Types & Constructors', () => {
  describe('toSimulationMonth', () => {
    it('accepts valid simulation months between 1 and 120', () => {
      for (let m = 1; m <= 120; m++) {
        const sm = toSimulationMonth(m);
        assert.equal(sm, m);
      }
    });

    it('rejects out-of-bound or non-integer months', () => {
      assert.throws(() => toSimulationMonth(0), TypeError);
      assert.throws(() => toSimulationMonth(-5), TypeError);
      assert.throws(() => toSimulationMonth(121), TypeError);
      assert.throws(() => toSimulationMonth(1.5), TypeError);
      assert.throws(() => toSimulationMonth(NaN), TypeError);
    });
  });

  describe('toCalendarYear', () => {
    it('accepts valid calendar years 1 to 10', () => {
      for (let y = 1; y <= 10; y++) {
        const cy = toCalendarYear(y);
        assert.equal(cy, y);
      }
    });

    it('rejects invalid calendar years', () => {
      assert.throws(() => toCalendarYear(0), TypeError);
      assert.throws(() => toCalendarYear(11), TypeError);
      assert.throws(() => toCalendarYear(2.5), TypeError);
    });
  });

  describe('toCalendarMonth', () => {
    it('accepts valid calendar months 1 to 12', () => {
      for (let m = 1; m <= 12; m++) {
        const cm = toCalendarMonth(m);
        assert.equal(cm, m);
      }
    });

    it('rejects invalid calendar months', () => {
      assert.throws(() => toCalendarMonth(0), TypeError);
      assert.throws(() => toCalendarMonth(13), TypeError);
      assert.throws(() => toCalendarMonth(-1), TypeError);
    });
  });

  describe('toWorkingHours', () => {
    it('accepts valid working hours 0 to 60', () => {
      const validHours = [0, 10, 20, 24, 28, 30, 32, 35, 38.5, 40, 48, 60];
      for (const h of validHours) {
        const wh = toWorkingHours(h);
        assert.equal(wh, h);
      }
    });

    it('rejects invalid working hours', () => {
      assert.throws(() => toWorkingHours(-1), TypeError);
      assert.throws(() => toWorkingHours(61), TypeError);
    });
  });

  describe('toEuroAmount and toEuroCents', () => {
    it('rounds and brands EuroAmount properly', () => {
      assert.equal(toEuroAmount(100.4), 100);
      assert.equal(toEuroAmount(100.5), 101);
      assert.equal(toEuroAmount(0), 0);
      assert.equal(toEuroAmount(-50), -50);
    });

    it('brands integer EuroCents properly', () => {
      assert.equal(toEuroCents(10050), 10050);
      assert.equal(toEuroCents(0), 0);
      assert.throws(() => toEuroCents(10.5), TypeError);
    });
  });

  describe('toGrossSalary and toNetSalary', () => {
    it('brands non-negative gross and net salaries', () => {
      for (let s = 0; s <= 10000; s += 500) {
        assert.equal(toGrossSalary(s), s);
        assert.equal(toNetSalary(s), s);
      }
    });

    it('rejects negative salaries', () => {
      assert.throws(() => toGrossSalary(-100), TypeError);
      assert.throws(() => toNetSalary(-50), TypeError);
    });
  });

  describe('toStatutoryCitation and toTransactionId', () => {
    it('brands valid statutory citation strings', () => {
      const citations = [
        'EStG § 32a',
        'EStG § 26b',
        'BEEG § 2b',
        'BEEG § 4a',
        'BEEG § 2a',
        'MuSchG § 19',
        'MuSchG § 20',
        'EStG § 66'
      ];
      for (const c of citations) {
        assert.equal(toStatutoryCitation(c), c);
      }
    });

    it('rejects empty or non-string citations and IDs', () => {
      assert.throws(() => toStatutoryCitation(''), TypeError);
      assert.throws(() => toTransactionId(''), TypeError);
    });
  });
});
