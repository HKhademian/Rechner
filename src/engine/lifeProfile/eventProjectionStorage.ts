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
import {
  PEOPLE_STORAGE_KEY,
  PeopleRecordStatus,
  decodePeopleRecord,
} from "#engine/lifeProfile/peopleRecord";

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
    const people = decodePeopleRecord(storage.getItem(PEOPLE_STORAGE_KEY));
    if (record.projections.length > 0 && (people.status !== PeopleRecordStatus.Valid
      || record.projections.some((projection) => !people.record?.people.some((person) => person.id === projection.personId)))) {
      return false;
    }
    storage.setItem(EVENT_PROJECTION_STORAGE_KEY, serialized);
    return true;
  }
  catch {
    return false;
  }
}
