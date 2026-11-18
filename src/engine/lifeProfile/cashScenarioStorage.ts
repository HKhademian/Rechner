import {
  type CashScenarioRecord,
  type DecodedCashScenarios,
  CASH_SCENARIO_STORAGE_KEY,
  CashScenarioStatus,
  decodeCashScenarios,
} from "#engine/lifeProfile/cashScenarioRecord";
import {
  browserWebStorageForCurrentMode,
} from "#engine/storage/appStorage";

export function readCashScenarios(): DecodedCashScenarios {
  try {
    const storage = browserWebStorageForCurrentMode();
    return storage ? decodeCashScenarios(storage.getItem(CASH_SCENARIO_STORAGE_KEY)) : { status: CashScenarioStatus.Invalid };
  }
  catch {
    return { status: CashScenarioStatus.Invalid };
  }
}

/** Refuse unreadable records and stale edits rather than discarding other changes. */
export function writeCashScenarios(record: CashScenarioRecord, expected: CashScenarioRecord): boolean {
  try {
    const storage = browserWebStorageForCurrentMode();
    if (!storage) {
      return false;
    }
    const current = decodeCashScenarios(storage.getItem(CASH_SCENARIO_STORAGE_KEY));
    const serialized = JSON.stringify(record);
    const unchanged = current.status === CashScenarioStatus.Missing ? expected.scenarios.length === 0
      : current.status === CashScenarioStatus.Valid && JSON.stringify(current.record) === JSON.stringify(expected);
    if (!unchanged || decodeCashScenarios(serialized).status !== CashScenarioStatus.Valid) {
      return false;
    }
    storage.setItem(CASH_SCENARIO_STORAGE_KEY, serialized);
    return true;
  }
  catch {
    return false;
  }
}
