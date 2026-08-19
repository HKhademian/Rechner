import {
  describe, it, 
} from "node:test";
import assert from "node:assert/strict";
import {
  runScenarioBatches, 
} from "#engine/simulator/timelineGenerator";
import {
  type PreexistingConditions,
  type SalaryBonusSlot,
  TaxClass,
  ScenarioId,
  AnnualSalariesCount,
  BonusDistributionPreset,
  TransactionType,
  toNetSalary,
  toEuroAmount,
  toCalendarMonth,
  toWorkingHours,
  toFullCalendarYear,
  toMonthDuration,
  toChildrenCount,
  toPercentageRate,
} from "#engine/types";
import {
  createBonusDistributionSlots,
  inferBonusPreset,
} from "#store/elterngeldStore";

describe("Person-Specific Salary Declarations & Bonus Distributions", () => {
  const createBasePreexisting = (
    overrides: Partial<PreexistingConditions> = {},
  ): PreexistingConditions => ({
    startCalendarYear: toFullCalendarYear(2026),
    startCalendarMonth: toCalendarMonth(1),
    simulationDurationMonths: toMonthDuration(12),
    husbandInitialTaxClass: TaxClass.III,
    husbandInitialNet: toNetSalary(3000),
    husbandInitialClass5Net: toNetSalary(2200),
    husbandWeeklyHours: toWorkingHours(40),
    husbandSalariesCount: AnnualSalariesCount.Twelve,
    husbandBonusDistribution: [],
    wifeInitialTaxClass: TaxClass.V,
    wifeInitialFullTimeNet: toNetSalary(2000),
    wifeInitialClass3FullTimeNet: toNetSalary(2600),
    wifeInitialPartTimeClass5Net: toNetSalary(1400),
    wifeInitialPartTimeClass3Net: toNetSalary(1800),
    wifeWeeklyHours: toWorkingHours(40),
    wifeSalariesCount: AnnualSalariesCount.Twelve,
    wifeBonusDistribution: [],
    existingChildrenCount: toChildrenCount(0),
    kindergeldPerChild: toEuroAmount(259),
    taxReturnMonth: toCalendarMonth(3),
    ...overrides,
  });

  describe("Preset Generation & Inference Helpers", () => {
    it("generates 40/60 distribution for 13th salary", () => {
      const slots = createBonusDistributionSlots(
        AnnualSalariesCount.Thirteen,
        BonusDistributionPreset.Ratio40_60,
      );
      assert.equal(slots.length, 2);
      assert.equal(slots[0]?.calendarMonth, 5);
      assert.equal(slots[0]?.payoutFraction, 0.4);
      assert.equal(slots[1]?.calendarMonth, 11);
      assert.equal(slots[1]?.payoutFraction, 0.6);

      const inferred = inferBonusPreset(AnnualSalariesCount.Thirteen, slots);
      assert.equal(inferred, BonusDistributionPreset.Ratio40_60);
    });

    it("generates 50/50 distribution for 13th salary", () => {
      const slots = createBonusDistributionSlots(
        AnnualSalariesCount.Thirteen,
        BonusDistributionPreset.Ratio50_50,
      );
      assert.equal(slots.length, 2);
      assert.equal(slots[0]?.calendarMonth, 6);
      assert.equal(slots[0]?.payoutFraction, 0.5);
      assert.equal(slots[1]?.calendarMonth, 11);
      assert.equal(slots[1]?.payoutFraction, 0.5);

      const inferred = inferBonusPreset(AnnualSalariesCount.Thirteen, slots);
      assert.equal(inferred, BonusDistributionPreset.Ratio50_50);
    });

    it("generates 100% single month bonuses for 13th salary", () => {
      const slotsNov = createBonusDistributionSlots(
        AnnualSalariesCount.Thirteen,
        BonusDistributionPreset.Single100Nov,
      );
      assert.equal(slotsNov.length, 1);
      assert.equal(slotsNov[0]?.calendarMonth, 11);
      assert.equal(slotsNov[0]?.payoutFraction, 1.0);
      assert.equal(
        inferBonusPreset(AnnualSalariesCount.Thirteen, slotsNov),
        BonusDistributionPreset.Single100Nov,
      );

      const slotsDec = createBonusDistributionSlots(
        AnnualSalariesCount.Thirteen,
        BonusDistributionPreset.Single100Dec,
      );
      assert.equal(slotsDec.length, 1);
      assert.equal(slotsDec[0]?.calendarMonth, 12);
      assert.equal(slotsDec[0]?.payoutFraction, 1.0);
      assert.equal(
        inferBonusPreset(AnnualSalariesCount.Thirteen, slotsDec),
        BonusDistributionPreset.Single100Dec,
      );
    });

    it("generates 14th and 15th salary presets", () => {
      const slots14 = createBonusDistributionSlots(
        AnnualSalariesCount.Fourteen,
        BonusDistributionPreset.Double100_100,
      );
      assert.equal(slots14.length, 2);
      assert.equal(slots14[0]?.payoutFraction, 1.0);
      assert.equal(slots14[1]?.payoutFraction, 1.0);

      const slots15 = createBonusDistributionSlots(
        AnnualSalariesCount.Fifteen,
        BonusDistributionPreset.Triple100_100_100,
      );
      assert.equal(slots15.length, 3);
      assert.equal(slots15[0]?.calendarMonth, 3);
      assert.equal(slots15[1]?.calendarMonth, 6);
      assert.equal(slots15[2]?.calendarMonth, 11);

      const slotsQuarterly15 = createBonusDistributionSlots(
        AnnualSalariesCount.Fifteen,
        BonusDistributionPreset.Quarterly,
      );
      assert.equal(slotsQuarterly15.length, 4);
      slotsQuarterly15.forEach((s) => {
        assert.equal(s.payoutFraction, 0.75);
      });
    });
  });

  describe("Husband Bonus Simulation", () => {
    it("correctly simulates 40/60 split (May & Nov) for Husband", () => {
      const husbandBonusDistribution: SalaryBonusSlot[] = [
        {
          calendarMonth: toCalendarMonth(5),
          payoutFraction: toPercentageRate(0.4),
          label: "13th Salary: 40% Vacation Bonus",
        },
        {
          calendarMonth: toCalendarMonth(11),
          payoutFraction: toPercentageRate(0.6),
          label: "13th Salary: 60% Christmas Bonus",
        },
      ];

      const preexisting = createBasePreexisting({
        husbandSalariesCount: AnnualSalariesCount.Thirteen,
        husbandBonusDistribution,
      });

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.A,
        preexisting,
        pregnancies: [],
        taxClassSwitches: [],
        salaryRaises: [],
      });

      // Month 5: 40% of 3000 = 1200 EUR
      const m5 = res.months[4];
      assert.equal(m5.husbandSalary, 3000);
      assert.equal(m5.husbandBonusAmount, 1200);
      assert.equal(m5.specialBonusTotal, 1200);
      assert.equal(m5.monthlyTotal, 3000 + 2000 + 1200);

      // Month 11: 60% of 3000 = 1800 EUR
      const m11 = res.months[10];
      assert.equal(m11.husbandSalary, 3000);
      assert.equal(m11.husbandBonusAmount, 1800);
      assert.equal(m11.specialBonusTotal, 1800);
      assert.equal(m11.monthlyTotal, 3000 + 2000 + 1800);

      // Summary
      assert.equal(res.summary.total13thSalaries, 3000);
    });

    it("correctly simulates 50/50 split (Jun & Nov) for Husband", () => {
      const husbandBonusDistribution: SalaryBonusSlot[] = [
        {
          calendarMonth: toCalendarMonth(6),
          payoutFraction: toPercentageRate(0.5),
          label: "13th Salary: 50% Vacation Bonus",
        },
        {
          calendarMonth: toCalendarMonth(11),
          payoutFraction: toPercentageRate(0.5),
          label: "13th Salary: 50% Christmas Bonus",
        },
      ];

      const preexisting = createBasePreexisting({
        husbandSalariesCount: AnnualSalariesCount.Thirteen,
        husbandBonusDistribution,
      });

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.A,
        preexisting,
        pregnancies: [],
        taxClassSwitches: [],
        salaryRaises: [],
      });

      // Month 6: 50% of 3000 = 1500 EUR
      const m6 = res.months[5];
      assert.equal(m6.husbandBonusAmount, 1500);

      // Month 11: 50% of 3000 = 1500 EUR
      const m11 = res.months[10];
      assert.equal(m11.husbandBonusAmount, 1500);

      assert.equal(res.summary.total13thSalaries, 3000);
    });
  });

  describe("Wife Bonus Simulation", () => {
    it("correctly simulates 14th salary (100% in Jun & Nov) for Wife", () => {
      const wifeBonusDistribution: SalaryBonusSlot[] = [
        {
          calendarMonth: toCalendarMonth(6),
          payoutFraction: toPercentageRate(1.0),
          label: "13th Salary: 100% Vacation Bonus",
        },
        {
          calendarMonth: toCalendarMonth(11),
          payoutFraction: toPercentageRate(1.0),
          label: "14th Salary: 100% Christmas Bonus",
        },
      ];

      const preexisting = createBasePreexisting({
        wifeSalariesCount: AnnualSalariesCount.Fourteen,
        wifeBonusDistribution,
      });

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.A,
        preexisting,
        pregnancies: [],
        taxClassSwitches: [],
        salaryRaises: [],
      });

      // Month 6: 100% of Wife base net 2000 = 2000 EUR
      const m6 = res.months[5];
      assert.equal(m6.wifeSalary, 2000);
      assert.equal(m6.wifeBonusAmount, 2000);
      assert.equal(m6.specialBonusTotal, 2000);
      assert.equal(m6.monthlyTotal, 3000 + 2000 + 2000);

      // Month 11: 100% of Wife base net 2000 = 2000 EUR
      const m11 = res.months[10];
      assert.equal(m11.wifeSalary, 2000);
      assert.equal(m11.wifeBonusAmount, 2000);
      assert.equal(m11.specialBonusTotal, 2000);

      assert.equal(res.summary.total13thSalaries, 4000);
    });
  });

  describe("Concurrent Spousal Bonuses", () => {
    it("simulates concurrent bonuses for both spouses in Month 11", () => {
      const husbandBonusDistribution: SalaryBonusSlot[] = [
        {
          calendarMonth: toCalendarMonth(5),
          payoutFraction: toPercentageRate(0.4),
          label: "Husband 40% Vacation",
        },
        {
          calendarMonth: toCalendarMonth(11),
          payoutFraction: toPercentageRate(0.6),
          label: "Husband 60% Christmas",
        },
      ];

      const wifeBonusDistribution: SalaryBonusSlot[] = [
        {
          calendarMonth: toCalendarMonth(11),
          payoutFraction: toPercentageRate(1.0),
          label: "Wife 100% Christmas",
        },
      ];

      const preexisting = createBasePreexisting({
        husbandSalariesCount: AnnualSalariesCount.Thirteen,
        husbandBonusDistribution,
        wifeSalariesCount: AnnualSalariesCount.Thirteen,
        wifeBonusDistribution,
      });

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.A,
        preexisting,
        pregnancies: [],
        taxClassSwitches: [],
        salaryRaises: [],
      });

      // Month 5: Husband 1200, Wife 0 -> specialBonusTotal = 1200
      const m5 = res.months[4];
      assert.equal(m5.husbandBonusAmount, 1200);
      assert.equal(m5.wifeBonusAmount, undefined);
      assert.equal(m5.specialBonusTotal, 1200);

      // Month 11: Husband 1800, Wife 2000 -> specialBonusTotal = 3800
      const m11 = res.months[10];
      assert.equal(m11.husbandBonusAmount, 1800);
      assert.equal(m11.wifeBonusAmount, 2000);
      assert.equal(m11.specialBonusTotal, 3800);
      assert.equal(m11.monthlyTotal, 3000 + 2000 + 3800);

      // Check special events
      const hEvent = m11.specialEvents.find((e) => e.title.includes("Husband"));
      const wEvent = m11.specialEvents.find((e) => e.title.includes("Wife"));
      assert.ok(hEvent);
      assert.equal(hEvent.amount, 1800);
      assert.ok(wEvent);
      assert.equal(wEvent.amount, 2000);

      // Check accounting transactions
      const hTx = m11.transactions.find((tx) =>
        tx.transactionId.includes("HUSBAND-BONUS"));
      const wTx = m11.transactions.find((tx) =>
        tx.transactionId.includes("WIFE-BONUS"));
      assert.ok(hTx);
      assert.equal(hTx.amount, 1800);
      assert.ok(wTx);
      assert.equal(wTx.amount, 2000);
      assert.equal(wTx.type, TransactionType.SalaryBonusSpecial);

      // Grand total bonus sum
      assert.equal(res.summary.total13thSalaries, 1200 + 1800 + 2000);
    });
  });
});
