import {
  type DecodedEventProjections,
  type EventProjectionRecord,
  EVENT_PROJECTION_STORAGE_KEY,
  EventProjectionStatus,
  decodeEventProjections,
} from "#engine/lifeProfile/eventProjectionRecord";
import {
  browserWebStorageForCurrentMode,
} from "#engine/storage/appStorage";

export function readEventProjections(): DecodedEventProjections {
  try {
    const storage = browserWebStorageForCurrentMode();
    return storage ? decodeEventProjections(storage.getItem(EVENT_PROJECTION_STORAGE_KEY)) : { status: EventProjectionStatus.Invalid };
  }
  catch {
    return { status: EventProjectionStatus.Invalid };
  }
}
export function writeEventProjections(record: EventProjectionRecord, expected: EventProjectionRecord): boolean {
  try {
    const storage = browserWebStorageForCurrentMode();
    if (!storage) {
      return false;
    }
    const current = decodeEventProjections(storage.getItem(EVENT_PROJECTION_STORAGE_KEY));
    const unchanged = current.status === EventProjectionStatus.Missing ? expected.projections.length === 0
      : current.status === EventProjectionStatus.Valid && JSON.stringify(current.record) === JSON.stringify(expected);
    const serialized = JSON.stringify(record);
    if (!unchanged || decodeEventProjections(serialized).status !== EventProjectionStatus.Valid) {
      return false;
    }
    storage.setItem(EVENT_PROJECTION_STORAGE_KEY, serialized);
    return true;
  }
  catch {
    return false;
  }
}
