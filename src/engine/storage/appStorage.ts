import {
  type AppId,
  AppId as Apps,
} from "#/apps/appDefinition.ts";
import packageManifest from "../../../package.json" with { type: "json" };
import {
  sha256,
} from "#engine/storage/sha256";
import {
  buildInfo,
} from "#data/buildInfo";

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

export const STORAGE_VALUE_VERSION = 1;
export const APPLICATION_VERSION = packageManifest.version;
export const APPLICATION_RELEASE_HASH = buildInfo.commit;

export interface StorageValueEnvelope {
  readonly format: "rechner-storage-value";
  readonly version: number;
  readonly timestamp: string;
  readonly applicationVersion: string;
  readonly applicationReleaseHash: string;
  readonly value: string;
  readonly hash: string;
}

export const DecodedStorageStatus = {
  Valid: "valid",
  Legacy: "legacy",
  Invalid: "invalid",
} as const;
type DecodedStorageStatus = (typeof DecodedStorageStatus)[keyof typeof DecodedStorageStatus];

function envelopeHash(
  version: number,
  timestamp: string,
  applicationVersion: string,
  applicationReleaseHash: string,
  value: string,
): string {
  const payload = JSON.stringify({
    format: "rechner-storage-value",
    version,
    timestamp,
    applicationVersion,
    applicationReleaseHash,
    value,
  });
  return `sha256:${sha256(payload)}`;
}

function serializeStorageValue(value: string): string {
  const timestamp = new Date().toISOString();
  const envelope: StorageValueEnvelope = {
    format: "rechner-storage-value",
    version: STORAGE_VALUE_VERSION,
    timestamp,
    applicationVersion: APPLICATION_VERSION,
    applicationReleaseHash: APPLICATION_RELEASE_HASH,
    value,
    hash: envelopeHash(STORAGE_VALUE_VERSION, timestamp, APPLICATION_VERSION, APPLICATION_RELEASE_HASH, value),
  };
  return JSON.stringify(envelope);
}

interface DecodedStorageValue {
  readonly status: DecodedStorageStatus;
  readonly value?: string;
}

function deserializeStorageValue(serialized: string): DecodedStorageValue {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  }
  catch {
    return { status: DecodedStorageStatus.Legacy,
      value: serialized };
  }
  if (typeof parsed !== "object" || parsed === null || !(("format" in parsed) && parsed.format === "rechner-storage-value")) {
    return { status: DecodedStorageStatus.Legacy,
      value: serialized };
  }
  if (!(
    "version" in parsed
    && parsed.version === STORAGE_VALUE_VERSION
    && "timestamp" in parsed
    && typeof parsed.timestamp === "string"
    && !Number.isNaN(Date.parse(parsed.timestamp))
    && "applicationVersion" in parsed
    && typeof parsed.applicationVersion === "string"
    && "applicationReleaseHash" in parsed
    && typeof parsed.applicationReleaseHash === "string"
    && "value" in parsed
    && typeof parsed.value === "string"
    && "hash" in parsed
    && typeof parsed.hash === "string"
  )) {
    return { status: DecodedStorageStatus.Invalid };
  }
  const expected = envelopeHash(parsed.version, parsed.timestamp, parsed.applicationVersion, parsed.applicationReleaseHash, parsed.value);
  return parsed.hash === expected
    ? { status: DecodedStorageStatus.Valid,
      value: parsed.value }
    : { status: DecodedStorageStatus.Invalid };
}

function upgradeStoredAppValues(app: AppId, storage: BrowserStorage): void {
  const enumerable = storage as Partial<EnumerableBrowserStorage>;
  if (typeof enumerable.length !== "number" || typeof enumerable.key !== "function") {
    return;
  }
  for (const key of appKeys(enumerable as EnumerableBrowserStorage, app)) {
    const stored = storage.getItem(key);
    if (stored === null) {
      continue;
    }
    const decoded = deserializeStorageValue(stored);
    if (decoded.status === DecodedStorageStatus.Legacy && decoded.value !== undefined) {
      storage.setItem(key, serializeStorageValue(decoded.value));
    }
  }
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
  const envelopeMarker = appStorageKey(app, "envelopes-v1-migrated");
  const migrate = (): void => {
    if (storage.getItem(marker) !== null) {
      const storedMarker = storage.getItem(marker);
      if (storedMarker !== null && deserializeStorageValue(storedMarker).status === DecodedStorageStatus.Legacy) {
        storage.setItem(marker, serializeStorageValue("1"));
      }
      if (storage.getItem(envelopeMarker) === null) {
        upgradeStoredAppValues(app, storage);
        storage.setItem(envelopeMarker, serializeStorageValue("1"));
      }
      return;
    }
    for (const [field, oldKey] of Object.entries(legacyKeys[app])) {
      const key = appStorageKey(app, field);
      if (storage.getItem(key) === null) {
        const value = storage.getItem(oldKey);
        if (value !== null) {
          storage.setItem(key, serializeStorageValue(value));
        }
      }
    }
    storage.setItem(marker, serializeStorageValue("1"));
    upgradeStoredAppValues(app, storage);
    storage.setItem(envelopeMarker, serializeStorageValue("1"));
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
        const stored = storage.getItem(appStorageKey(app, key));
        if (stored !== null) {
          const decoded = deserializeStorageValue(stored);
          if (decoded.status === DecodedStorageStatus.Invalid) {
            return null;
          }
          if (decoded.status === DecodedStorageStatus.Legacy && decoded.value !== undefined) {
            try {
              storage.setItem(appStorageKey(app, key), serializeStorageValue(decoded.value));
            }
            catch {
              return decoded.value;
            }
          }
          return decoded.value ?? null;
        }
        const legacy = legacyKeys[app][key];
        const legacyValue = storage.getItem(marker) === null && legacy ? storage.getItem(legacy) : null;
        if (legacyValue !== null) {
          try {
            storage.setItem(appStorageKey(app, key), serializeStorageValue(legacyValue));
          }
          catch {
            return legacyValue;
          }
          return legacyValue;
        }
        return null;
      }
      catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        migrate();
        storage.setItem(appStorageKey(app, key), serializeStorageValue(value));
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
