import {
  type AppId,
  AppId as Apps,
} from "#/apps/appDefinition.ts";

type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type EnumerableBrowserStorage = BrowserStorage & Pick<Storage, "length" | "key">;

export const StorageMode = {
  Memory: "memory",
  Session: "session",
  Persistent: "persistent",
} as const;
export type StorageMode = (typeof StorageMode)[keyof typeof StorageMode];

export function toStorageMode(value: string): StorageMode {
  if (!Object.values(StorageMode).includes(value as StorageMode)) {
    throw new TypeError(`Unknown storage mode: ${value}`);
  }
  return value as StorageMode;
}

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

const memoryStores = new Map<AppId, Map<string, string>>();
const storageModeKey = (app: AppId): string => `rechner:privacy:${app}:storage-mode:v1`;

function memoryStorage(app: AppId): EnumerableBrowserStorage {
  let values = memoryStores.get(app);
  if (!values) {
    values = new Map<string, string>();
    memoryStores.set(app, values);
  }
  return {
    get length() {
      return values.size;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    getItem: (key) => values.get(key) ?? null,
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function rawStorageForMode(app: AppId, mode: StorageMode): EnumerableBrowserStorage | null {
  try {
    if (mode === StorageMode.Memory) {
      return memoryStorage(app);
    }
    if (typeof window === "undefined") {
      return null;
    }
    if (mode === StorageMode.Session) {
      return window.sessionStorage;
    }
    return window.localStorage;
  }
  catch {
    return null;
  }
}

function storageForMode(app: AppId, mode: StorageMode): AppStorage | null {
  const storage = rawStorageForMode(app, mode);
  return storage ? createAppStorage(app, storage) : null;
}

function safeGet(storage: BrowserStorage, key: string): string | null {
  try {
    return storage.getItem(key);
  }
  catch {
    return null;
  }
}

function safeSet(storage: BrowserStorage, key: string, value: string): boolean {
  try {
    storage.setItem(key, value);
    return true;
  }
  catch {
    return false;
  }
}

function safeRemove(storage: BrowserStorage, key: string): void {
  try {
    storage.removeItem(key);
  }
  catch {
    // Storage preferences remain optional when the browser blocks writes.
  }
}

function appKeys(storage: EnumerableBrowserStorage, app: AppId): string[] {
  const prefix = `rechner:${app}:v1:`;
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(prefix)) {
      keys.push(key);
    }
  }
  return keys;
}

function ownedLegacyKeys(app: AppId): string[] {
  return [...new Set(Object.values(legacyKeys[app]))].filter((key) =>
    Object.values(legacyKeys).filter((fields) => Object.values(fields).includes(key)).length === 1);
}

function clearOwnedBrowserData(storage: EnumerableBrowserStorage, app: AppId): void {
  for (const key of appKeys(storage, app)) {
    storage.removeItem(key);
  }
  for (const key of ownedLegacyKeys(app)) {
    storage.removeItem(key);
  }
}

function migrateLegacyData(app: AppId): void {
  const storage = createAppStorage(app, window.localStorage);
  storage.getItem("__migration_check__");
}

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
      if (typeof window === "undefined") {
        return fallback;
      }
      const storage = storageForMode(app, getStorageMode(app));
      return storage ? operation(storage) : fallback;
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

/** New users start in memory mode; only an explicit persistent choice is remembered across visits. */
export function getStorageMode(app: AppId): StorageMode {
  if (typeof window === "undefined") {
    return StorageMode.Memory;
  }
  try {
    const persistent = window.localStorage.getItem(storageModeKey(app));
    if (persistent !== null) {
      return toStorageMode(persistent);
    }
  }
  catch {
    return StorageMode.Memory;
  }
  try {
    const session = window.sessionStorage.getItem(storageModeKey(app));
    return session === null ? StorageMode.Memory : toStorageMode(session);
  }
  catch {
    return StorageMode.Memory;
  }
}

/** Detects calculator data left by an earlier persistent-storage session. */
export function hasPersistentAppData(app: AppId): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return appKeys(window.localStorage, app).some((key) => !key.endsWith(":legacy-migrated"))
      || ownedLegacyKeys(app).some((key) => window.localStorage.getItem(key) !== null);
  }
  catch {
    return false;
  }
}

/** Removes this calculator's old local data when the active mode is not persistent. */
export function clearPersistentAppData(app: AppId): boolean {
  if (typeof window === "undefined" || getStorageMode(app) === StorageMode.Persistent) {
    return false;
  }
  try {
    clearOwnedBrowserData(window.localStorage, app);
    return true;
  }
  catch {
    return false;
  }
}

/** Moves only this calculator's namespaced data and requires explicit consent for persistent storage. */
export function setStorageMode(
  app: AppId,
  nextMode: StorageMode,
  acknowledgedPersistentStorage = false,
): boolean {
  if (nextMode === StorageMode.Persistent && !acknowledgedPersistentStorage) {
    return false;
  }
  if (typeof window === "undefined") {
    return false;
  }
  const currentMode = getStorageMode(app);
  if (currentMode === nextMode) {
    return true;
  }

  try {
    if (nextMode === StorageMode.Persistent) {
      migrateLegacyData(app);
    }
    const current = rawStorageForMode(app, currentMode);
    const destination = rawStorageForMode(app, nextMode);
    if (!destination) {
      return false;
    }
    if (current && currentMode !== StorageMode.Persistent) {
      const sourceValues = appKeys(current, app).map((key) => [key, current.getItem(key)] as const)
        .filter((entry): entry is readonly [string, string] => entry[1] !== null);
      for (const [key, value] of sourceValues) {
        const existing = nextMode === StorageMode.Persistent ? safeGet(window.localStorage, key) : null;
        if (existing === null || nextMode !== StorageMode.Persistent) {
          if (!safeSet(destination, key, value)) {
            return false;
          }
        }
      }
    }
    else if (currentMode === StorageMode.Persistent && nextMode !== StorageMode.Persistent) {
      for (const key of appKeys(window.localStorage, app)) {
        const value = window.localStorage.getItem(key);
        if (value !== null && !safeSet(destination, key, value)) {
          return false;
        }
      }
    }

    if (nextMode === StorageMode.Persistent) {
      window.localStorage.setItem(storageModeKey(app), nextMode);
      safeRemove(window.sessionStorage, storageModeKey(app));
      if (currentMode === StorageMode.Session) {
        clearOwnedBrowserData(window.sessionStorage, app);
      }
      memoryStores.delete(app);
    }
    else {
      if (nextMode === StorageMode.Session) {
        if (!safeSet(window.sessionStorage, storageModeKey(app), nextMode)) {
          return false;
        }
      }
      else {
        safeRemove(window.sessionStorage, storageModeKey(app));
      }
      safeRemove(window.localStorage, storageModeKey(app));
      clearOwnedBrowserData(window.localStorage, app);
      if (currentMode === StorageMode.Session) {
        clearOwnedBrowserData(window.sessionStorage, app);
      }
    }
    return true;
  }
  catch {
    return false;
  }
}
