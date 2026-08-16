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

describe('Sandbox Unit Tests: Initial State & Preexisting Conditions (Batch 0)', () => {
  const createBasePreexisting = (overrides: Partial<PreexistingConditions> = {}): PreexistingConditions => ({
    startCalendarYear: 2026,
    startCalendarMonth: toCalendarMonth(1),
    simulationDurationMonths: 24,
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
    taxReturnMonth: toCalendarMonth(3),
    ...overrides
  });

  const emptyPregnancies: readonly PregnancyAction[] = [];
  const emptySwitches: readonly TaxClassSwitchAction[] = [];
  const emptyRaises: readonly SalaryRaiseAction[] = [];

  describe('Initial Incomes & Tax Classes', () => {
    it('accurately establishes Scenario A monthly inflow across various income levels', () => {
      const salaryPairs = [
        { hNet: 3000, wNet: 1500, expected: 4500 },
        { hNet: 2895, wNet: 1975, expected: 6125 },
        { hNet: 5200, wNet: 2600, expected: 7800 },
        { hNet: 5000, wNet: 3000, expected: 10000 }
      ];

      for (const pair of salaryPairs) {
        const preexisting = createBasePreexisting({
          husbandInitialNet: toNetSalary(pair.hNet),
          wifeInitialFullTimeNet: toNetSalary(pair.wNet)
        });

        const res = runScenarioBatches({
          scenarioKey: ScenarioId.A,
          preexisting,
          pregnancies: emptyPregnancies,
          taxClassSwitches: emptySwitches,
          salaryRaises: emptyRaises
        });

        assert.equal(res.months.length, 24);
        res.months.forEach((m) => {
          assert.equal(m.husbandSalary, pair.hNet);
          assert.equal(m.wifeSalary, pair.wNet);
          assert.equal(m.regularMonthlyTotal, pair.expected);
        });
      }
    });

    it('correctly handles zero income boundary states without crashing', () => {
      const preexisting = createBasePreexisting({
        husbandInitialNet: toNetSalary(0),
        husbandInitialClass5Net: toNetSalary(0),
        wifeInitialFullTimeNet: toNetSalary(0),
        wifeInitialClass3FullTimeNet: toNetSalary(0)
      });

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.A,
        preexisting,
        pregnancies: emptyPregnancies,
        taxClassSwitches: emptySwitches,
        salaryRaises: emptyRaises
      });

      res.months.forEach((m) => {
        assert.equal(m.husbandSalary, 0);
        assert.equal(m.wifeSalary, 0);
      });
    });
  });

  describe('Preexisting Children & Kindergeld (§ 66 EStG)', () => {
    it('pays Kindergeld from Month 1 if existing children are declared in initial state', () => {
      const childCounts = [1, 2, 3, 4];

      for (const count of childCounts) {
        const preexisting = createBasePreexisting({
          existingChildrenCount: count,
          kindergeldPerChild: toEuroAmount(250)
        });

        const res = runScenarioBatches({
          scenarioKey: ScenarioId.B,
          preexisting,
          pregnancies: emptyPregnancies,
          taxClassSwitches: emptySwitches,
          salaryRaises: emptyRaises
        });

        const expectedKindergeld = count * 250;
        res.months.forEach((m) => {
          assert.equal(m.kindergeld, expectedKindergeld);
        });
      }
    });
  });

  describe('Simulation Start Calendar Dates (Month & Year)', () => {
    it('correctly sets calendar labels and years across all 12 starting calendar months', () => {
      for (let startM = 1; startM <= 12; startM++) {
        const preexisting = createBasePreexisting({
          startCalendarYear: 2026,
          startCalendarMonth: toCalendarMonth(startM),
          simulationDurationMonths: 12
        });

        const res = runScenarioBatches({
          scenarioKey: ScenarioId.A,
          preexisting,
          pregnancies: emptyPregnancies,
          taxClassSwitches: emptySwitches,
          salaryRaises: emptyRaises
        });

        assert.equal(res.months.length, 12);

        // Month 1
        assert.equal(res.months[0].calendarMonthNum, startM);
        assert.equal(res.months[0].calendarYearNum, 2026);
        const expectedM1Label = `${String(startM).padStart(2, '0')}.2026`;
        assert.equal(res.months[0].calendarLabel, expectedM1Label);

        // Month 12
        const totalElapsed = (startM - 1) + 11;
        const endMonthNum = (totalElapsed % 12) + 1;
        const endYearNum = 2026 + Math.floor(totalElapsed / 12);
        const expectedM12Label = `${String(endMonthNum).padStart(2, '0')}.${endYearNum}`;
        assert.equal(res.months[11].calendarLabel, expectedM12Label);
      }
    });

    it('correctly shifts calendar years across start years 2024 to 2030', () => {
      const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

      for (const y of years) {
        const preexisting = createBasePreexisting({
          startCalendarYear: y,
          startCalendarMonth: toCalendarMonth(6), // June
          simulationDurationMonths: 24
        });

        const res = runScenarioBatches({
          scenarioKey: ScenarioId.A,
          preexisting,
          pregnancies: emptyPregnancies,
          taxClassSwitches: emptySwitches,
          salaryRaises: emptyRaises
        });

        assert.equal(res.months[0].calendarLabel, `06.${y}`);
        assert.equal(res.months[12].calendarLabel, `06.${y + 1}`);
        assert.equal(res.months[23].calendarLabel, `05.${y + 2}`);
      }
    });
  });

  describe('13th Month Salary Bonuses & Tax Return Timing', () => {
    it('disables bonus rows when enable13thSalary is false', () => {
      const preexisting = createBasePreexisting({
        enable13thSalary: false
      });

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.A,
        preexisting,
        pregnancies: emptyPregnancies,
        taxClassSwitches: emptySwitches,
        salaryRaises: emptyRaises
      });

      res.months.forEach((m) => {
        assert.equal(m.bonus40Amount, 0);
        assert.equal(m.bonus60Amount, 0);
        assert.equal(m.specialBonusTotal, 0);
      });
      assert.equal(res.summary.total13thSalaries, 0);
    });

    it('places 40% Vacation Bonus and 60% Christmas Bonus on custom configured calendar months', () => {
      const preexisting = createBasePreexisting({
        enable13thSalary: true,
        startCalendarYear: 2026,
        startCalendarMonth: toCalendarMonth(1),
        bonus40Month: toCalendarMonth(6), // June
        bonus60Month: toCalendarMonth(12) // December
      });

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.A,
        preexisting,
        pregnancies: emptyPregnancies,
        taxClassSwitches: emptySwitches,
        salaryRaises: emptyRaises
      });

      // Month 6 (June 2026): 40% Vacation Bonus
      const m6 = res.months[5];
      assert.equal(m6.calendarLabel, '06.2026');
      assert.equal(m6.bonus40Amount, Math.round(0.40 * 2895));
      assert.equal(m6.bonus60Amount, 0);

      // Month 12 (December 2026): 60% Christmas Bonus
      const m12 = res.months[11];
      assert.equal(m12.calendarLabel, '12.2026');
      assert.equal(m12.bonus40Amount, 0);
      assert.equal(m12.bonus60Amount, Math.round(0.60 * 2895));
    });

    it('places Annual Tax Return refunds on custom configured filing month', () => {
      const preexisting = createBasePreexisting({
        startCalendarYear: 2026,
        startCalendarMonth: toCalendarMonth(1),
        taxReturnMonth: toCalendarMonth(4), // April
        simulationDurationMonths: 24
      });

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.A,
        preexisting,
        pregnancies: emptyPregnancies,
        taxClassSwitches: emptySwitches,
        salaryRaises: emptyRaises
      });

      // Month 4 (April 2026) -> Receives refund for 2025
      const m4 = res.months[3];
      assert.equal(m4.calendarLabel, '04.2026');
      assert.equal(m4.taxRefund, 850);

      // Month 16 (April 2027) -> Receives refund for 2026
      const m16 = res.months[15];
      assert.equal(m16.calendarLabel, '04.2027');
      assert.equal(m16.taxRefund, 850);

      // Other months have 0 tax refund
      assert.equal(res.months[0].taxRefund, 0);
      assert.equal(res.months[2].taxRefund, 0);
    });
  });
});
