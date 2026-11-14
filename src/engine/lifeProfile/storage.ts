import {
  type UnifiedLifeProfile,
  LIFE_PROFILE_STORAGE_KEY,
  createDefaultUnifiedLifeProfile,
  parseUnifiedLifeProfile,
} from "#engine/lifeProfile/types";
import {
  StorageMode,
  getStorageMode,
} from "#engine/storage/appStorage";

function getBrowserStorageForMode(): Pick<Storage, "getItem" | "setItem" | "removeItem"> | null {
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

/** Serializes a `UnifiedLifeProfile` deterministically. */
export function serializeUnifiedLifeProfile(profile: UnifiedLifeProfile): string {
  return JSON.stringify(parseUnifiedLifeProfile(profile));
}

/** Deserializes a `UnifiedLifeProfile` JSON payload, returning null if blank/corrupt. */
export function deserializeUnifiedLifeProfile(serialized: string | null): UnifiedLifeProfile | null {
  if (!serialized) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parseUnifiedLifeProfile(parsed);
  }
  catch {
    return null;
  }
}

/** Reads the saved `UnifiedLifeProfile` under `rechner:life-profile:v1:profile` without writing on boot. */
export function readUnifiedLifeProfile(): UnifiedLifeProfile {
  const storage = getBrowserStorageForMode();
  if (!storage) {
    return createDefaultUnifiedLifeProfile();
  }
  try {
    return deserializeUnifiedLifeProfile(storage.getItem(LIFE_PROFILE_STORAGE_KEY)) ??
      createDefaultUnifiedLifeProfile();
  }
  catch {
    return createDefaultUnifiedLifeProfile();
  }
}

/** Persists a `UnifiedLifeProfile` according to the active global `StorageMode`. */
export function writeUnifiedLifeProfile(profile: UnifiedLifeProfile): boolean {
  const storage = getBrowserStorageForMode();
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(LIFE_PROFILE_STORAGE_KEY, serializeUnifiedLifeProfile(profile));
    return true;
  }
  catch {
    return false;
  }
}

/** Clears the saved `UnifiedLifeProfile` from session and local storage. */
export function clearUnifiedLifeProfile(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(LIFE_PROFILE_STORAGE_KEY);
  }
  catch {
    // Ignore blocked storage removal
  }
  try {
    window.sessionStorage.removeItem(LIFE_PROFILE_STORAGE_KEY);
  }
  catch {
    // Ignore blocked storage removal
  }
}
