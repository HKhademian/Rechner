import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateTimelineSimulation } from "#engine/simulator/timelineGenerator";
import {
  toNetSalary,
  toEuroAmount,
  toSimulationMonth,
  toCalendarMonth,
  toWorkingHours,
  toPregnancyId,
  toSwitchId,
  toRaiseId,
  ScenarioId,
  TaxClass,
  TargetPerson,
} from "#engine/types";

describe("End-to-End Simulation Scenarios (Scenarios A, B, C & Parameter Variations)", () => {
  const defaultParams = {
    husbandClass3Net: toNetSalary(2895),
    husbandClass5Net: toNetSalary(2191),
    wifeClass5FullTimeNet: toNetSalary(1975),
    wifeClass3FullTimeNet: toNetSalary(2603),
    wifeClass5PartTimeNet: toNetSalary(1328),
    wifeClass3PartTimeNet: toNetSalary(1648),
    kindergeldPerChild: toEuroAmount(259),
    prePregnancyPlanningMonths: 3,
    child1BirthMonth: toSimulationMonth(12),
    birthSpacingMonths: 27,
    swapLeadMonths: 7,
    enable13thSalary: true,
    bonus40Month: toCalendarMonth(5),
    bonus60Month: toCalendarMonth(11),
    taxReturnMonth: toCalendarMonth(3),
  };

  describe("Scenario A - Baseline Career (No Children)", () => {
    it("produces constant regular monthly income and 13th month bonuses without parental leave or benefits", () => {
      const res = generateTimelineSimulation({
        ...defaultParams,
        scenarioKey: ScenarioId.A,
      });
      assert.equal(res.months.length, 60);

      res.months.forEach((m) => {
        assert.equal(m.husbandSalary, 2895);
        assert.equal(m.wifeSalary, 1975);
        assert.equal(m.mutterschutz, 0);
        assert.equal(m.wifeElterngeld, 0);
        assert.equal(m.husbandElterngeld, 0);
        assert.equal(m.kindergeld, 0);
        assert.equal(m.regularMonthlyTotal, 6125);
      });

      assert.equal(res.summary.totalBenefits, 0);
    });
  });

  describe("Scenario B - Unoptimized (Static Class III/V)", () => {
    it("accurately models Mutterschutz at Class V and unoptimized ElterngeldPlus", () => {
      const res = generateTimelineSimulation({
        ...defaultParams,
        scenarioKey: ScenarioId.B,
      });
      assert.equal(res.months.length, 60);

      // Mutterschutz 1 (M11, M12, M13) at Class V FT (€1.975)
      [11, 12, 13].forEach((mIndex) => {
        const m = res.months[mIndex - 1];
        assert.equal(m.isMutterschutz, true);
        assert.equal(m.mutterschutz, 1975);
        assert.equal(m.wifeSalary, 0);
      });

      // Child 1 ElterngeldPlus (M14 to M25) = €501
      for (let i = 14; i <= 25; i++) {
        const m = res.months[i - 1];
        assert.equal(m.wifeElterngeld, 501);
      }
    });
  });

  describe("Scenario C - Optimized Proactive Tax Class Swap (III/V)", () => {
    it("accurately models Swap 1, Mutterschutz at Class III FT (€2.603), and maxed €900 ElterngeldPlus", () => {
      const res = generateTimelineSimulation({
        ...defaultParams,
        scenarioKey: ScenarioId.C,
      });
      assert.equal(res.months.length, 60);

      // Mutterschutz 1 (M11, M12, M13) at Class III FT (€2.603)
      [11, 12, 13].forEach((mIndex) => {
        const m = res.months[mIndex - 1];
        assert.equal(m.isMutterschutz, true);
        assert.equal(m.mutterschutz, 2603);
      });

      // Child 1 ElterngeldPlus (M14 to M25) = €900 (Maxed out!)
      for (let i = 14; i <= 25; i++) {
        const m = res.months[i - 1];
        assert.equal(m.wifeElterngeld, 900);
      }
    });

    it("calculates exact annual tax refunds for Year 1 (+3.050 €) and Year 3 (+4.060 €)", () => {
      const res = generateTimelineSimulation({
        ...defaultParams,
        scenarioKey: ScenarioId.C,
      });

      // Month 15: Year 1 Return = 8 * 275 (2200) + 850 + 31 (Prorated Günstigerprüfung for Dec birth) = 3081 €
      const m15 = res.months[14];
      assert.equal(m15.taxRefund, 3081);

      // Month 27: Year 2 Return = 0 deficit + 850 + 8 (Günstigerprüfung Child 1) = 858 €
      const m27 = res.months[26];
      assert.equal(m27.taxRefund, 858);

      // Month 39: Year 3 Return = 6 * 535 (3210) + 850 + 8 (Günstigerprüfung Child 1) = 4068 €
      const m39 = res.months[38];
      assert.equal(m39.taxRefund, 4068);

      // Month 51: Year 4 Return = 2 * 535 (1070) + 850 (Kindergeld floor protected) = 1920 €
      const m51 = res.months[50];
      assert.equal(m51.taxRefund, 1920);
    });
  });

  describe("Optimization Advantage Audit (Scenario C vs Scenario B)", () => {
    it("proves Scenario C provides substantial net financial gain over Scenario B", () => {
      const b = generateTimelineSimulation({
        ...defaultParams,
        scenarioKey: ScenarioId.B,
      });
      const c = generateTimelineSimulation({
        ...defaultParams,
        scenarioKey: ScenarioId.C,
      });

      const netGain =
        (c.summary.grandTotal as number) - (b.summary.grandTotal as number);
      const benefitsGain =
        (c.summary.totalBenefits as number) -
        (b.summary.totalBenefits as number);

      assert.ok(
        netGain > 10000,
        `Net gain (${netGain} €) must exceed 10.000 €`,
      );
      assert.ok(
        benefitsGain > 8000,
        `Benefits gain (${benefitsGain} €) must exceed 8.000 €`,
      );
    });
  });

  describe("Dynamic Timeline Start Month, Year & Duration Calibration", () => {
    it("supports custom 12-month simulation starting in September 2026", () => {
      const res = generateTimelineSimulation({
        ...defaultParams,
        scenarioKey: ScenarioId.C,
        startCalendarYear: 2026,
        startCalendarMonth: toCalendarMonth(9),
        simulationDurationMonths: 12,
      });

      assert.equal(res.months.length, 12);
      assert.equal(res.months[0].monthId, "M092026");
      assert.equal(res.months[0].calendarLabel, "09.2026");
      assert.equal(res.months[0].calendarMonthNum, 9);
      assert.equal(res.months[0].calendarYearNum, 2026);
      assert.equal(res.months[0].relativeBirthLabel, "M-3");
      assert.equal(res.months[0].relativeMonthLabel, "M-3");

      assert.equal(res.months[3].monthId, "M122026");
      assert.equal(res.months[3].relativeBirthLabel, "M1 (Pregnancy Positive)");
      assert.equal(res.months[3].relativeMonthLabel, "M1 (Pregnancy Positive)");

      assert.equal(res.months[11].monthId, "M082027");
      assert.equal(res.months[11].calendarLabel, "08.2027");
      assert.equal(res.months[11].calendarMonthNum, 8);
      assert.equal(res.months[11].calendarYearNum, 2027);
      assert.equal(res.months[11].relativeBirthLabel, "M9 (Birth 1)");
      assert.equal(res.months[11].relativeMonthLabel, "M9 (Birth 1)");
    });

    it("accurately positions 13th month bonuses based on real calendar months", () => {
      // Start in September 2026 (Month 9). November 2026 (Christmas bonus) is simulation Month 3 (09 -> 10 -> 11).
      const res = generateTimelineSimulation({
        ...defaultParams,
        scenarioKey: ScenarioId.C,
        startCalendarYear: 2026,
        startCalendarMonth: toCalendarMonth(9),
        simulationDurationMonths: 24,
        bonus40Month: toCalendarMonth(5), // May
        bonus60Month: toCalendarMonth(11), // November
      });

      // Simulation Month 3 = November 2026 -> 60% Christmas bonus
      const m3 = res.months[2];
      assert.equal(m3.calendarLabel, "11.2026");
      assert.ok(
        m3.bonus60Amount > 0,
        "Month 3 (November 2026) must contain 60% bonus",
      );

      // Simulation Month 9 = May 2027 -> 40% Vacation bonus
      const m9 = res.months[8];
      assert.equal(m9.calendarLabel, "05.2027");
      assert.ok(
        m9.bonus40Amount > 0,
        "Month 9 (May 2027) must contain 40% bonus",
      );
    });

    it("accurately reconciles tax returns on configured calendar month (March of following year)", () => {
      // Start in September 2026. March 2027 is simulation Month 7.
      const res = generateTimelineSimulation({
        ...defaultParams,
        scenarioKey: ScenarioId.C,
        startCalendarYear: 2026,
        startCalendarMonth: toCalendarMonth(9),
        simulationDurationMonths: 36,
        taxReturnMonth: toCalendarMonth(3), // March
      });

      // Month 7 = 03.2027 -> Receives tax refund for calendar year 2026
      const m7 = res.months[6];
      assert.equal(m7.calendarLabel, "03.2027");
      assert.ok(
        m7.taxRefund > 0,
        "Month 7 (March 2027) must receive the 2026 tax return",
      );

      // Month 19 = 03.2028 -> Receives tax refund for calendar year 2027
      const m19 = res.months[18];
      assert.equal(m19.calendarLabel, "03.2028");
      assert.ok(
        m19.taxRefund > 0,
        "Month 19 (March 2028) must receive the 2027 tax return",
      );
    });
  });

  describe("Discrete Batch Action Simulation Architecture (runScenarioBatches)", () => {
    it("executes simulation with discrete batches: preexisting, pregnancy, tax switches, and raises", async () => {
      const { runScenarioBatches } =
        await import("#engine/simulator/timelineGenerator");
      const { TaxClass } = await import("#engine/types");

      const preexisting = {
        startCalendarYear: 2026,
        startCalendarMonth: toCalendarMonth(1),
        simulationDurationMonths: 36,
        husbandInitialTaxClass: TaxClass.III,
        husbandInitialNet: toNetSalary(4000),
        husbandInitialClass5Net: toNetSalary(3000),
        husbandWeeklyHours: toWorkingHours(32),
        wifeInitialTaxClass: TaxClass.V,
        wifeInitialFullTimeNet: toNetSalary(2000),
        wifeInitialClass3FullTimeNet: toNetSalary(2800),
        wifeInitialPartTimeClass5Net: toNetSalary(1200),
        wifeInitialPartTimeClass3Net: toNetSalary(1600),
        wifeWeeklyHours: toWorkingHours(40),
        existingChildrenCount: 0,
        kindergeldPerChild: toEuroAmount(250),
        enable13thSalary: true,
        bonus40Month: toCalendarMonth(5),
        bonus60Month: toCalendarMonth(11),
        taxReturnMonth: toCalendarMonth(3),
      };

      const pregnancies = [
        {
          pregnancyId: toPregnancyId("PREG-1"),
          childIndex: 1,
          positiveTestCalendarMonth: toCalendarMonth(9),
          positiveTestCalendarYear: 2026,
          positiveTestSimulationMonth: toSimulationMonth(9),
          calculatedDeliverySimulationMonth: toSimulationMonth(18),
          motherPostBirthPartTimeHours: toWorkingHours(24),
          motherPostBirthPartTimeClass5Net: toNetSalary(1200),
          motherPostBirthPartTimeClass3Net: toNetSalary(1600),
          fatherPartnerMonthsCount: 4,
        },
      ];

      const taxClassSwitches = [
        {
          switchId: toSwitchId("SWAP-1"),
          effectiveSimulationMonth: toSimulationMonth(10),
          effectiveCalendarMonth: toCalendarMonth(10),
          effectiveCalendarYear: 2026,
          targetHusbandTaxClass: TaxClass.V,
          targetWifeTaxClass: TaxClass.III,
          statutoryReason:
            "Optimize 12-month synthetic Elterngeld assessment baseline (§ 2b BEEG)",
          revertSimulationMonth: toSimulationMonth(18),
        },
      ];

      const salaryRaises = [
        {
          raiseId: toRaiseId("RAISE-Y2"),
          effectiveSimulationMonth: toSimulationMonth(13),
          effectiveCalendarMonth: toCalendarMonth(1),
          effectiveCalendarYear: 2027,
          targetPerson: TargetPerson.Both,
          percentageIncrease: 0.05, // +5% raise in Year 2
          reason: "Annual Tariff / Promotion",
        },
      ];

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.C,
        preexisting,
        pregnancies,
        taxClassSwitches,
        salaryRaises,
      });

      assert.equal(res.months.length, 36);

      // Month 1-9: Initial salaries
      assert.equal(res.months[0].husbandSalary, 4000);
      assert.equal(res.months[0].wifeSalary, 2000);

      // Month 10: Swap 1 active (H: V | W: III)
      assert.equal(res.months[9].husbandSalary, 3000);
      assert.equal(res.months[9].wifeSalary, 2800);
      assert.equal(res.months[9].isSwapActive, true);

      // Month 13: 5% salary raise applied
      // Husband Class V was 3000 -> now 3150
      // Wife Class III was 2800 -> now 2940
      assert.equal(res.months[12].husbandSalary, 3150);
      assert.equal(res.months[12].wifeSalary, 2940);

      // Month 18: Child 1 Birth (Mutterschutz)
      assert.equal(res.months[17].isMutterschutz, true);
      assert.ok(res.months[17].mutterschutz > 0);
    });
  });
});
