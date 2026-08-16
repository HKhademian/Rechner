import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeStatutoryReplacementRate,
  computeElterngeldBenefits
} from '#engine/benefits/elterngeldPlus';
import { toNetSalary } from '#engine/types';

describe('Elterngeld & ElterngeldPlus Calculation Engine (BEEG § 2, § 4, § 4a)', () => {
  describe('computeStatutoryReplacementRate - Sliding Replacement Scale (§ 2 BEEG)', () => {
    it('applies 65% replacement rate for net incomes > 1.240 €', () => {
      for (let net = 1240; net <= 6000; net += 200) {
        const rate = computeStatutoryReplacementRate(toNetSalary(net));
        assert.equal(rate, 0.65, `Rate must be 0.65 for net ${net} €`);
      }
    });

    it('applies 67% replacement rate for net incomes between 1.000 € and 1.200 €', () => {
      for (let net = 1000; net <= 1200; net += 50) {
        const rate = computeStatutoryReplacementRate(toNetSalary(net));
        assert.equal(rate, 0.67, `Rate must be 0.67 for net ${net} €`);
      }
    });

    it('scales up replacement rate from 67% towards 100% for low incomes (< 1.000 €)', () => {
      let previousRate = 0.67;
      for (let net = 950; net >= 300; net -= 100) {
        const rate = computeStatutoryReplacementRate(toNetSalary(net));
        assert.ok(rate > previousRate, `Rate must increase as income drops: at ${net} € rate is ${rate}`);
        assert.ok(rate <= 1.00, `Rate must not exceed 100% at ${net} €`);
        previousRate = rate;
      }
    });
  });

  describe('computeElterngeldBenefits - Basiselterngeld & ElterngeldPlus Caps & Floors', () => {
    it('caps Basiselterngeld at statutory maximum €1.800/month', () => {
      const highEarners = [3000, 3000, 4000, 5000];
      for (const preNet of highEarners) {
        const benefit = computeElterngeldBenefits(toNetSalary(preNet), toNetSalary(0));
        assert.equal(benefit.basiselterngeld, 1800);
      }
    });

    it('caps ElterngeldPlus at statutory maximum €900/month', () => {
      // Synthetic Class III Case: Pre-birth €2.603, Part-time €1.328 -> Delta €1.490 -> 65% = €968.50 -> Capped at €900
      const benefit = computeElterngeldBenefits(toNetSalary(2603), toNetSalary(1328));
      assert.equal(benefit.elterngeldPlus, 900);
      assert.equal(benefit.isMaxCapped, true);
    });

    it('applies statutory minimum floor of €150/month for ElterngeldPlus (§ 4a BEEG)', () => {
      // Minimal income loss case
      const benefit = computeElterngeldBenefits(toNetSalary(1500), toNetSalary(1400));
      assert.equal(benefit.elterngeldPlus, 150);
      assert.equal(benefit.isMinFloorApplied, true);
    });

    it('computes exact benefit for unoptimized Scenario B', () => {
      // Scenario B: Pre-birth Class V FT €1.975, Part-time Class V €1.328 -> Delta €770 -> 65% = €500.50 -> €501
      const benefit = computeElterngeldBenefits(toNetSalary(1975), toNetSalary(1328));
      assert.equal(benefit.elterngeldPlus, 501);
      assert.equal(benefit.isMaxCapped, false);
      assert.equal(benefit.isMinFloorApplied, false);
    });
  });
});
