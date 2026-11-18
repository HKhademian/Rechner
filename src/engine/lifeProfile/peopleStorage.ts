import {
  type DecodedPeopleRecord,
  type PeopleRecord,
  PEOPLE_STORAGE_KEY,
  PeopleRecordStatus,
  decodePeopleRecord,
} from "#engine/lifeProfile/peopleRecord";
import {
  browserWebStorageForCurrentMode,
} from "#engine/storage/appStorage";

export function readPeople(): DecodedPeopleRecord {
  try {
    const storage = browserWebStorageForCurrentMode();
    return storage ? decodePeopleRecord(storage.getItem(PEOPLE_STORAGE_KEY)) : { status: PeopleRecordStatus.Invalid };
  }
  catch {
    return { status: PeopleRecordStatus.Invalid };
  }
}

/** Never replace a record that this version cannot safely read. */
export function writePeople(record: PeopleRecord): boolean {
  try {
    const storage = browserWebStorageForCurrentMode();
    if (!storage) {
      return false;
    }
    const current = decodePeopleRecord(storage.getItem(PEOPLE_STORAGE_KEY));
    const serialized = JSON.stringify(record);
    if ((current.status !== PeopleRecordStatus.Missing && current.status !== PeopleRecordStatus.Valid)
      || decodePeopleRecord(serialized).status !== PeopleRecordStatus.Valid) {
      return false;
    }
    storage.setItem(PEOPLE_STORAGE_KEY, serialized);
    return true;
  }
  catch {
    return false;
  }
}
