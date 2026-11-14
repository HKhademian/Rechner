import {
  attemptParameterModification,
  resolveParameterForYear,
} from "#engine/parameters/registry";
import {
  type ParameterId,
  isParameterId,
} from "#engine/parameters/types";
import {
  StorageMode,
  getStorageMode,
} from "#engine/storage/appStorage";
import {
  DEFAULT_TAX_YEAR,
} from "#engine/tax/taxRules";
import {
  type FullCalendarYear,
  toFullCalendarYear,
} from "#engine/types";

/**
 * Storage key for shared non-personal statutory configuration (active year & validated customizable defaults).
 * Kept strictly separated from app-scoped personal scenario stores (`rechner:<app>:v1:*`).
 */
export const SHARED_PARAMETERS_STORAGE_KEY = "rechner:shared:parameters:v1";

/**
 * Versioned shared parameter state persisted according to the user's global privacy `StorageMode`.
 */
export interface SharedParameterSnapshot {
  readonly version: 1;
  readonly year: FullCalendarYear;
  readonly overrides: Readonly<Partial<Record<ParameterId, number>>>;
}

function getBrowserStorageForCurrentMode(): Pick<Storage, "getItem" | "setItem" | "removeItem"> | null {
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
    return null;
  }
  catch {
    return null;
  }
}

/**
 * Serializes a shared parameter snapshot into deterministic JSON, stripping redundant defaults.
 */
export function serializeSharedParameterSnapshot(
  year: FullCalendarYear,
  overrides: Readonly<Partial<Record<ParameterId, number>>>,
): string {
  const sanitizedOverrides: Partial<Record<ParameterId, number>> = {};
  for (const [key, rawValue] of Object.entries(overrides)) {
    if (!isParameterId(key) || typeof rawValue !== "number") {
      continue;
    }
    const validation = attemptParameterModification(key, rawValue);
    if (!validation.ok) {
      continue;
    }
    const resolved = resolveParameterForYear(key, year);
    if (validation.value !== resolved.baselineValue) {
      sanitizedOverrides[key] = validation.value;
    }
  }

  const snapshot: SharedParameterSnapshot = {
    version: 1,
    year: toFullCalendarYear(year),
    overrides: sanitizedOverrides,
  };
  return JSON.stringify(snapshot);
}

/**
 * Parses and rigorously validates a serialized `SharedParameterSnapshot`.
 * Any locked (`StatutoryFixed` / `YearIndexed`) or out-of-bounds parameter entries
 * are stripped cleanly so untrusted storage values cannot corrupt engine math.
 */
export function deserializeSharedParameterSnapshot(
  serialized: string | null,
): SharedParameterSnapshot | null {
  if (!serialized) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  }
  catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  if (record.version !== 1) {
    return null;
  }

  let year: FullCalendarYear = DEFAULT_TAX_YEAR;
  if (typeof record.year === "number" && Number.isInteger(record.year)) {
    try {
      year = toFullCalendarYear(record.year);
    }
    catch {
      year = DEFAULT_TAX_YEAR;
    }
  }

  const validatedOverrides: Partial<Record<ParameterId, number>> = {};
  if (typeof record.overrides === "object" && record.overrides !== null) {
    for (const [key, rawValue] of Object.entries(record.overrides as Record<string, unknown>)) {
      if (!isParameterId(key) || typeof rawValue !== "number") {
        continue;
      }
      const validation = attemptParameterModification(key, rawValue);
      if (!validation.ok) {
        continue;
      }
      const baseline = resolveParameterForYear(key, year).baselineValue;
      if (validation.value !== baseline) {
        validatedOverrides[key] = validation.value;
      }
    }
  }

  return Object.freeze({
    version: 1,
    year,
    overrides: Object.freeze(validatedOverrides),
  });
}

/**
 * Reads the persisted shared parameter snapshot for the active privacy `StorageMode`.
 * Never writes during read/boot.
 */
export function readSharedParameterSnapshot(): SharedParameterSnapshot | null {
  const storage = getBrowserStorageForCurrentMode();
  if (!storage) {
    return null;
  }
  try {
    return deserializeSharedParameterSnapshot(storage.getItem(SHARED_PARAMETERS_STORAGE_KEY));
  }
  catch {
    return null;
  }
}

/**
 * Persists the shared parameter year and customizable overrides under the active privacy mode,
 * or removes the key if everything matches clean statutory defaults.
 */
export function writeSharedParameterSnapshot(
  year: FullCalendarYear,
  overrides: Readonly<Partial<Record<ParameterId, number>>>,
): boolean {
  const storage = getBrowserStorageForCurrentMode();
  if (!storage) {
    return false;
  }

  const serialized = serializeSharedParameterSnapshot(year, overrides);
  const normalized = deserializeSharedParameterSnapshot(serialized);
  const isCleanDefault =
    normalized !== null &&
    normalized.year === DEFAULT_TAX_YEAR &&
    Object.keys(normalized.overrides).length === 0;

  try {
    if (isCleanDefault) {
      storage.removeItem(SHARED_PARAMETERS_STORAGE_KEY);
      return true;
    }
    storage.setItem(SHARED_PARAMETERS_STORAGE_KEY, serialized);
    return true;
  }
  catch {
    return false;
  }
}

/**
 * Clears the shared parameter snapshot from session and local storage when available.
 */
export function clearSharedParameterSnapshot(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(SHARED_PARAMETERS_STORAGE_KEY);
  }
  catch {
    // Ignore storage removal errors
  }
  try {
    window.sessionStorage.removeItem(SHARED_PARAMETERS_STORAGE_KEY);
  }
  catch {
    // Ignore storage removal errors
  }
}
