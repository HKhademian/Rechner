import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runScenarioBatches } from "#engine/simulator/timelineGenerator";
import {
  TaxClass,
  ScenarioId,
  toNetSalary,
  toEuroAmount,
  toSimulationMonth,
  toCalendarMonth,
  toWorkingHours,
  toPregnancyId,
  type PreexistingConditions,
  type PregnancyAction,
  type TaxClassSwitchAction,
  type SalaryRaiseAction,
} from "#engine/types";

describe("Sandbox Unit Tests: Initial State & Preexisting Conditions (Batch 0)", () => {
  const createBasePreexisting = (
    overrides: Partial<PreexistingConditions> = {},
  ): PreexistingConditions => ({
    startCalendarYear: 2026,
    startCalendarMonth: toCalendarMonth(1),
    simulationDurationMonths: 24,
    husbandInitialTaxClass: TaxClass.III,
    husbandInitialNet: toNetSalary(2895),
    husbandInitialClass5Net: toNetSalary(2191),
    husbandWeeklyHours: toWorkingHours(32),
    wifeInitialTaxClass: TaxClass.V,
    wifeInitialFullTimeNet: toNetSalary(1975),
    wifeInitialClass3FullTimeNet: toNetSalary(2603),
    wifeInitialPartTimeClass5Net: toNetSalary(1328),
    wifeInitialPartTimeClass3Net: toNetSalary(1648),
    wifeWeeklyHours: toWorkingHours(40),
    existingChildrenCount: 0,
    kindergeldPerChild: toEuroAmount(259),
    enable13thSalary: true,
    bonus40Month: toCalendarMonth(5),
    bonus60Month: toCalendarMonth(11),
    taxReturnMonth: toCalendarMonth(3),
    ...overrides,
  });

  const emptyPregnancies: readonly PregnancyAction[] = [];
  const emptySwitches: readonly TaxClassSwitchAction[] = [];
  const emptyRaises: readonly SalaryRaiseAction[] = [];

  describe("Initial Incomes & Tax Classes", () => {
    it("accurately establishes Scenario A monthly inflow across various income levels", () => {
      const salaryPairs = [
        { hNet: 3000, wNet: 1500, expected: 4500 },
        { hNet: 2895, wNet: 1975, expected: 6125 },
        { hNet: 5200, wNet: 2600, expected: 7800 },
        { hNet: 5000, wNet: 3000, expected: 10000 },
      ];

      for (const pair of salaryPairs) {
        const preexisting = createBasePreexisting({
          husbandInitialNet: toNetSalary(pair.hNet),
          wifeInitialFullTimeNet: toNetSalary(pair.wNet),
        });

        const res = runScenarioBatches({
          scenarioKey: ScenarioId.A,
          preexisting,
          pregnancies: emptyPregnancies,
          taxClassSwitches: emptySwitches,
          salaryRaises: emptyRaises,
        });

        assert.equal(res.months.length, 24);
        res.months.forEach((m) => {
          assert.equal(m.husbandSalary, pair.hNet);
          assert.equal(m.wifeSalary, pair.wNet);
          assert.equal(m.regularMonthlyTotal, pair.expected);
        });
      }
    });

    it("correctly handles zero income boundary states without crashing", () => {
      const preexisting = createBasePreexisting({
        husbandInitialNet: toNetSalary(0),
        husbandInitialClass5Net: toNetSalary(0),
        wifeInitialFullTimeNet: toNetSalary(0),
        wifeInitialClass3FullTimeNet: toNetSalary(0),
      });

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.A,
        preexisting,
        pregnancies: emptyPregnancies,
        taxClassSwitches: emptySwitches,
        salaryRaises: emptyRaises,
      });

      res.months.forEach((m) => {
        assert.equal(m.husbandSalary, 0);
        assert.equal(m.wifeSalary, 0);
      });
    });
  });

  describe("Preexisting Children & Kindergeld (§ 66 EStG)", () => {
    it("pays Kindergeld from Month 1 if existing children are declared in initial state", () => {
      const childCounts = [1, 2, 3, 4];

      for (const count of childCounts) {
        const preexisting = createBasePreexisting({
          existingChildrenCount: count,
          kindergeldPerChild: toEuroAmount(250),
        });

        const res = runScenarioBatches({
          scenarioKey: ScenarioId.B,
          preexisting,
          pregnancies: emptyPregnancies,
          taxClassSwitches: emptySwitches,
          salaryRaises: emptyRaises,
        });

        const expectedKindergeld = count * 250;
        res.months.forEach((m) => {
          assert.equal(m.kindergeld, expectedKindergeld);
        });
      }
    });
  });

  describe("Simulation Start Calendar Dates (Month & Year)", () => {
    it("correctly sets calendar labels and years across all 12 starting calendar months", () => {
      for (let startM = 1; startM <= 12; startM++) {
        const preexisting = createBasePreexisting({
          startCalendarYear: 2026,
          startCalendarMonth: toCalendarMonth(startM),
          simulationDurationMonths: 12,
        });

        const res = runScenarioBatches({
          scenarioKey: ScenarioId.A,
          preexisting,
          pregnancies: emptyPregnancies,
          taxClassSwitches: emptySwitches,
          salaryRaises: emptyRaises,
        });

        assert.equal(res.months.length, 12);

        // Month 1
        assert.equal(res.months[0].calendarMonthNum, startM);
        assert.equal(res.months[0].calendarYearNum, 2026);
        const expectedM1Label = `${String(startM).padStart(2, "0")}.2026`;
        assert.equal(res.months[0].calendarLabel, expectedM1Label);

        // Month 12
        const totalElapsed = startM - 1 + 11;
        const endMonthNum = (totalElapsed % 12) + 1;
        const endYearNum = 2026 + Math.floor(totalElapsed / 12);
        const expectedM12Label = `${String(endMonthNum).padStart(2, "0")}.${endYearNum}`;
        assert.equal(res.months[11].calendarLabel, expectedM12Label);
      }
    });

    it("correctly shifts calendar years across start years 2024 to 2030", () => {
      const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

      for (const y of years) {
        const preexisting = createBasePreexisting({
          startCalendarYear: y,
          startCalendarMonth: toCalendarMonth(6), // June
          simulationDurationMonths: 24,
        });

        const res = runScenarioBatches({
          scenarioKey: ScenarioId.A,
          preexisting,
          pregnancies: emptyPregnancies,
          taxClassSwitches: emptySwitches,
          salaryRaises: emptyRaises,
        });

        assert.equal(res.months[0].calendarLabel, `06.${y}`);
        assert.equal(res.months[12].calendarLabel, `06.${y + 1}`);
        assert.equal(res.months[23].calendarLabel, `05.${y + 2}`);
      }
    });

    it("accurately calculates statutory simulation start date (-3M snapped to January) and Mx counter from pregnancy positive", async () => {
      const { calculateSimulationStartDate } =
        await import("#engine/simulator/timelineGenerator");

      // Example 1: Pregnancy in 09.2026 -> 09.2026 - 3M = 06.2026 -> 01.2026
      const r1 = calculateSimulationStartDate(2026, 9);
      assert.equal(r1.startCalendarYear, 2026);
      assert.equal(r1.startCalendarMonth, 1);
      assert.equal(r1.prePregnancyPlanningMonths, 8);
      assert.equal(r1.pregnancySimulationMonth, 9);

      // Example 2: Pregnancy in 02.2028 -> 02.2028 - 3M = 11.2027 -> 01.2027
      const r2 = calculateSimulationStartDate(2028, 2);
      assert.equal(r2.startCalendarYear, 2027);
      assert.equal(r2.startCalendarMonth, 1);
      assert.equal(r2.prePregnancyPlanningMonths, 13);
      assert.equal(r2.pregnancySimulationMonth, 14);

      // Example 3: Pregnancy in 03.2027 -> 03.2027 - 3M = 12.2026 -> 01.2026
      const r3 = calculateSimulationStartDate(2027, 3);
      assert.equal(r3.startCalendarYear, 2026);
      assert.equal(r3.startCalendarMonth, 1);
      assert.equal(r3.prePregnancyPlanningMonths, 14);
      assert.equal(r3.pregnancySimulationMonth, 15);

      // Example 4: Pregnancy in 04.2027 -> 04.2027 - 3M = 01.2027 -> 01.2027
      const r4 = calculateSimulationStartDate(2027, 4);
      assert.equal(r4.startCalendarYear, 2027);
      assert.equal(r4.startCalendarMonth, 1);
      assert.equal(r4.prePregnancyPlanningMonths, 3);
      assert.equal(r4.pregnancySimulationMonth, 4);

      // Run simulation for Example 1 and verify Mx labels
      const preexisting = createBasePreexisting({
        startCalendarYear: r1.startCalendarYear,
        startCalendarMonth: toCalendarMonth(r1.startCalendarMonth),
        simulationDurationMonths: 24,
      });

      const pregnancies: PregnancyAction[] = [
        {
          pregnancyId: toPregnancyId("PREG-1"),
          childIndex: 1,
          positiveTestCalendarMonth: toCalendarMonth(9),
          positiveTestCalendarYear: 2026,
          positiveTestSimulationMonth: toSimulationMonth(
            r1.pregnancySimulationMonth,
          ),
          calculatedDeliverySimulationMonth: toSimulationMonth(
            r1.pregnancySimulationMonth + 8,
          ),
          motherPostBirthPartTimeHours: toWorkingHours(24),
          motherPostBirthPartTimeClass5Net: toNetSalary(1328),
          motherPostBirthPartTimeClass3Net: toNetSalary(1648),
          fatherPartnerMonthsCount: 4,
        },
      ];

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.C,
        preexisting,
        pregnancies,
        taxClassSwitches: [],
        salaryRaises: [],
      });

      // M1 (01.2026): M-8 · Sim1
      assert.equal(res.months[0].monthId, "M01.2026");
      assert.equal(res.months[0].monthRef, "M-8");
      assert.equal(res.months[0].monthSimRef, "Sim1");
      // M8 (08.2026): M-1 · Sim8
      assert.equal(res.months[7].monthId, "M08.2026");
      assert.equal(res.months[7].monthRef, "M-1");
      assert.equal(res.months[7].monthSimRef, "Sim8");
      // M9 (09.2026): M1 (Pregnancy Positive) · Sim9
      assert.equal(res.months[8].monthId, "M09.2026");
      assert.equal(res.months[8].monthRef, "M1 (Pregnancy Positive)");
      assert.equal(res.months[8].monthSimRef, "Sim9");
      // M10 (10.2026): M2 · Sim10
      assert.equal(res.months[9].monthId, "M10.2026");
      assert.equal(res.months[9].monthRef, "M2");
      assert.equal(res.months[9].monthSimRef, "Sim10");
      // M17 (05.2027): M9 (Birth 1) · Sim17
      assert.equal(res.months[16].monthId, "M05.2027");
      assert.equal(res.months[16].monthRef, "M9 (Birth 1)");
      assert.equal(res.months[16].monthSimRef, "Sim17");
    });
  });

  describe("13th Month Salary Bonuses & Tax Return Timing", () => {
    it("disables bonus rows when enable13thSalary is false", () => {
      const preexisting = createBasePreexisting({
        enable13thSalary: false,
      });

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.A,
        preexisting,
        pregnancies: emptyPregnancies,
        taxClassSwitches: emptySwitches,
        salaryRaises: emptyRaises,
      });

      res.months.forEach((m) => {
        assert.equal(m.bonus40Amount, 0);
        assert.equal(m.bonus60Amount, 0);
        assert.equal(m.specialBonusTotal, 0);
      });
      assert.equal(res.summary.total13thSalaries, 0);
    });

    it("places 40% Vacation Bonus and 60% Christmas Bonus on custom configured calendar months", () => {
      const preexisting = createBasePreexisting({
        enable13thSalary: true,
        startCalendarYear: 2026,
        startCalendarMonth: toCalendarMonth(1),
        bonus40Month: toCalendarMonth(6), // June
        bonus60Month: toCalendarMonth(12), // December
      });

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.A,
        preexisting,
        pregnancies: emptyPregnancies,
        taxClassSwitches: emptySwitches,
        salaryRaises: emptyRaises,
      });

      // Month 6 (June 2026): 40% Vacation Bonus
      const m6 = res.months[5];
      assert.equal(m6.calendarLabel, "06.2026");
      assert.equal(m6.bonus40Amount, Math.round(0.4 * 2895));
      assert.equal(m6.bonus60Amount, 0);

      // Month 12 (December 2026): 60% Christmas Bonus
      const m12 = res.months[11];
      assert.equal(m12.calendarLabel, "12.2026");
      assert.equal(m12.bonus40Amount, 0);
      assert.equal(m12.bonus60Amount, Math.round(0.6 * 2895));
    });

    it("places Annual Tax Return refunds on custom configured filing month", () => {
      const preexisting = createBasePreexisting({
        startCalendarYear: 2026,
        startCalendarMonth: toCalendarMonth(1),
        taxReturnMonth: toCalendarMonth(4), // April
        simulationDurationMonths: 24,
      });

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.A,
        preexisting,
        pregnancies: emptyPregnancies,
        taxClassSwitches: emptySwitches,
        salaryRaises: emptyRaises,
      });

      // Month 4 (April 2026) -> Receives refund for 2025
      const m4 = res.months[3];
      assert.equal(m4.calendarLabel, "04.2026");
      assert.equal(m4.taxRefund, 850);

      // Month 16 (April 2027) -> Receives refund for 2026
      const m16 = res.months[15];
      assert.equal(m16.calendarLabel, "04.2027");
      assert.equal(m16.taxRefund, 850);

      // Other months have 0 tax refund
      assert.equal(res.months[0].taxRefund, 0);
      assert.equal(res.months[2].taxRefund, 0);
    });
  });
});
