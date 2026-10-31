import {
  type AppId,
  AppId as Apps,
} from "#/apps/appDefinition.ts";

type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export interface AppStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): boolean;
  removeItem(key: string): boolean;
}

/** Only this app's owned legacy keys are copied. Old keys remain available for recovery. */
const legacyKeys: Readonly<Record<AppId, Readonly<Record<string, string>>>> = {
  [Apps.Catalog]: { theme: "german_calc_theme_mode" },
  [Apps.NetPay]: Object.fromEntries([
    "inputMode", "grossIncome", "taxBracket", "hasChurchTax", "state", "children", "workingMonths", "salariesPerYear",
    "hasPartner", "partnerGrossIncome", "partnerTaxBracket", "partnerHasChurchTax", "partnerState", "partnerWorkingMonths", "partnerSalariesPerYear",
    "payroll_personal", "payroll_partnerPersonal", "payroll_factor", "payroll_taxYear", "savedScenarios",
  ].map((key) => [key, key]).concat([["theme", "german_calc_theme_mode"]])),
  [Apps.ParentalLeave]: { state: "elterngeld_simulator_state_v1",
    theme: "german_calc_theme_mode" },
};

export function appStorageKey(app: AppId, key: string): string {
  if (!key.trim()) {
    throw new TypeError("An app storage field must have a name.");
  }
  return `rechner:${app}:v1:${key}`;
}

/** A completion marker prevents cleared app data from being revived by an old legacy key. */
export function createAppStorage(app: AppId, storage: BrowserStorage): AppStorage {
  const marker = appStorageKey(app, "legacy-migrated");
  const migrate = (): void => {
    if (storage.getItem(marker) !== null) {
      return;
    }
    for (const [field, oldKey] of Object.entries(legacyKeys[app])) {
      const key = appStorageKey(app, field);
      if (storage.getItem(key) === null) {
        const value = storage.getItem(oldKey);
        if (value !== null) {
          storage.setItem(key, value);
        }
      }
    }
    storage.setItem(marker, "1");
  };
  return {
    getItem(key) {
      try {
        migrate();
      }
      catch {
        // Quota failures may leave a partial copy; prefer copied values and read legacy until completion.
      }
      try {
        const value = storage.getItem(appStorageKey(app, key));
        if (value !== null) {
          return value;
        }
        const legacy = legacyKeys[app][key];
        return storage.getItem(marker) === null && legacy ? storage.getItem(legacy) : null;
      }
      catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        migrate();
        storage.setItem(appStorageKey(app, key), value);
        return true;
      }
      catch {
        return false;
      }
    },
    removeItem(key) {
      try {
        migrate();
        storage.removeItem(appStorageKey(app, key));
        return true;
      }
      catch {
        return false;
      }
    },
  };
}

/** Resolve browser storage on access so SSR and blocked/private storage remain usable. */
export function browserAppStorage(app: AppId): AppStorage {
  const access = <T>(fallback: T, operation: (storage: AppStorage) => T): T => {
    try {
      return typeof window === "undefined" ? fallback : operation(createAppStorage(app, localStorage));
    }
    catch {
      return fallback;
    }
  };
  return {
    getItem: (key) => access(null, (storage) => storage.getItem(key)),
    setItem: (key, value) => access(false, (storage) => storage.setItem(key, value)),
    removeItem: (key) => access(false, (storage) => storage.removeItem(key)),
  };
}
