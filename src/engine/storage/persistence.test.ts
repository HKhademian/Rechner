import {
  describe, it, beforeEach, afterEach, 
} from "node:test";
import assert from "node:assert/strict";
import {
  ELTERNGELD_STORAGE_KEY,
  getDefaultPersistedState,
  validateAndSanitizePersistedState,
  serializeState,
  deserializeState,
  saveToStorage,
  loadFromStorage,
  clearStorage,
  type ElterngeldPersistedState,
} from "#engine/storage/persistence";
import {
  SalaryInputMode,
  SalaryPeriod,
  ActiveScenarioView,
  TimelineChartMode,
  TimelineTimeRangeFilter,
  FinancialEventCategory,
  toEuroAmount,
  toGrossSalary,
  toWorkingHours,
  toSimulationMonth,
  toCalendarMonth,
  toFullCalendarYear,
  toFinancialEventId,
} from "#engine/types";

describe("Storage Persistence Engine (Elterngeld State Persistence)", () => {
  it("returns valid statutory default state with complete batch collections", () => {
    const defaults = getDefaultPersistedState();

    assert.equal(defaults.salaryInputMode, SalaryInputMode.Gross);
    assert.equal(defaults.salaryPeriod, SalaryPeriod.Monthly);
    assert.equal(defaults.husbandGross, 4000);
    assert.equal(defaults.wifeGross, 3000);
    assert.equal(defaults.husbandHours, 32);
    assert.equal(defaults.wifeInitialHours, 40);
    assert.equal(defaults.wifePostBirthHours, 32);
    assert.equal(defaults.startCalendarYear, 2026);
    assert.equal(defaults.simulationDurationMonths, 72);

    assert.equal(defaults.customPregnancies.length, 3);
    assert.equal(defaults.customTaxClassSwitches.length, 1);
    assert.equal(defaults.customFinancialEvents.length, 2);
    assert.equal(defaults.activeScenario, ActiveScenarioView.C);
    assert.equal(defaults.chartMode, TimelineChartMode.StackedBar);
    assert.equal(defaults.timeRangeFilter, TimelineTimeRangeFilter.All);
  });

  it("performs lossless roundtrip serialization and deserialization of complete state", () => {
    const original = getDefaultPersistedState();
    const modified: ElterngeldPersistedState = {
      ...original,
      husbandGross: toGrossSalary(7500),
      wifeGross: toGrossSalary(4200),
      wifePostBirthHours: toWorkingHours(28),
      annualBonusGross: toGrossSalary(5000),
      annualBonusMonth: toCalendarMonth(6),
      investmentReturnMonthly: toEuroAmount(250),
      annualSalaryRaisePercent: 3,
      enableSalaryRaises: true,
      activeScenario: ActiveScenarioView.B,
      chartMode: TimelineChartMode.Area,
      timeRangeFilter: TimelineTimeRangeFilter.Child1,
      customFinancialEvents: [
        ...original.customFinancialEvents,
        {
          eventId: toFinancialEventId("FIN-CUSTOM-VACATION"),
          effectiveSimulationMonth: toSimulationMonth(30),
          effectiveCalendarMonth: toCalendarMonth(6),
          effectiveCalendarYear: toFullCalendarYear(2028),
          title: "Family Summer Vacation",
          amount: toEuroAmount(-2500),
          category: FinancialEventCategory.CustomSpecial,
          description: "Special summer family trip",
        },
      ],
    };

    const serialized = serializeState(modified);
    assert.ok(typeof serialized === "string");

    const deserialized = deserializeState(serialized);
    assert.equal(deserialized.husbandGross, 7500);
    assert.equal(deserialized.wifeGross, 4200);
    assert.equal(deserialized.wifePostBirthHours, 28);
    assert.equal(deserialized.annualBonusGross, 5000);
    assert.equal(deserialized.annualBonusMonth, 6);
    assert.equal(deserialized.investmentReturnMonthly, 250);
    assert.equal(deserialized.annualSalaryRaisePercent, 3);
    assert.equal(deserialized.enableSalaryRaises, true);
    assert.equal(deserialized.activeScenario, ActiveScenarioView.B);
    assert.equal(deserialized.chartMode, TimelineChartMode.Area);
    assert.equal(deserialized.timeRangeFilter, TimelineTimeRangeFilter.Child1);
    assert.equal(deserialized.customFinancialEvents.length, 3);
    assert.equal(
      deserialized.customFinancialEvents[2].title,
      "Family Summer Vacation",
    );
    assert.equal(deserialized.customFinancialEvents[2].amount, -2500);
    assert.equal(
      deserialized.customFinancialEvents[2].category,
      FinancialEventCategory.CustomSpecial,
    );
  });

  it("recovers gracefully from corrupted JSON strings by returning statutory defaults", () => {
    const corrupt1 = deserializeState("{ invalid json string ...");
    assert.equal(corrupt1.husbandGross, 4000);

    const corrupt2 = deserializeState("");
    assert.equal(corrupt2.wifeGross, 3000);

    const corrupt3 = deserializeState("null");
    assert.equal(corrupt3.activeScenario, ActiveScenarioView.C);
    assert.equal(corrupt3.chartMode, TimelineChartMode.StackedBar);
  });

  it("sanitizes and validates malformed or partial objects with missing fields and type mismatches", () => {
    const partialRaw = {
      husbandGross: "invalid_number",
      wifeGross: 4800,
      salaryInputMode: "INVALID_MODE",
      salaryPeriod: "YEARLY",
      wifePostBirthHours: -10, // out of bounds -> clamped to 0
      customPregnancies: "not_an_array",
      unknownExtraField: "ignored",
    };

    const sanitized = validateAndSanitizePersistedState(partialRaw);

    // Fallbacks to default for invalid types
    assert.equal(sanitized.husbandGross, 4000);
    assert.equal(sanitized.salaryInputMode, SalaryInputMode.Gross);

    // Preserves valid fields
    assert.equal(sanitized.wifeGross, 4800);
    assert.equal(sanitized.salaryPeriod, SalaryPeriod.Yearly);

    // Clamps out of bounds
    assert.equal(sanitized.wifePostBirthHours, 0);

    // Reconstructs defaults for non-array collections
    assert.equal(sanitized.customPregnancies.length, 3);
    assert.equal(sanitized.customFinancialEvents.length, 2);
  });

  it("transparently extracts simulationState from exported metadata envelopes", () => {
    const envelope = {
      metadata: {
        version: 1,
        exportedAt: "2026-08-17T23:30:00.000Z",
        application:
          "German Elterngeld & Parental Leave 5-Year Financial Simulator",
        format: "JSON",
      },
      simulationState: {
        husbandGross: 7200,
        wifeGross: 4100,
        husbandHours: 35,
        wifeInitialHours: 38,
        activeScenario: "B",
      },
    };

    const sanitized = validateAndSanitizePersistedState(envelope);
    assert.equal(sanitized.husbandGross, 7200);
    assert.equal(sanitized.wifeGross, 4100);
    assert.equal(sanitized.husbandHours, 35);
    assert.equal(sanitized.wifeInitialHours, 38);
    assert.equal(sanitized.activeScenario, ActiveScenarioView.B);
  });

  it("normalizes salary raise percentage values from whole numbers to decimal ratios", () => {
    const stateWithPercentageNumbers = {
      customSalaryRaises: [
        {
          raiseId: "RAISE-Y2",
          effectiveSimulationMonth: 13,
          effectiveCalendarMonth: 1,
          effectiveCalendarYear: 2027,
          targetPerson: "BOTH",
          percentageIncrease: 5, // 5% entered as 5 -> normalized to 0.05
          reason: "Tariff adjustment",
        },
        {
          raiseId: "RAISE-Y3",
          effectiveSimulationMonth: 25,
          effectiveCalendarMonth: 1,
          effectiveCalendarYear: 2028,
          targetPerson: "WIFE",
          percentageIncrease: 0.03, // 3% entered as decimal 0.03 -> preserved
          reason: "Merit step",
        },
      ],
    };

    const sanitized = validateAndSanitizePersistedState(
      stateWithPercentageNumbers,
    );
    assert.equal(sanitized.customSalaryRaises.length, 2);
    assert.equal(sanitized.customSalaryRaises[0].percentageIncrease, 0.05);
    assert.equal(sanitized.customSalaryRaises[1].percentageIncrease, 0.03);
  });

  describe("Storage Mocking & Browser Environment Guards", () => {
    let mockStorage: Record<string, string> = {};

    const createMockStorage = (): Storage => ({
      getItem: (k: string) => mockStorage[k] ?? null,
      setItem: (k: string, v: string) => {
        mockStorage[k] = v;
      },
      removeItem: (k: string) => {
        delete mockStorage[k];
      },
      clear: () => {
        mockStorage = {};
      },
      key: (index: number) => Object.keys(mockStorage)[index] ?? null,
      get length() {
        return Object.keys(mockStorage).length;
      },
    });

    beforeEach(() => {
      mockStorage = {};
      // Mock global window & localStorage in node environment using ES reflection
      Object.defineProperty(globalThis, "window", {
        value: globalThis,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, "localStorage", {
        value: createMockStorage(),
        configurable: true,
        writable: true,
      });
    });

    afterEach(() => {
      Reflect.deleteProperty(globalThis, "window");
      Reflect.deleteProperty(globalThis, "localStorage");
    });

    it("saves state, loads state, and clears state via localStorage adapter", () => {
      const state = getDefaultPersistedState();
      const updated: ElterngeldPersistedState = {
        ...state,
        husbandGross: toGrossSalary(8000),
        wifeGross: toGrossSalary(4000),
      };

      const saved = saveToStorage(updated);
      assert.equal(saved, true);
      assert.ok(mockStorage[ELTERNGELD_STORAGE_KEY]);

      const loaded = loadFromStorage();
      assert.equal(loaded.husbandGross, 8000);
      assert.equal(loaded.wifeGross, 4000);

      const cleared = clearStorage();
      assert.equal(cleared, true);
      assert.equal(mockStorage[ELTERNGELD_STORAGE_KEY], undefined);

      const afterClear = loadFromStorage();
      assert.equal(afterClear.husbandGross, 4000); // defaults restored
    });
  });
});
