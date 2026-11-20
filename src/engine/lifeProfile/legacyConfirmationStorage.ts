import {
  type DecodedLegacyConfirmations,
  type LegacyConfirmationRecord,
  LEGACY_CONFIRMATION_STORAGE_KEY,
  LegacyConfirmationStatus,
  decodeLegacyConfirmations,
} from "#engine/lifeProfile/legacyConfirmation";
import {
  browserWebStorageForCurrentMode,
} from "#engine/storage/appStorage";

export function readLegacyConfirmations(): DecodedLegacyConfirmations {
  try {
    const storage = browserWebStorageForCurrentMode();
    return storage
      ? decodeLegacyConfirmations(storage.getItem(LEGACY_CONFIRMATION_STORAGE_KEY))
      : { status: LegacyConfirmationStatus.Invalid };
  }
  catch {
    return { status: LegacyConfirmationStatus.Invalid };
  }
}

export function writeLegacyConfirmations(record: LegacyConfirmationRecord): boolean {
  try {
    const storage = browserWebStorageForCurrentMode();
    if (!storage) {
      return false;
    }
    const current = decodeLegacyConfirmations(storage.getItem(LEGACY_CONFIRMATION_STORAGE_KEY));
    const serialized = JSON.stringify(record);
    const next = decodeLegacyConfirmations(serialized);
    if ((current.status !== LegacyConfirmationStatus.Missing && current.status !== LegacyConfirmationStatus.Valid)
      || next.status !== LegacyConfirmationStatus.Valid) {
      return false;
    }
    storage.setItem(LEGACY_CONFIRMATION_STORAGE_KEY, serialized);
    return true;
  }
  catch {
    return false;
  }
}
