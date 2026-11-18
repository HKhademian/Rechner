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
import {
  PEOPLE_STORAGE_KEY,
  PeopleRecordStatus,
  decodePeopleRecord,
} from "#engine/lifeProfile/peopleRecord";
import {
  LIFE_PROFILE_STORAGE_KEY,
} from "#engine/lifeProfile/types";
import {
  LegacyRecordStatus,
  inspectLegacyRecord,
} from "#engine/lifeProfile/legacyRecord";
import {
  lifeEventCatalog,
} from "#engine/lifeProfile/eventCatalog";
import {
  TIMELINE_STORAGE_KEY,
  TimelineRecordStatus,
  decodeTimelineRecord,
} from "#engine/lifeProfile/timelineRecord";

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
  [Apps.GiroCode]: {},
  [Apps.Visa]: {},
  [Apps.CompanyCar]: {},
  [Apps.SolarEnergy]: {},
  [Apps.Housing]: {},
  [Apps.Mortgage]: {},
  [Apps.Kita]: {},
  [Apps.MinijobMidijob]: {},
  [Apps.CommuterAllowance]: {},
};

const memoryStores = new Map<AppId, Map<string, string>>();
const sharedMemory = new Map<string, string>();
const storageModeKey = (): string => "rechner:privacy:storage-mode:v1";
const legacyStorageModeKey = (app: AppId): string => `rechner:privacy:${app}:storage-mode:v1`;

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

function appDataKeys(storage: EnumerableBrowserStorage, app: AppId): string[] {
  return appKeys(storage, app).filter((key) =>
    !key.endsWith(":legacy-migrated") && !key.endsWith(":envelopes-v1-migrated"));
}

function hasAppData(storage: EnumerableBrowserStorage, app: AppId): boolean {
  return appDataKeys(storage, app).length > 0;
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
      const storage = storageForMode(app, getStorageMode());
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

function getLegacyStorageMode(app: AppId): StorageMode {
  const key = legacyStorageModeKey(app);
  try {
    const persistent = window.localStorage.getItem(key);
    if (persistent !== null && toStorageMode(persistent) === StorageMode.Persistent) {
      return StorageMode.Persistent;
    }
  }
  catch {
    // Continue to inspect tab storage when local storage is unavailable.
  }
  try {
    const session = window.sessionStorage.getItem(key);
    if (session !== null && toStorageMode(session) === StorageMode.Session) {
      return StorageMode.Session;
    }
    if (hasAppData(window.sessionStorage, app)) {
      return StorageMode.Session;
    }
  }
  catch {
    // Memory mode remains available when browser storage is blocked.
  }
  return StorageMode.Memory;
}

function hasApplicationStorageMode(): boolean {
  try {
    return window.localStorage.getItem(storageModeKey()) !== null
      || window.sessionStorage.getItem(storageModeKey()) !== null;
  }
  catch {
    return false;
  }
}

/** Respect device-storage consent and recover tab data under one application-wide mode. */
export function getStorageMode(): StorageMode {
  if (typeof window === "undefined") {
    return StorageMode.Memory;
  }
  try {
    const persistent = window.localStorage.getItem(storageModeKey());
    if (persistent !== null) {
      return toStorageMode(persistent);
    }
  }
  catch {
    // Continue to inspect the tab store when device storage is unavailable.
  }
  try {
    const session = window.sessionStorage.getItem(storageModeKey());
    if (session !== null) {
      return toStorageMode(session);
    }
  }
  catch {
    // Fall back to detected calculator data if mode markers cannot be read.
  }
  if (hasApplicationStorageMode()) {
    return StorageMode.Memory;
  }
  let widestMode: StorageMode = StorageMode.Memory;
  for (const app of Object.values(Apps)) {
    const appMode = getLegacyStorageMode(app);
    if (appMode === StorageMode.Persistent) {
      return StorageMode.Persistent;
    }
    if (appMode === StorageMode.Session) {
      widestMode = StorageMode.Session;
    }
  }
  return widestMode;
}

/** Detects calculator data left by an earlier persistent-storage session. */
export function hasPersistentAppData(app: AppId): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return hasAppData(window.localStorage, app)
      || ownedLegacyKeys(app).some((key) => window.localStorage.getItem(key) !== null);
  }
  catch {
    return false;
  }
}

/** Removes this calculator's old local data when the active mode is not persistent. */
export function clearPersistentAppData(app: AppId): boolean {
  if (typeof window === "undefined" || getStorageMode() === StorageMode.Persistent) {
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

/** Moves every calculator's data into one shared scope, preferring the widest copy. */
export function setStorageMode(
  nextMode: StorageMode,
  acknowledgedPersistentStorage = false,
): boolean {
  if (nextMode === StorageMode.Persistent && !acknowledgedPersistentStorage) {
    return false;
  }
  if (typeof window === "undefined") {
    return false;
  }
  const currentMode = getStorageMode();
  const hasGlobalMode = hasApplicationStorageMode();
  if (hasGlobalMode && currentMode === nextMode) {
    return true;
  }

  try {
    const apps = Object.values(Apps);
    const sharedSource = browserWebStorageForCurrentMode();
    const sharedDestination = nextMode === StorageMode.Memory
      ? {
        getItem: (key: string) => sharedMemory.get(key) ?? null,
        setItem: (key: string, value: string) => {
          sharedMemory.set(key, value); 
        },
        removeItem: (key: string) => {
          sharedMemory.delete(key); 
        },
      }
      : nextMode === StorageMode.Session ? window.sessionStorage : window.localStorage;
    const sharedPrevious = new Map(sharedBackupKeys.map((key) => [key, sharedDestination.getItem(key)]));
    const sharedValues = new Map(sharedBackupKeys.map((key) => [key, sharedSource?.getItem(key) ?? null]));
    for (const app of apps) {
      if (nextMode === StorageMode.Persistent) {
        migrateLegacyData(app);
      }
    }

    const storesByApp = new Map<AppId, Readonly<Record<StorageMode, EnumerableBrowserStorage | null>>>();
    const destinations = new Map<AppId, EnumerableBrowserStorage>();
    const sourceEntriesByApp = new Map<AppId, readonly (readonly [string, string])[]>();
    const destinationBeforeByApp = new Map<AppId, ReadonlyMap<string, string>>();
    for (const app of apps) {
      const stores: Readonly<Record<StorageMode, EnumerableBrowserStorage | null>> = {
        [StorageMode.Memory]: rawStorageForMode(app, StorageMode.Memory),
        [StorageMode.Session]: rawStorageForMode(app, StorageMode.Session),
        [StorageMode.Persistent]: rawStorageForMode(app, StorageMode.Persistent),
      };
      storesByApp.set(app, stores);
      const snapshots = new Map<StorageMode, readonly (readonly [string, string])[]>();
      for (const mode of Object.values(StorageMode)) {
        const storage = stores[mode];
        const entries = storage
          ? appKeys(storage, app).map((key) => [key, safeGet(storage, key)] as const)
            .filter((entry): entry is readonly [string, string] => entry[1] !== null)
          : [];
        snapshots.set(mode, entries);
      }
      const sourceMode = hasGlobalMode ? currentMode : getLegacyStorageMode(app);
      const sourceCandidates = nextMode === StorageMode.Persistent
        ? [StorageMode.Persistent, sourceMode]
        : [sourceMode];
      const selectedSource = sourceCandidates.find((mode) =>
        (snapshots.get(mode) ?? []).some(([key]) =>
          !key.endsWith(":legacy-migrated") && !key.endsWith(":envelopes-v1-migrated"))) ?? sourceMode;
      sourceEntriesByApp.set(app, snapshots.get(selectedSource) ?? []);

      const destination = stores[nextMode];
      if (!destination) {
        return false;
      }
      destinations.set(app, destination);
      destinationBeforeByApp.set(app, new Map(appKeys(destination, app)
        .map((key) => [key, safeGet(destination, key)] as const)
        .filter((entry): entry is readonly [string, string] => entry[1] !== null)));
    }

    const rollbackDestinations = (): void => {
      for (const [key, value] of sharedPrevious) {
        if (value === null) {
          safeRemove(sharedDestination, key);
        }
        else {
          safeSet(sharedDestination, key, value);
        }
      }
      for (const app of apps) {
        const destination = destinations.get(app);
        const previous = destinationBeforeByApp.get(app);
        if (!destination || !previous) {
          continue;
        }
        for (const key of appKeys(destination, app)) {
          if (!previous.has(key)) {
            safeRemove(destination, key);
          }
        }
        for (const [key, value] of previous) {
          safeSet(destination, key, value);
        }
      }
    };

    for (const app of apps) {
      const destination = destinations.get(app);
      const sourceEntries = sourceEntriesByApp.get(app) ?? [];
      if (!destination) {
        rollbackDestinations();
        return false;
      }
      for (const [key, value] of sourceEntries) {
        if (!safeSet(destination, key, value)) {
          rollbackDestinations();
          return false;
        }
      }
    }

    for (const [key, value] of sharedValues) {
      if (value === null) {
        safeRemove(sharedDestination, key);
      }
      else if (!safeSet(sharedDestination, key, value)) {
        rollbackDestinations();
        return false;
      }
    }

    if (nextMode === StorageMode.Persistent) {
      window.localStorage.setItem(storageModeKey(), nextMode);
      safeRemove(window.sessionStorage, storageModeKey());
    }
    else if (nextMode === StorageMode.Session) {
      if (!safeSet(window.sessionStorage, storageModeKey(), nextMode)) {
        rollbackDestinations();
        return false;
      }
      safeRemove(window.localStorage, storageModeKey());
    }
    else {
      safeRemove(window.sessionStorage, storageModeKey());
      safeRemove(window.localStorage, storageModeKey());
    }

    if (sharedSource && currentMode !== nextMode) {
      for (const key of sharedBackupKeys) {
        safeRemove(sharedSource, key);
      }
    }
    for (const app of apps) {
      const destination = destinations.get(app);
      const sourceKeys = new Set((sourceEntriesByApp.get(app) ?? []).map(([key]) => key));
      if (destination) {
        for (const key of appKeys(destination, app)) {
          if (!sourceKeys.has(key)) {
            safeRemove(destination, key);
          }
        }
      }
      safeRemove(window.localStorage, legacyStorageModeKey(app));
      safeRemove(window.sessionStorage, legacyStorageModeKey(app));
      for (const mode of Object.values(StorageMode)) {
        const storage = storesByApp.get(app)?.[mode];
        if (mode !== nextMode && storage) {
          clearOwnedBrowserData(storage, app);
        }
      }
    }
    return true;
  }
  catch {
    return false;
  }
}

/** Resolve active browser Web Storage for shared non-app settings without falling back to Persistent when Memory mode is selected. */
export function browserWebStorageForCurrentMode(): Pick<Storage, "getItem" | "setItem" | "removeItem"> | null {
  if (typeof window === "undefined") {
    return null;
  }
  const mode = getStorageMode();
  try {
    if (mode === StorageMode.Persistent) {
      return window.localStorage;
    }
    if (mode === StorageMode.Session) {
      return window.sessionStorage;
    }
    return {
      getItem: (key) => sharedMemory.get(key) ?? null,
      setItem: (key, value) => {
        sharedMemory.set(key, value); 
      },
      removeItem: (key) => {
        sharedMemory.delete(key); 
      },
    };
  }
  catch {
    return null;
  }
}

/** Clear a shared record key from both persistent and session browser Web Storage backends. */
export function clearSharedBrowserKey(key: string): void {
  if (typeof window === "undefined") {
    return;
  }
  safeRemove(window.localStorage, key);
  safeRemove(window.sessionStorage, key);
  sharedMemory.delete(key);
}

const backupFormat = "rechner-backup";
const memoryRestoreKey = "rechner:privacy:memory-restore:v1";
const sharedBackupKeys = ["rechner:shared:appearance:v1", "rechner:shared:parameters:v1", "rechner:life-profile:v1:profile", PEOPLE_STORAGE_KEY, TIMELINE_STORAGE_KEY];

type BackupEntries = Record<string, string>;

const BackupValueEncoding = { Json: "json",
  Text: "text" } as const;
type BackupValueEncoding = (typeof BackupValueEncoding)[keyof typeof BackupValueEncoding];

interface ReadableValue {
  readonly encoding: BackupValueEncoding;
  readonly value: unknown;
}

/** Decode only canonical JSON so importing reconstructs the exact hashed value. */
function readableValue(raw: string): ReadableValue {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (JSON.stringify(parsed) === raw) {
      return { encoding: BackupValueEncoding.Json,
        value: parsed };
    }
  }
  catch {
    // Plain text and noncanonical JSON must remain byte-for-byte recoverable.
  }
  return { encoding: BackupValueEncoding.Text,
    value: raw };
}

function storedValue(value: unknown): string {
  if (typeof value !== "object" || value === null || Array.isArray(value)
    || !("encoding" in value) || !("value" in value)) {
    throw new Error("The backup contains an invalid value.");
  }
  if (value.encoding === BackupValueEncoding.Text && typeof value.value === "string") {
    return value.value;
  }
  if (value.encoding === BackupValueEncoding.Json) {
    const serialized = JSON.stringify(value.value);
    if (serialized !== undefined) {
      return serialized;
    }
  }
  throw new Error("The backup contains an invalid value encoding.");
}

function exportEntry(raw: string, isApp: boolean): object {
  const decoded = isApp ? deserializeStorageValue(raw) : null;
  if (decoded?.status === DecodedStorageStatus.Invalid) {
    throw new Error("A stored value failed its integrity check.");
  }
  if (decoded?.status === DecodedStorageStatus.Valid && decoded.value !== undefined) {
    const envelope: StorageValueEnvelope = JSON.parse(raw);
    return {
      kind: "envelope",
      format: envelope.format,
      version: envelope.version,
      timestamp: envelope.timestamp,
      applicationVersion: envelope.applicationVersion,
      applicationReleaseHash: envelope.applicationReleaseHash,
      hash: envelope.hash,
      ...readableValue(envelope.value),
    };
  }
  return { kind: "raw",
    ...readableValue(raw) };
}

/** Collect active calculator data in readable JSON without losing storage metadata. */
export function exportAllData(): string {
  const mode = getStorageMode();
  const entries: Record<string, object> = {};
  for (const app of Object.values(Apps)) {
    const storage = rawStorageForMode(app, mode);
    if (!storage) {
      throw new Error("Storage is unavailable.");
    }
    for (const key of appDataKeys(storage, app)) {
      const value = storage.getItem(key);
      if (value !== null) {
        entries[key] = exportEntry(value, true);
      }
    }
  }
  const shared = browserWebStorageForCurrentMode();
  for (const key of sharedBackupKeys) {
    const value = shared?.getItem(key);
    if (value !== null && value !== undefined) {
      entries[key] = exportEntry(value, false);
    }
  }
  return JSON.stringify({ format: backupFormat,
    version: 2,
    entries }, null, 2);
}

function importReadableEntry(value: unknown, isApp: boolean): string {
  if (typeof value !== "object" || value === null || Array.isArray(value) || !("kind" in value)) {
    throw new Error("The backup contains an invalid entry.");
  }
  const decoded = storedValue(value);
  if (value.kind === "raw") {
    return decoded;
  }
  if (value.kind === "envelope" && isApp
    && "format" in value && "version" in value && "timestamp" in value
    && "applicationVersion" in value && "applicationReleaseHash" in value && "hash" in value) {
    const serialized = JSON.stringify({
      format: value.format,
      version: value.version,
      timestamp: value.timestamp,
      applicationVersion: value.applicationVersion,
      applicationReleaseHash: value.applicationReleaseHash,
      value: decoded,
      hash: value.hash,
    });
    if (deserializeStorageValue(serialized).status === DecodedStorageStatus.Valid) {
      return serialized;
    }
  }
  throw new Error("The backup contains an invalid or changed storage record.");
}

function parseBackup(serialized: string): BackupEntries {
  const parsed: unknown = JSON.parse(serialized);
  if (typeof parsed !== "object" || parsed === null || !("format" in parsed) || parsed.format !== backupFormat
    || !("version" in parsed) || (parsed.version !== 1 && parsed.version !== 2) || !("entries" in parsed)
    || typeof parsed.entries !== "object" || parsed.entries === null || Array.isArray(parsed.entries)) {
    throw new Error("This is not a supported Rechner backup.");
  }
  const entries: BackupEntries = {};
  for (const [key, value] of Object.entries(parsed.entries)) {
    const app = Object.values(Apps).find((id) => key.startsWith(`rechner:${id}:v1:`));
    if ((!app && !sharedBackupKeys.includes(key))
      || (app && (key.endsWith(":legacy-migrated") || key.endsWith(":envelopes-v1-migrated")))) {
      throw new Error("The backup contains invalid data.");
    }
    const raw = parsed.version === 2 ? importReadableEntry(value, Boolean(app)) : value;
    if (typeof raw !== "string" || (app && deserializeStorageValue(raw).status === DecodedStorageStatus.Invalid)) {
      throw new Error("The backup contains invalid data.");
    }
    if (key === PEOPLE_STORAGE_KEY && decodePeopleRecord(raw).status !== PeopleRecordStatus.Valid) {
      throw new Error("The backup contains an invalid or unsupported people record.");
    }
    if (key === TIMELINE_STORAGE_KEY && decodeTimelineRecord(raw, lifeEventCatalog).status !== TimelineRecordStatus.Valid) {
      throw new Error("The backup contains an invalid or unsupported timeline.");
    }
    if (key === LIFE_PROFILE_STORAGE_KEY && inspectLegacyRecord(raw) !== LegacyRecordStatus.Supported) {
      throw new Error("The backup contains an invalid or unsupported life profile.");
    }
    entries[key] = raw;
  }
  return entries;
}

/** Replaces all active data only after the complete backup has been validated. */
export function importAllData(serialized: string): void {
  const entries = parseBackup(serialized);
  const mode = getStorageMode();
  const targets = Object.values(Apps).map((app) => {
    const storage = rawStorageForMode(app, mode);
    if (!storage) {
      throw new Error("Storage is unavailable.");
    }
    return { app,
      storage };
  });
  const shared = browserWebStorageForCurrentMode();
  const legacyStatus = inspectLegacyRecord(shared?.getItem(LIFE_PROFILE_STORAGE_KEY) ?? null);
  if (legacyStatus !== LegacyRecordStatus.Missing && legacyStatus !== LegacyRecordStatus.Supported) {
    throw new Error("The saved life profile is invalid or unsupported. Export it before restoring data.");
  }
  const currentPeople = shared?.getItem(PEOPLE_STORAGE_KEY) ?? null;
  if (currentPeople !== null && decodePeopleRecord(currentPeople).status !== PeopleRecordStatus.Valid) {
    throw new Error("The saved people record is invalid or unsupported. Export it before restoring data.");
  }
  // Older backups predate people records; importing them must not silently erase people.
  if (!Object.hasOwn(entries, PEOPLE_STORAGE_KEY) && currentPeople !== null) {
    entries[PEOPLE_STORAGE_KEY] = currentPeople;
  }
  const currentTimeline = shared?.getItem(TIMELINE_STORAGE_KEY) ?? null;
  if (currentTimeline !== null && decodeTimelineRecord(currentTimeline, lifeEventCatalog).status !== TimelineRecordStatus.Valid) {
    throw new Error("The saved timeline is invalid or unsupported. Export it before restoring data.");
  }
  if (!Object.hasOwn(entries, TIMELINE_STORAGE_KEY) && currentTimeline !== null) {
    entries[TIMELINE_STORAGE_KEY] = currentTimeline;
  }
  const timeline = decodeTimelineRecord(entries[TIMELINE_STORAGE_KEY] ?? null, lifeEventCatalog);
  const people = decodePeopleRecord(entries[PEOPLE_STORAGE_KEY] ?? null);
  if (timeline.record?.events.some((event) => !people.record?.people.some((person) => person.id === event.personId))) {
    throw new Error("The backup would leave timeline events without their people.");
  }
  const previous = exportAllData();
  const apply = (values: BackupEntries): void => {
    for (const { app, storage } of targets) {
      for (const key of appDataKeys(storage, app)) {
        storage.removeItem(key);
      }
      // Prevent legacy values from reappearing after clearing or importing.
      storage.setItem(appStorageKey(app, "legacy-migrated"), serializeStorageValue("1"));
      storage.setItem(appStorageKey(app, "envelopes-v1-migrated"), serializeStorageValue("1"));
      for (const [key, value] of Object.entries(values)) {
        if (key.startsWith(`rechner:${app}:v1:`)) {
          storage.setItem(key, value);
        }
      }
    }
    if (shared) {
      for (const key of sharedBackupKeys) {
        shared.removeItem(key);
        if (Object.hasOwn(values, key)) {
          shared.setItem(key, values[key]);
        }
      }
    }
  };
  try {
    apply(entries);
    if (mode === StorageMode.Memory) {
      // Carry page-only data across the one reload needed to reinitialize stores.
      window.sessionStorage.setItem(memoryRestoreKey, JSON.stringify({ format: backupFormat,
        version: 1,
        entries }));
    }
  }
  catch {
    try {
      apply(parseBackup(previous));
    }
    catch {
      // Storage may remain unavailable even for rollback.
    }
    throw new Error("Could not replace data in browser storage.");
  }
}

/** Clears all calculator data while retaining the selected storage mode. */
export function clearAllData(): void {
  importAllData(JSON.stringify({ format: backupFormat,
    version: 1,
    entries: {} }));
  const activeMode = getStorageMode();
  for (const app of Object.values(Apps)) {
    for (const mode of Object.values(StorageMode)) {
      if (mode !== activeMode) {
        const storage = rawStorageForMode(app, mode);
        if (storage) {
          clearOwnedBrowserData(storage, app);
        }
      }
    }
  }
  for (const key of sharedBackupKeys) {
    clearSharedBrowserKey(key);
  }
  if (activeMode === StorageMode.Memory && typeof window !== "undefined") {
    window.sessionStorage.removeItem(memoryRestoreKey);
  }
}

if (typeof window !== "undefined") {
  try {
    const restore = window.sessionStorage.getItem(memoryRestoreKey);
    if (restore !== null) {
      window.sessionStorage.removeItem(memoryRestoreKey);
      if (getStorageMode() === StorageMode.Memory) {
        const entries = parseBackup(restore);
        for (const key of sharedBackupKeys) {
          if (Object.hasOwn(entries, key)) {
            sharedMemory.set(key, entries[key]);
          }
        }
        for (const app of Object.values(Apps)) {
          const storage = memoryStorage(app);
          for (const [key, value] of Object.entries(entries)) {
            if (key.startsWith(`rechner:${app}:v1:`)) {
              storage.setItem(key, value);
            }
          }
        }
      }
    }
  }
  catch {
    // Ignore an unavailable or invalid one-time restore record.
  }
}
