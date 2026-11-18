import {
  type UnifiedLifeProfile,
  LIFE_PROFILE_STORAGE_KEY,
  createDefaultUnifiedLifeProfile,
  parseUnifiedLifeProfile,
} from "#engine/lifeProfile/types";
import {
  browserWebStorageForCurrentMode,
  clearSharedBrowserKey,
} from "#engine/storage/appStorage";
import {
  LegacyRecordStatus,
  inspectLegacyRecord,
} from "#engine/lifeProfile/legacyRecord";

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
  const storage = browserWebStorageForCurrentMode();
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
  const storage = browserWebStorageForCurrentMode();
  if (!storage) {
    return false;
  }
  try {
    const status = inspectLegacyRecord(storage.getItem(LIFE_PROFILE_STORAGE_KEY));
    if (status !== LegacyRecordStatus.Missing && status !== LegacyRecordStatus.Supported) {
      return false;
    }
    storage.setItem(LIFE_PROFILE_STORAGE_KEY, serializeUnifiedLifeProfile(profile));
    return true;
  }
  catch {
    return false;
  }
}

/** Clears the saved `UnifiedLifeProfile` from session and local storage. */
export function clearUnifiedLifeProfile(): void {
  clearSharedBrowserKey(LIFE_PROFILE_STORAGE_KEY);
}
