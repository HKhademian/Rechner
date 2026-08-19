import {
  describe,
  it,
  beforeEach,
  afterEach,
} from "node:test";
import assert from "node:assert/strict";
import {
  type ElterngeldPersistedState,
  ELTERNGELD_STORAGE_KEY,
  getDefaultPersistedState,
  getDefaultScenarioPersistedState,
  getTestPersistedState,
  getEmptyPersistedState,
  getUserPersistedState,
  hasUserScenario,
  setUserScenarioOverride,
  validateAndSanitizePersistedState,
  serializeState,
  deserializeState,
  saveToStorage,
  loadFromStorage,
  clearStorage,
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
  it("returns valid canonical test state with complete batch collections", () => {
    const testState = getTestPersistedState();

    assert.equal(testState.salaryInputMode, SalaryInputMode.Gross);
    assert.equal(testState.salaryPeriod, SalaryPeriod.Monthly);
    assert.equal(testState.husbandGross, 4000);
    assert.equal(testState.wifeGross, 3000);
    assert.equal(testState.husbandHours, 32);
    assert.equal(testState.wifeInitialHours, 40);
    assert.equal(testState.wifePostBirthHours, 32);
    assert.equal(testState.startCalendarYear, 2026);
    assert.equal(testState.simulationDurationMonths, 72);

    assert.equal(testState.customPregnancies.length, 3);
    assert.equal(testState.customTaxClassSwitches.length, 2);
    assert.equal(testState.customFinancialEvents.length, 2);
    assert.equal(testState.activeScenario, ActiveScenarioView.C);
    assert.equal(testState.chartMode, TimelineChartMode.StackedBar);
    assert.equal(testState.timeRangeFilter, TimelineTimeRangeFilter.All);
  });

  it("returns valid repository default persisted state conforming to persistence schema", () => {
    const defaults = getDefaultPersistedState();
    assert.ok(defaults.husbandGross >= 0);
    assert.ok(defaults.wifeGross >= 0);
    assert.ok(defaults.simulationDurationMonths >= 12);
    assert.ok(Array.isArray(defaults.customPregnancies));
    assert.ok(Array.isArray(defaults.customTaxClassSwitches));
  });

  it("correctly prioritizes optional user scenario over default scenario when provided", () => {
    setUserScenarioOverride(null);
    assert.equal(hasUserScenario(), false);
    assert.equal(getUserPersistedState(), null);

    const repoDefault = getDefaultScenarioPersistedState();
    assert.equal(
      getDefaultPersistedState().husbandGross,
      repoDefault.husbandGross,
    );

    const customUserPayload = {
      simulationState: {
        ...repoDefault,
        husbandGross: 9876,
        wifeGross: 5432,
      },
    };
    setUserScenarioOverride(customUserPayload);
    assert.equal(hasUserScenario(), true);
    assert.equal(getUserPersistedState()?.husbandGross, 9876);
    assert.equal(getDefaultPersistedState().husbandGross, 9876);
    assert.equal(getDefaultPersistedState().wifeGross, 5432);

    setUserScenarioOverride(null);
    assert.equal(hasUserScenario(), false);
    assert.equal(
      getDefaultPersistedState().husbandGross,
      repoDefault.husbandGross,
    );
  });

  it("performs lossless roundtrip serialization and deserialization of complete state", () => {
    const original = getTestPersistedState();
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
    const testFallback = getTestPersistedState();
    const corrupt1 = deserializeState(
      "{ invalid json string ...",
      testFallback,
    );
    assert.equal(corrupt1.husbandGross, testFallback.husbandGross);

    const corrupt2 = deserializeState("", testFallback);
    assert.equal(corrupt2.wifeGross, testFallback.wifeGross);

    const corrupt3 = deserializeState("null", testFallback);
    assert.equal(corrupt3.activeScenario, testFallback.activeScenario);
    assert.equal(corrupt3.chartMode, testFallback.chartMode);
  });

  it("sanitizes and validates malformed or partial objects with missing fields and type mismatches", () => {
    const testFallback = getTestPersistedState();
    const partialRaw = {
      husbandGross: "invalid_number",
      wifeGross: 4800,
      salaryInputMode: "INVALID_MODE",
      salaryPeriod: "YEARLY",
      wifePostBirthHours: -10, // out of bounds -> clamped to 0
      customPregnancies: "not_an_array",
      unknownExtraField: "ignored",
    };

    const sanitized = validateAndSanitizePersistedState(
      partialRaw,
      testFallback,
    );

    // Fallbacks to default for invalid types
    assert.equal(sanitized.husbandGross, testFallback.husbandGross);
    assert.equal(sanitized.salaryInputMode, testFallback.salaryInputMode);

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

  it("loads canonical empty scenario with 0 actions across all batches", () => {
    const emptyState = getEmptyPersistedState();

    assert.equal(emptyState.customPregnancies.length, 0);
    assert.equal(emptyState.customTaxClassSwitches.length, 0);
    assert.equal(emptyState.customSalaryRaises.length, 0);
    assert.equal(emptyState.customWorkingHoursChanges?.length, 0);
    assert.equal(emptyState.customFinancialEvents.length, 0);
    assert.equal(emptyState.husbandGross, 4000);
    assert.equal(emptyState.wifeGross, 3000);
  });

  it("strictly preserves empty arrays for custom action collections during validation", () => {
    const emptyActionsPayload = {
      husbandGross: 6000,
      wifeGross: 3000,
      customPregnancies: [],
      customTaxClassSwitches: [],
      customSalaryRaises: [],
      customWorkingHoursChanges: [],
      customFinancialEvents: [],
    };

    const sanitized = validateAndSanitizePersistedState(emptyActionsPayload);

    assert.equal(sanitized.husbandGross, 6000);
    assert.equal(sanitized.customPregnancies.length, 0);
    assert.equal(sanitized.customTaxClassSwitches.length, 0);
    assert.equal(sanitized.customSalaryRaises.length, 0);
    assert.equal(sanitized.customWorkingHoursChanges?.length, 0);
    assert.equal(sanitized.customFinancialEvents.length, 0);
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
      assert.equal(
        afterClear.husbandGross,
        getDefaultPersistedState().husbandGross,
      ); // defaults restored
    });

    it("correctly persists and restores empty action arrays without reviving defaults", () => {
      const emptyState: ElterngeldPersistedState = {
        ...getDefaultPersistedState(),
        customPregnancies: [],
        customTaxClassSwitches: [],
        customSalaryRaises: [],
        customWorkingHoursChanges: [],
        customFinancialEvents: [],
      };

      const saved = saveToStorage(emptyState);
      assert.equal(saved, true);

      const loaded = loadFromStorage();
      assert.equal(loaded.customPregnancies.length, 0);
      assert.equal(loaded.customTaxClassSwitches.length, 0);
      assert.equal(loaded.customSalaryRaises.length, 0);
      assert.equal(loaded.customWorkingHoursChanges?.length, 0);
      assert.equal(loaded.customFinancialEvents.length, 0);
    });
  });
});
