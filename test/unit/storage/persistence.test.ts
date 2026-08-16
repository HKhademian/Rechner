import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ELTERNGELD_STORAGE_KEY,
  getDefaultPersistedState,
  validateAndSanitizePersistedState,
  serializeState,
  deserializeState,
  saveToStorage,
  loadFromStorage,
  clearStorage,
  type ElterngeldPersistedState
} from '#engine/storage/persistence';
import { SalaryInputMode, SalaryPeriod, ScenarioId, TaxClass, FinancialEventCategory, toEuroAmount, toSimulationMonth, toCalendarMonth, toFinancialEventId } from '#engine/types';

describe('Storage Persistence Engine (Elterngeld State Persistence)', () => {
  it('returns valid statutory default state with complete batch collections', () => {
    const defaults = getDefaultPersistedState();

    assert.equal(defaults.salaryInputMode, SalaryInputMode.Gross);
    assert.equal(defaults.salaryPeriod, SalaryPeriod.Monthly);
    assert.equal(defaults.husbandGross, 4500);
    assert.equal(defaults.wifeGross, 3000);
    assert.equal(defaults.husbandHours, 32);
    assert.equal(defaults.wifeInitialHours, 40);
    assert.equal(defaults.wifePostBirthHours, 24);
    assert.equal(defaults.startCalendarYear, 2026);
    assert.equal(defaults.simulationDurationMonths, 60);

    assert.equal(defaults.customPregnancies.length, 2);
    assert.equal(defaults.customTaxClassSwitches.length, 2);
    assert.equal(defaults.customFinancialEvents.length, 2);
    assert.equal(defaults.activeScenario, ScenarioId.C);
  });

  it('performs lossless roundtrip serialization and deserialization of complete state', () => {
    const original = getDefaultPersistedState();
    const modified: ElterngeldPersistedState = {
      ...original,
      husbandGross: 7500,
      wifeGross: 4200,
      wifePostBirthHours: 28,
      annualBonusGross: 5000,
      annualBonusMonth: 6,
      investmentReturnMonthly: 250,
      annualSalaryRaisePercent: 3,
      enableSalaryRaises: true,
      customFinancialEvents: [
        ...original.customFinancialEvents,
        {
          eventId: toFinancialEventId('FIN-CUSTOM-VACATION'),
          effectiveSimulationMonth: toSimulationMonth(30),
          effectiveCalendarMonth: toCalendarMonth(6),
          effectiveCalendarYear: 2028,
          title: 'Family Summer Vacation',
          amount: toEuroAmount(-2500),
          category: FinancialEventCategory.Vacation,
          description: 'Special summer family trip'
        }
      ]
    };

    const serialized = serializeState(modified);
    assert.ok(typeof serialized === 'string');

    const deserialized = deserializeState(serialized);
    assert.equal(deserialized.husbandGross, 7500);
    assert.equal(deserialized.wifeGross, 4200);
    assert.equal(deserialized.wifePostBirthHours, 28);
    assert.equal(deserialized.annualBonusGross, 5000);
    assert.equal(deserialized.annualBonusMonth, 6);
    assert.equal(deserialized.investmentReturnMonthly, 250);
    assert.equal(deserialized.annualSalaryRaisePercent, 3);
    assert.equal(deserialized.enableSalaryRaises, true);
    assert.equal(deserialized.customFinancialEvents.length, 3);
    assert.equal(deserialized.customFinancialEvents[2].title, 'Family Summer Vacation');
    assert.equal(deserialized.customFinancialEvents[2].amount, -2500);
  });

  it('recovers gracefully from corrupted JSON strings by returning statutory defaults', () => {
    const corrupt1 = deserializeState('{ invalid json string ...');
    assert.equal(corrupt1.husbandGross, 4500);

    const corrupt2 = deserializeState('');
    assert.equal(corrupt2.wifeGross, 3000);

    const corrupt3 = deserializeState('null');
    assert.equal(corrupt3.activeScenario, ScenarioId.C);
  });

  it('sanitizes and validates malformed or partial objects with missing fields and type mismatches', () => {
    const partialRaw = {
      husbandGross: 'invalid_number',
      wifeGross: 4800,
      salaryInputMode: 'INVALID_MODE',
      salaryPeriod: 'YEARLY',
      wifePostBirthHours: -10, // out of bounds
      customPregnancies: 'not_an_array',
      unknownExtraField: 'ignored'
    };

    const sanitized = validateAndSanitizePersistedState(partialRaw);

    // Fallbacks to default for invalid types
    assert.equal(sanitized.husbandGross, 4500);
    assert.equal(sanitized.salaryInputMode, SalaryInputMode.Gross);

    // Preserves valid fields
    assert.equal(sanitized.wifeGross, 4800);
    assert.equal(sanitized.salaryPeriod, SalaryPeriod.Yearly);

    // Clamps out of bounds
    assert.equal(sanitized.wifePostBirthHours, 0);

    // Reconstructs defaults for non-array collections
    assert.equal(sanitized.customPregnancies.length, 2);
    assert.equal(sanitized.customFinancialEvents.length, 2);
  });

  describe('Storage Mocking & Browser Environment Guards', () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
      mockStorage = {};
      // Mock global window & localStorage in node environment
      (globalThis as any).window = globalThis;
      (globalThis as any).localStorage = {
        getItem: (k: string) => mockStorage[k] ?? null,
        setItem: (k: string, v: string) => { mockStorage[k] = v; },
        removeItem: (k: string) => { delete mockStorage[k]; },
        clear: () => { mockStorage = {}; }
      };
    });

    afterEach(() => {
      delete (globalThis as any).window;
      delete (globalThis as any).localStorage;
    });

    it('saves state, loads state, and clears state via localStorage adapter', () => {
      const state = getDefaultPersistedState();
      const updated: ElterngeldPersistedState = {
        ...state,
        husbandGross: 8000,
        wifeGross: 4000
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
      assert.equal(afterClear.husbandGross, 4500); // defaults restored
    });
  });
});
