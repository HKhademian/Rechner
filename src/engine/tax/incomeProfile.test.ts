import {
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";
import {
  type PreexistingConditions,
  type PregnancyAction,
  ScenarioId,
  TaxClass,
  SalaryPeriod,
  SpecialEventType,
  SpecialEventCategory,
  TransactionType,
  toGrossSalary,
  toNetSalary,
  toWorkingHours,
  toEuroAmount,
  toCalendarMonth,
  toSimulationMonth,
  toFullCalendarYear,
  toMonthDuration,
  toChildrenCount,
  toChildIndex,
  toPregnancyId,
} from "#engine/types";
import {
  deriveSpousalNetSalaries, 
} from "#engine/tax/wageTax";
import {
  runScenarioBatches, 
} from "#engine/simulator/timelineGenerator";

describe("Unified Household Gross Income & Compensation Profile", () => {
  describe("Gross-to-Net Derivation with Variable Working Hours", () => {
    it("correctly calculates proportional part-time gross and net for wife post-birth", () => {
      const ftGross = toGrossSalary(3000); // 40h
      const hGross = toGrossSalary(4500); // 32h
      const ptHours24 = toWorkingHours(24);
      const ftHours40 = toWorkingHours(40);

      const spousal24 = deriveSpousalNetSalaries(
        hGross,
        ftGross,
        ptHours24,
        ftHours40,
        0,
      );

      assert.equal(spousal24.wifeGrossFullTime, 3000);
      assert.equal(spousal24.wifeGrossPartTime, 1800); // 3000 * (24 / 40) = 1800
      assert.equal(spousal24.wifeClass5FullTimeNet, 1751);
      assert.equal(spousal24.wifeClass3FullTimeNet, 2295);
      assert.equal(spousal24.wifeClass5PartTimeNet, 1182);
      assert.equal(spousal24.wifePartTimeWeeklyHours, 24);
      assert.equal(spousal24.husbandWeeklyHours, 32);
    });

    it("handles alternative part-time hours (e.g. 20h and 30h)", () => {
      const ftGross = toGrossSalary(4000);
      const hGross = toGrossSalary(7000);

      const spousal20 = deriveSpousalNetSalaries(
        hGross,
        ftGross,
        toWorkingHours(20),
        toWorkingHours(40),
        0,
      );
      assert.equal(spousal20.wifeGrossPartTime, 2000); // 4000 * 0.5 = 2000

      const spousal30 = deriveSpousalNetSalaries(
        hGross,
        ftGross,
        toWorkingHours(30),
        toWorkingHours(40),
        0,
      );
      assert.equal(spousal30.wifeGrossPartTime, 3000); // 4000 * 0.75 = 3000
    });
  });

  describe("Simulation Cash Flows with Unified Income Channels", () => {
    const basePreexisting: PreexistingConditions = {
      startCalendarYear: toFullCalendarYear(2026),
      startCalendarMonth: toCalendarMonth(1),
      simulationDurationMonths: toMonthDuration(24),
      salaryPeriod: SalaryPeriod.Monthly,
      husbandGross: toGrossSalary(4500),
      wifeGross: toGrossSalary(3000),
      husbandInitialTaxClass: TaxClass.III,
      husbandInitialNet: toNetSalary(3184),
      husbandInitialClass5Net: toNetSalary(2398),
      husbandWeeklyHours: toWorkingHours(32),
      wifeInitialTaxClass: TaxClass.V,
      wifeInitialFullTimeNet: toNetSalary(1751),
      wifeInitialClass3FullTimeNet: toNetSalary(2295),
      wifeInitialPartTimeClass5Net: toNetSalary(1182),
      wifeInitialPartTimeClass3Net: toNetSalary(1413),
      wifeWeeklyHours: toWorkingHours(40),
      wifePostBirthWeeklyHours: toWorkingHours(24),
      existingChildrenCount: toChildrenCount(0),
      kindergeldPerChild: toEuroAmount(259),
      enable13thSalary: true,
      bonus40Month: toCalendarMonth(5),
      bonus60Month: toCalendarMonth(11),
      taxReturnMonth: toCalendarMonth(3),
    };

    const dummyPregnancies: PregnancyAction[] = [
      {
        pregnancyId: toPregnancyId("PREG-1"),
        childIndex: toChildIndex(1),
        positiveTestCalendarMonth: toCalendarMonth(9),
        positiveTestCalendarYear: toFullCalendarYear(2026),
        positiveTestSimulationMonth: toSimulationMonth(9),
        calculatedDeliverySimulationMonth: toSimulationMonth(17),
        motherPostBirthPartTimeHours: toWorkingHours(24),
        motherPostBirthPartTimeClass5Net: toNetSalary(1182),
        motherPostBirthPartTimeClass3Net: toNetSalary(1413),
        fatherPartnerMonthsCount: toMonthDuration(4),
      },
    ];

    it("injects annual recurring bonus in month 12 with § 39b differential net taxation", () => {
      const preexistingWithBonus: PreexistingConditions = {
        ...basePreexisting,
        annualBonusGross: toEuroAmount(10000),
        annualBonusMonth: toCalendarMonth(12),
      };

      const result = runScenarioBatches({
        scenarioKey: ScenarioId.B,
        preexisting: preexistingWithBonus,
        pregnancies: dummyPregnancies,
        taxClassSwitches: [],
        salaryRaises: [],
      });

      // Check Month 12 (December 2026)
      const m12 = result.months[11];
      assert.equal(m12.month, 12);
      assert.equal(m12.calendarMonthNum, 12);

      const bonusEvent = m12.specialEvents.find(
        (e) =>
          e.type === SpecialEventType.CustomIncome &&
          e.title.includes("Annual Performance Bonus"),
      );
      assert.ok(bonusEvent, "Bonus event must be present in month 12");
      assert.equal(bonusEvent.category, SpecialEventCategory.CareerBonus);
      assert.ok(bonusEvent.statutory.includes("§ 39b"));
      assert.ok(bonusEvent.amount > 4000); // Net bonus after § 39b taxes

      // Verify transaction log
      const bonusTx = m12.transactions.find(
        (t) =>
          t.type === TransactionType.SpecialIncome &&
          t.description.includes("Annual Performance Bonus"),
      );
      assert.ok(bonusTx, "Bonus transaction must be logged");
    });

    it("injects monthly investment returns across all timeline months", () => {
      const preexistingWithInvestment: PreexistingConditions = {
        ...basePreexisting,
        investmentReturnMonthly: toEuroAmount(350),
      };

      const result = runScenarioBatches({
        scenarioKey: ScenarioId.B,
        preexisting: preexistingWithInvestment,
        pregnancies: dummyPregnancies,
        taxClassSwitches: [],
        salaryRaises: [],
      });

      // Verify every month has 350 € investment return
      result.months.forEach((m) => {
        const invEvent = m.specialEvents.find(
          (e) => e.category === SpecialEventCategory.InvestmentReturn,
        );
        assert.ok(
          invEvent,
          `Investment return event must be present in month ${m.month}`,
        );
        assert.equal(invEvent.amount, 350);
        assert.ok(invEvent.title.includes("350 €"));
      });
    });

    it("processes 13th month salary in May (40%) and November (60%)", () => {
      const result = runScenarioBatches({
        scenarioKey: ScenarioId.B,
        preexisting: basePreexisting,
        pregnancies: dummyPregnancies,
        taxClassSwitches: [],
        salaryRaises: [],
      });

      // Month 5 (May 2026) -> 40% Vacation Bonus
      const m5 = result.months[4];
      assert.equal(m5.calendarMonthNum, 5);
      assert.equal(m5.bonus40Amount, Math.round(0.4 * m5.husbandSalary));
      assert.equal(m5.bonus60Amount, 0);

      // Month 11 (Nov 2026) -> 60% Christmas Bonus
      const m11 = result.months[10];
      assert.equal(m11.calendarMonthNum, 11);
      assert.equal(m11.bonus40Amount, 0);
      assert.equal(m11.bonus60Amount, Math.round(0.6 * m11.husbandSalary));
    });
  });
});
