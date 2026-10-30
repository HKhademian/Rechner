import {
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";
import {
  generateTimelineSimulation,
  runScenarioBatches,
} from "#engine/simulator/timelineGenerator";
import {
  toGrossSalary,
  toNetSalary,
  toEuroAmount,
  toSimulationMonth,
  toCalendarMonth,
  toWorkingHours,
  toFullCalendarYear,
  toMonthDuration,
  toChildrenCount,
  toChildIndex,
  toPercentageRate,
  toPregnancyId,
  toSwitchId,
  toRaiseId,
  toMonthId,
  toMonthRef,
  toMonthSimRef,
  toCalendarLabel,
  ScenarioId,
  TaxClass,
  TargetPerson,
} from "#engine/types";

describe("End-to-End Simulation Scenarios (Scenarios A, B, C & Parameter Variations)", () => {
  const defaultParams = {
    // Explicit unverified assessment-net estimates for lifecycle tests.
    assumeManualNetIsAssessmentNet: true,
    husbandGross: toGrossSalary(4500),
    wifeGross: toGrossSalary(3000),
    wifePostBirthHours: toWorkingHours(24),
    husbandClass3Net: toNetSalary(3184),
    husbandClass5Net: toNetSalary(2398),
    wifeClass5FullTimeNet: toNetSalary(1751),
    wifeClass3FullTimeNet: toNetSalary(2295),
    wifeClass5PartTimeNet: toNetSalary(1182),
    wifeClass3PartTimeNet: toNetSalary(1413),
    kindergeldPerChild: toEuroAmount(259),
    prePregnancyPlanningMonths: toMonthDuration(3),
    child1BirthMonth: toSimulationMonth(12),
    birthSpacingMonths: toMonthDuration(27),
    swapLeadMonths: toMonthDuration(7),
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
        assert.equal(m.husbandSalary, 3184);
        assert.equal(m.wifeSalary, 1751);
        assert.equal(m.mutterschutz, 0);
        assert.equal(m.wifeElterngeld, 0);
        assert.equal(m.husbandElterngeld, 0);
        assert.equal(m.kindergeld, 0);
        assert.equal(m.regularMonthlyTotal, 4935);
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

      // Mutterschutz 1 (M11, M12, M13) at Class V FT (€1.751)
      [11, 12, 13].forEach((mIndex) => {
        const m = res.months[mIndex - 1];
        assert.equal(m.isMutterschutz, true);
        assert.equal(m.mutterschutz, 1751);
        assert.equal(m.wifeSalary, 0);
      });

      // Child 1 ElterngeldPlus (M14 to M25) = €369.85: (1751 - 1182) * 0.65
      for (let i = 14; i <= 25; i++) {
        const m = res.months[i - 1];
        assert.equal(m.wifeElterngeld, 369.85);
      }
    });
  });

  describe("Scenario C - Optimized Proactive Tax Class Swap (III/V)", () => {
    it("accurately models Swap 1, Mutterschutz at Class III FT (€2.295), and frozen-class ElterngeldPlus (+573.30 €)", () => {
      const res = generateTimelineSimulation({
        ...defaultParams,
        scenarioKey: ScenarioId.C,
      });
      assert.equal(res.months.length, 60);

      // Mutterschutz 1 (M11, M12, M13) at Class III FT (€2.295)
      [11, 12, 13].forEach((mIndex) => {
        const m = res.months[mIndex - 1];
        assert.equal(m.isMutterschutz, true);
        assert.equal(m.mutterschutz, 2295);
      });

      // Explicit manual estimate: use frozen class III on both sides, (2295 - 1413) × 0.65 = 573.30.
      for (let i = 14; i <= 25; i++) {
        const m = res.months[i - 1];
        assert.equal(m.wifeElterngeld, 573.30);
      }
    });

    it("leaves manual-net tax settlements unavailable rather than guessing refunds", () => {
      const res = generateTimelineSimulation({
        ...defaultParams,
        scenarioKey: ScenarioId.C,
      });

      assert.equal(res.taxComplete, false);
      assert.equal(res.summary.totalTaxRefunds, 0);
      assert.ok(res.months.every((month) => month.taxRefund === 0));
      assert.ok(res.annualTaxRecords?.every((record) => !record.available));
    });
  });

  describe("Optimization Advantage Audit (Scenario C vs Scenario B)", () => {
    it("attributes this fixture's benefit gain to frozen-class assessment and maternity references", () => {
      const b = generateTimelineSimulation({
        ...defaultParams,
        scenarioKey: ScenarioId.B,
      });
      const c = generateTimelineSimulation({
        ...defaultParams,
        scenarioKey: ScenarioId.C,
      });

      // First birth: twelve Plus payments gain 573.30 - 369.85; three maternity
      // months gain 2295 - 1751. This is an assumed-net fixture, not a verified tax return.
      const firstBirthGain = c.months.slice(10, 25).reduce((sum, month, index) => {
        const baseline = b.months[index + 10];
        return sum + month.wifeElterngeld - baseline.wifeElterngeld + month.mutterschutz - baseline.mutterschutz;
      }, 0);
      assert.equal(Math.round(firstBirthGain * 100), 407340);
      assert.equal(c.benefitsComplete, true);
      assert.ok(c.assumptions?.some((note) => note.includes("Explicit assumption")));
    });
  });

  describe("Dynamic Timeline Start Month, Year & Duration Calibration", () => {
    it("supports custom 12-month simulation starting in September 2026", () => {
      const res = generateTimelineSimulation({
        ...defaultParams,
        scenarioKey: ScenarioId.C,
        startCalendarYear: toFullCalendarYear(2026),
        startCalendarMonth: toCalendarMonth(9),
        simulationDurationMonths: toMonthDuration(12),
      });

      assert.equal(res.months.length, 12);
      assert.equal(res.months[0].monthId, toMonthId(9, 2026));
      assert.equal(res.months[0].monthRef, toMonthRef("M-3"));
      assert.equal(res.months[0].monthSimRef, toMonthSimRef(1));
      assert.equal(res.months[0].calendarLabel, toCalendarLabel(9, 2026));
      assert.equal(res.months[0].calendarMonthNum, 9);
      assert.equal(res.months[0].calendarYearNum, 2026);
      assert.equal(res.months[0].relativeBirthLabel, toMonthRef("M-3"));
      assert.equal(res.months[0].relativeMonthLabel, toMonthRef("M-3"));

      assert.equal(res.months[3].monthId, toMonthId(12, 2026));
      assert.equal(res.months[3].monthRef, toMonthRef(1, "Pregnancy Positive"));
      assert.equal(res.months[3].monthSimRef, toMonthSimRef(4));
      assert.equal(
        res.months[3].relativeBirthLabel,
        toMonthRef(1, "Pregnancy Positive"),
      );
      assert.equal(
        res.months[3].relativeMonthLabel,
        toMonthRef(1, "Pregnancy Positive"),
      );

      assert.equal(res.months[11].monthId, toMonthId(8, 2027));
      assert.equal(res.months[11].monthSimRef, toMonthSimRef(12));
      assert.equal(res.months[11].calendarLabel, toCalendarLabel(8, 2027));
      assert.equal(res.months[11].calendarMonthNum, 8);
      assert.equal(res.months[11].calendarYearNum, 2027);
      assert.equal(res.months[11].relativeBirthLabel, toMonthRef(9, "Birth 1"));
      assert.equal(res.months[11].relativeMonthLabel, toMonthRef(9, "Birth 1"));
    });

    it("accurately positions 13th month bonuses based on real calendar months", () => {
      // Start in September 2026 (Month 9). November 2026 (Christmas bonus) is simulation Month 3 (09 -> 10 -> 11).
      const res = generateTimelineSimulation({
        ...defaultParams,
        scenarioKey: ScenarioId.C,
        startCalendarYear: toFullCalendarYear(2026),
        startCalendarMonth: toCalendarMonth(9),
        simulationDurationMonths: toMonthDuration(24),
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

    it("does not create a settlement for missing calendar months or manual tax data", () => {
      // Start in September 2026. March 2027 is simulation Month 7.
      const res = generateTimelineSimulation({
        ...defaultParams,
        scenarioKey: ScenarioId.C,
        startCalendarYear: toFullCalendarYear(2026),
        startCalendarMonth: toCalendarMonth(9),
        simulationDurationMonths: toMonthDuration(36),
        taxReturnMonth: toCalendarMonth(3), // March
      });

      // Calendar2026 lacks January-August; its settlement is unavailable.
      const m7 = res.months[6];
      assert.equal(m7.calendarLabel, "03.2027");
      assert.equal(m7.taxRefund, 0);
      assert.deepEqual(res.annualTaxRecords?.[0].missingMonths, [1, 2, 3, 4, 5, 6, 7, 8]);

      // Calendar2027 is present, but manual nets still lack actual tax data.
      const m19 = res.months[18];
      assert.equal(m19.calendarLabel, "03.2028");
      assert.equal(m19.taxRefund, 0);
      assert.ok(res.annualTaxRecords?.[1].reasons.some((reason) => reason.includes("Manual net")));
    });
  });

  describe("Discrete Batch Action Simulation Architecture (runScenarioBatches)", () => {
    it("executes simulation with discrete batches: preexisting, pregnancy, tax switches, and raises", () => {
      const preexisting = {
        startCalendarYear: toFullCalendarYear(2026),
        startCalendarMonth: toCalendarMonth(1),
        simulationDurationMonths: toMonthDuration(36),
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
        existingChildrenCount: toChildrenCount(0),
        kindergeldPerChild: toEuroAmount(250),
        enable13thSalary: true,
        bonus40Month: toCalendarMonth(5),
        bonus60Month: toCalendarMonth(11),
        taxReturnMonth: toCalendarMonth(3),
      };

      const pregnancies = [
        {
          pregnancyId: toPregnancyId("PREG-1"),
          childIndex: toChildIndex(1),
          positiveTestCalendarMonth: toCalendarMonth(9),
          positiveTestCalendarYear: toFullCalendarYear(2026),
          positiveTestSimulationMonth: toSimulationMonth(9),
          calculatedDeliverySimulationMonth: toSimulationMonth(18),
          motherPostBirthPartTimeHours: toWorkingHours(24),
          motherPostBirthPartTimeClass5Net: toNetSalary(1200),
          motherPostBirthPartTimeClass3Net: toNetSalary(1600),
          fatherPartnerMonthsCount: toMonthDuration(4),
        },
      ];

      const taxClassSwitches = [
        {
          switchId: toSwitchId("SWAP-1"),
          effectiveSimulationMonth: toSimulationMonth(10),
          effectiveCalendarMonth: toCalendarMonth(10),
          effectiveCalendarYear: toFullCalendarYear(2026),
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
          effectiveCalendarYear: toFullCalendarYear(2027),
          targetPerson: TargetPerson.Both,
          percentageIncrease: toPercentageRate(0.05), // +5% raise in Year 2
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
