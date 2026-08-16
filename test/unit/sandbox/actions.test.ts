import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runScenarioBatches } from '#engine/simulator/timelineGenerator';
import {
  TaxClass,
  ScenarioId,
  toNetSalary,
  toEuroAmount,
  toSimulationMonth,
  toCalendarMonth,
  type PreexistingConditions,
  type PregnancyAction,
  type TaxClassSwitchAction,
  type SalaryRaiseAction
} from '#engine/types';

describe('Sandbox Unit Tests: Discrete Actions (Batches 1, 2, 3)', () => {
  const basePreexisting: PreexistingConditions = {
    startCalendarYear: 2026,
    startCalendarMonth: toCalendarMonth(1),
    simulationDurationMonths: 60,
    husbandInitialTaxClass: TaxClass.III,
    husbandInitialNet: toNetSalary(2895),
    husbandInitialClass5Net: toNetSalary(2191),
    husbandWeeklyHours: toEuroAmount(32) as unknown as import('#engine/types').WorkingHours,
    wifeInitialTaxClass: TaxClass.V,
    wifeInitialFullTimeNet: toNetSalary(1975),
    wifeInitialClass3FullTimeNet: toNetSalary(2603),
    wifeInitialPartTimeClass5Net: toNetSalary(1328),
    wifeInitialPartTimeClass3Net: toNetSalary(1648),
    wifeWeeklyHours: toEuroAmount(40) as unknown as import('#engine/types').WorkingHours,
    existingChildrenCount: 0,
    kindergeldPerChild: toEuroAmount(259),
    enable13thSalary: true,
    bonus40Month: toCalendarMonth(5),
    bonus60Month: toCalendarMonth(11),
    taxReturnMonth: toCalendarMonth(3)
  };

  describe('Batch 1: Pregnancy Positive Decisions & Life Milestones', () => {
    it('accurately triggers Mutterschutz window 6 weeks pre-birth to 8 weeks post-birth', () => {
      const pregnancies: PregnancyAction[] = [
        {
          pregnancyId: 'PREG-1',
          childIndex: 1,
          positiveTestCalendarMonth: toCalendarMonth(4),
          positiveTestCalendarYear: 2026,
          positiveTestSimulationMonth: toSimulationMonth(4),
          calculatedDeliverySimulationMonth: toSimulationMonth(12),
          motherPostBirthPartTimeHours: toEuroAmount(24) as unknown as import('#engine/types').WorkingHours,
          motherPostBirthPartTimeClass5Net: toNetSalary(1328),
          motherPostBirthPartTimeClass3Net: toNetSalary(1648),
          fatherPartnerMonthsCount: 4
        }
      ];

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.B,
        preexisting: basePreexisting,
        pregnancies,
        taxClassSwitches: [],
        salaryRaises: []
      });

      // Mutterschutz months: M11 (pre-birth), M12 (delivery), M13 (post-birth)
      [11, 12, 13].forEach((mIdx) => {
        const m = res.months[mIdx - 1];
        assert.equal(m.isMutterschutz, true, `Month ${mIdx} must be in Mutterschutz`);
        assert.equal(m.mutterschutz, 1975, `Month ${mIdx} Mutterschutz in Scenario B must equal Class V FT Net`);
        assert.equal(m.wifeSalary, 0, `Wife working salary during Mutterschutz must be 0`);
      });

      // M14 onwards: ElterngeldPlus active
      const m14 = res.months[13];
      assert.equal(m14.isMutterschutz, false);
      assert.equal(m14.wifeSalary, 1328);
      assert.equal(m14.wifeElterngeld, 501);
    });

    it('validates Sibling Bonus (+10%) eligibility for spacing < 36 months vs expiration at >= 36 months', () => {
      const testCases = [
        { spacing: 18, expectBonus: true }, // b2 = 30, EG starts M32 -> Child 1 is 20M (<36)
        { spacing: 24, expectBonus: true }, // b2 = 36, EG starts M38 -> Child 1 is 26M (<36)
        { spacing: 27, expectBonus: true }, // b2 = 39, EG starts M41 -> Child 1 is 29M (<36)
        { spacing: 33, expectBonus: true }, // b2 = 45, EG starts M47 -> Child 1 is 35M (<36)
        { spacing: 34, expectBonus: false }, // b2 = 46, EG starts M48 -> Child 1 is 36M (=36, expired)
        { spacing: 36, expectBonus: false }, // b2 = 48, EG starts M50 -> Child 1 is 38M (>36)
        { spacing: 40, expectBonus: false }
      ];

      for (const tc of testCases) {
        const b1 = 12;
        const b2 = b1 + tc.spacing;

        const pregnancies: PregnancyAction[] = [
          {
            pregnancyId: 'PREG-1',
            childIndex: 1,
            positiveTestCalendarMonth: toCalendarMonth(4),
            positiveTestCalendarYear: 2026,
            positiveTestSimulationMonth: toSimulationMonth(4),
            calculatedDeliverySimulationMonth: toSimulationMonth(b1),
            motherPostBirthPartTimeHours: toEuroAmount(24) as unknown as import('#engine/types').WorkingHours,
            motherPostBirthPartTimeClass5Net: toNetSalary(1328),
            motherPostBirthPartTimeClass3Net: toNetSalary(1648),
            fatherPartnerMonthsCount: 4
          },
          {
            pregnancyId: 'PREG-2',
            childIndex: 2,
            positiveTestCalendarMonth: toCalendarMonth(1),
            positiveTestCalendarYear: 2028,
            positiveTestSimulationMonth: toSimulationMonth(b2 - 8),
            calculatedDeliverySimulationMonth: toSimulationMonth(b2),
            motherPostBirthPartTimeHours: toEuroAmount(24) as unknown as import('#engine/types').WorkingHours,
            motherPostBirthPartTimeClass5Net: toNetSalary(1328),
            motherPostBirthPartTimeClass3Net: toNetSalary(1648),
            fatherPartnerMonthsCount: 4
          }
        ];

        const res = runScenarioBatches({
          scenarioKey: ScenarioId.C,
          preexisting: { ...basePreexisting, simulationDurationMonths: 72 },
          pregnancies,
          taxClassSwitches: [],
          salaryRaises: []
        });

        // Check first month of Child 2 Elterngeld (b2 + 2)
        const child2EgFirstMonth = res.months[b2 + 1];
        if (tc.expectBonus) {
          assert.equal(
            child2EgFirstMonth.hasSiblingBonus,
            true,
            `Spacing ${tc.spacing}M must qualify for Sibling Bonus at Month ${b2 + 2}`
          );
        } else {
          assert.equal(
            child2EgFirstMonth.hasSiblingBonus,
            false,
            `Spacing ${tc.spacing}M must NOT qualify for Sibling Bonus at Month ${b2 + 2}`
          );
        }
      }
    });
  });

  describe('Batch 2: Tax Class Switch Actions (§ 2b BEEG & § 26b EStG)', () => {
    it('accurately activates Tax Class III for Wife and Class V for Husband during swap window', () => {
      const pregnancies: PregnancyAction[] = [
        {
          pregnancyId: 'PREG-1',
          childIndex: 1,
          positiveTestCalendarMonth: toCalendarMonth(4),
          positiveTestCalendarYear: 2026,
          positiveTestSimulationMonth: toSimulationMonth(4),
          calculatedDeliverySimulationMonth: toSimulationMonth(12),
          motherPostBirthPartTimeHours: toEuroAmount(24) as unknown as import('#engine/types').WorkingHours,
          motherPostBirthPartTimeClass5Net: toNetSalary(1328),
          motherPostBirthPartTimeClass3Net: toNetSalary(1648),
          fatherPartnerMonthsCount: 4
        }
      ];

      const taxClassSwitches: TaxClassSwitchAction[] = [
        {
          switchId: 'SWAP-1',
          effectiveSimulationMonth: toSimulationMonth(4),
          effectiveCalendarMonth: toCalendarMonth(4),
          effectiveCalendarYear: 2026,
          targetHusbandTaxClass: TaxClass.V,
          targetWifeTaxClass: TaxClass.III,
          statutoryReason: 'Optimize 12-month synthetic Elterngeld assessment baseline (§ 2b BEEG)',
          revertSimulationMonth: toSimulationMonth(12)
        }
      ];

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.C,
        preexisting: basePreexisting,
        pregnancies,
        taxClassSwitches,
        salaryRaises: []
      });

      // Months 1-3: Before Swap -> H: III (2895 €) | W: V (1975 €)
      for (let m = 1; m <= 3; m++) {
        const entry = res.months[m - 1];
        assert.equal(entry.isSwapActive, false);
        assert.equal(entry.husbandSalary, 2895);
        assert.equal(entry.wifeSalary, 1975);
      }

      // Months 4-10: Swap Active -> H: V (2191 €) | W: III (2603 €)
      for (let m = 4; m <= 10; m++) {
        const entry = res.months[m - 1];
        assert.equal(entry.isSwapActive, true, `Month ${m} must be swap active`);
        assert.equal(entry.husbandSalary, 2191);
        assert.equal(entry.wifeSalary, 2603);
      }

      // Month 11: Pre-birth Mutterschutz -> H: V (2191 €), Wife Mutterschutz at Class III (2603 €)
      const m11 = res.months[10];
      assert.equal(m11.isSwapActive, true);
      assert.equal(m11.husbandSalary, 2191);
      assert.equal(m11.mutterschutz, 2603);

      // Month 12: Delivery (Reverted) -> H: III (2895 €), Wife Mutterschutz at Class III (2603 €)
      const m12 = res.months[11];
      assert.equal(m12.isSwapActive, false);
      assert.equal(m12.husbandSalary, 2895);
      assert.equal(m12.mutterschutz, 2603);
    });

    it('correctly calculates annual tax return refund reconciling withholding deficits', () => {
      const pregnancies: PregnancyAction[] = [
        {
          pregnancyId: 'PREG-1',
          childIndex: 1,
          positiveTestCalendarMonth: toCalendarMonth(4),
          positiveTestCalendarYear: 2026,
          positiveTestSimulationMonth: toSimulationMonth(4),
          calculatedDeliverySimulationMonth: toSimulationMonth(12),
          motherPostBirthPartTimeHours: toEuroAmount(24) as unknown as import('#engine/types').WorkingHours,
          motherPostBirthPartTimeClass5Net: toNetSalary(1328),
          motherPostBirthPartTimeClass3Net: toNetSalary(1648),
          fatherPartnerMonthsCount: 4
        }
      ];

      // 8 months of swap in 2026 (M4 to M11): net monthly deficit = (2895 - 2191) - (2603 - 1975) = 995 - 720 = 275 €/mo
      // Total 2026 deficit = 8 * 275 = 2.200 €
      // Tax return in March 2027 (M15) = 2.200 € + 850 € = 3.050 €
      const taxClassSwitches: TaxClassSwitchAction[] = [
        {
          switchId: 'SWAP-1',
          effectiveSimulationMonth: toSimulationMonth(4),
          effectiveCalendarMonth: toCalendarMonth(4),
          effectiveCalendarYear: 2026,
          targetHusbandTaxClass: TaxClass.V,
          targetWifeTaxClass: TaxClass.III,
          statutoryReason: 'Optimize § 2b BEEG',
          revertSimulationMonth: toSimulationMonth(12)
        }
      ];

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.C,
        preexisting: basePreexisting,
        pregnancies,
        taxClassSwitches,
        salaryRaises: []
      });

      const m15 = res.months[14];
      assert.equal(m15.calendarLabel, '03.2027');
      assert.equal(m15.taxRefund, 3050);
    });
  });

  describe('Batch 3: Salary Raises & Career Progression', () => {
    it('applies percentage salary raises from the effective month onwards', () => {
      const salaryRaises: SalaryRaiseAction[] = [
        {
          raiseId: 'RAISE-1',
          effectiveSimulationMonth: toSimulationMonth(13),
          effectiveCalendarMonth: toCalendarMonth(1),
          effectiveCalendarYear: 2027,
          targetPerson: 'both',
          percentageIncrease: 0.10, // +10% raise
          reason: 'Promotion to Staff Engineer'
        }
      ];

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.A,
        preexisting: basePreexisting,
        pregnancies: [],
        taxClassSwitches: [],
        salaryRaises
      });

      // Months 1-12: Unadjusted salaries (2895 € and 1975 €)
      for (let m = 1; m <= 12; m++) {
        assert.equal(res.months[m - 1].husbandSalary, 2895);
        assert.equal(res.months[m - 1].wifeSalary, 1975);
      }

      // Months 13-24: +10% applied
      // Husband: 2895 * 1.10 = 3502 €
      // Wife: 1975 * 1.10 = 1926 €
      for (let m = 13; m <= 24; m++) {
        assert.equal(res.months[m - 1].husbandSalary, 3502);
        assert.equal(res.months[m - 1].wifeSalary, 1926);
      }
    });

    it('accurately integrates all 4 batches concurrently (Preexisting + Pregnancies + Switches + Raises)', () => {
      const pregnancies: PregnancyAction[] = [
        {
          pregnancyId: 'PREG-1',
          childIndex: 1,
          positiveTestCalendarMonth: toCalendarMonth(4),
          positiveTestCalendarYear: 2026,
          positiveTestSimulationMonth: toSimulationMonth(4),
          calculatedDeliverySimulationMonth: toSimulationMonth(12),
          motherPostBirthPartTimeHours: toEuroAmount(24) as unknown as import('#engine/types').WorkingHours,
          motherPostBirthPartTimeClass5Net: toNetSalary(1328),
          motherPostBirthPartTimeClass3Net: toNetSalary(1648),
          fatherPartnerMonthsCount: 4
        }
      ];

      const taxClassSwitches: TaxClassSwitchAction[] = [
        {
          switchId: 'SWAP-1',
          effectiveSimulationMonth: toSimulationMonth(4),
          effectiveCalendarMonth: toCalendarMonth(4),
          effectiveCalendarYear: 2026,
          targetHusbandTaxClass: TaxClass.V,
          targetWifeTaxClass: TaxClass.III,
          statutoryReason: '§ 2b BEEG',
          revertSimulationMonth: toSimulationMonth(12)
        }
      ];

      const salaryRaises: SalaryRaiseAction[] = [
        {
          raiseId: 'RAISE-Y2',
          effectiveSimulationMonth: toSimulationMonth(13),
          effectiveCalendarMonth: toCalendarMonth(1),
          effectiveCalendarYear: 2027,
          targetPerson: 'both',
          percentageIncrease: 0.05, // +5% in Year 2
          reason: 'Tariff increase'
        }
      ];

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.C,
        preexisting: basePreexisting,
        pregnancies,
        taxClassSwitches,
        salaryRaises
      });

      assert.equal(res.months.length, 60);

      // Verify grand total conservation
      const sumSalaries = res.summary.totalSalaries as number;
      const sumBenefits = res.summary.totalBenefits as number;
      const sumTax = res.summary.totalTaxRefunds as number;
      const grandTotal = res.summary.grandTotal as number;

      assert.equal(grandTotal, sumSalaries + sumBenefits + sumTax);
      assert.ok(grandTotal > 300000, `5-year grand total (${grandTotal} €) must exceed 300.000 €`);
    });

    it('dynamically processes custom user-added 3rd child pregnancy, custom swap, and merit raises', () => {
      // 3 Pregnancies: Child 1 (M12), Child 2 (M36), Child 3 (M60)
      const pregnancies: PregnancyAction[] = [
        {
          pregnancyId: 'PREG-1',
          childIndex: 1,
          positiveTestCalendarMonth: toCalendarMonth(4),
          positiveTestCalendarYear: 2026,
          positiveTestSimulationMonth: toSimulationMonth(4),
          calculatedDeliverySimulationMonth: toSimulationMonth(12),
          motherPostBirthPartTimeHours: toEuroAmount(24) as unknown as import('#engine/types').WorkingHours,
          motherPostBirthPartTimeClass5Net: toNetSalary(1328),
          motherPostBirthPartTimeClass3Net: toNetSalary(1648),
          fatherPartnerMonthsCount: 4
        },
        {
          pregnancyId: 'PREG-2',
          childIndex: 2,
          positiveTestCalendarMonth: toCalendarMonth(4),
          positiveTestCalendarYear: 2028,
          positiveTestSimulationMonth: toSimulationMonth(28),
          calculatedDeliverySimulationMonth: toSimulationMonth(36),
          motherPostBirthPartTimeHours: toEuroAmount(24) as unknown as import('#engine/types').WorkingHours,
          motherPostBirthPartTimeClass5Net: toNetSalary(1328),
          motherPostBirthPartTimeClass3Net: toNetSalary(1648),
          fatherPartnerMonthsCount: 4
        },
        {
          pregnancyId: 'PREG-3',
          childIndex: 3,
          positiveTestCalendarMonth: toCalendarMonth(4),
          positiveTestCalendarYear: 2030,
          positiveTestSimulationMonth: toSimulationMonth(52),
          calculatedDeliverySimulationMonth: toSimulationMonth(60),
          motherPostBirthPartTimeHours: toEuroAmount(24) as unknown as import('#engine/types').WorkingHours,
          motherPostBirthPartTimeClass5Net: toNetSalary(1328),
          motherPostBirthPartTimeClass3Net: toNetSalary(1648),
          fatherPartnerMonthsCount: 4
        }
      ];

      // 3 Custom Swaps
      const taxClassSwitches: TaxClassSwitchAction[] = [
        {
          switchId: 'SWAP-1',
          effectiveSimulationMonth: toSimulationMonth(4),
          effectiveCalendarMonth: toCalendarMonth(4),
          effectiveCalendarYear: 2026,
          targetHusbandTaxClass: TaxClass.V,
          targetWifeTaxClass: TaxClass.III,
          statutoryReason: 'Swap 1 (§ 2b BEEG)',
          revertSimulationMonth: toSimulationMonth(12)
        },
        {
          switchId: 'SWAP-2',
          effectiveSimulationMonth: toSimulationMonth(28),
          effectiveCalendarMonth: toCalendarMonth(4),
          effectiveCalendarYear: 2028,
          targetHusbandTaxClass: TaxClass.V,
          targetWifeTaxClass: TaxClass.III,
          statutoryReason: 'Swap 2 (§ 2b BEEG)',
          revertSimulationMonth: toSimulationMonth(36)
        },
        {
          switchId: 'SWAP-3',
          effectiveSimulationMonth: toSimulationMonth(52),
          effectiveCalendarMonth: toCalendarMonth(4),
          effectiveCalendarYear: 2030,
          targetHusbandTaxClass: TaxClass.V,
          targetWifeTaxClass: TaxClass.III,
          statutoryReason: 'Swap 3 (§ 2b BEEG)',
          revertSimulationMonth: toSimulationMonth(60)
        }
      ];

      // Custom Raises
      const salaryRaises: SalaryRaiseAction[] = [
        {
          raiseId: 'RAISE-HUSBAND-PROMOTION',
          effectiveSimulationMonth: toSimulationMonth(25),
          effectiveCalendarMonth: toCalendarMonth(1),
          effectiveCalendarYear: 2028,
          targetPerson: 'husband',
          percentageIncrease: 0.10, // +10% Husband Promotion
          reason: 'Senior Staff Promotion'
        },
        {
          raiseId: 'RAISE-WIFE-PROMOTION',
          effectiveSimulationMonth: toSimulationMonth(40),
          effectiveCalendarMonth: toCalendarMonth(4),
          effectiveCalendarYear: 2029,
          targetPerson: 'wife',
          percentageIncrease: 0.08, // +8% Wife Merit Step
          reason: 'Wife Merit Step'
        }
      ];

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.C,
        preexisting: basePreexisting,
        pregnancies,
        taxClassSwitches,
        salaryRaises
      });

      assert.equal(res.months.length, 60);

      // Verify Month 12 is Delivery 1
      assert.equal(res.months[11].relativeBirthLabel, 'M+8 (Birth 1)');

      // Verify Month 25 husband salary has +10% raise
      const m24Husband = res.months[23].husbandSalary as number;
      const m25Husband = res.months[24].husbandSalary as number;
      assert.equal(m25Husband, Math.round(m24Husband * 1.10));

      // Verify Month 52 is Swap 3 active
      assert.equal(res.months[51].isSwapActive, true);
      assert.match(res.months[51].taxClassLabel, /H: V/);
      assert.match(res.months[51].taxClassLabel, /W: III/);

      // Verify Month 60 is Delivery 3
      assert.equal(res.months[59].isMutterschutz, true);
    });
  });
});
