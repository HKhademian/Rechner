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
import {
  lifeEventCatalog,
} from "#engine/lifeProfile/eventCatalog";
import {
  TIMELINE_STORAGE_KEY,
  TimelineRecordStatus,
  decodeTimelineRecord,
} from "#engine/lifeProfile/timelineRecord";
import {
  EVENT_PROJECTION_STORAGE_KEY,
  EventProjectionStatus,
  decodeEventProjections,
} from "#engine/lifeProfile/eventProjectionRecord";

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
    const timeline = decodeTimelineRecord(storage.getItem(TIMELINE_STORAGE_KEY), lifeEventCatalog);
    if ((timeline.status !== TimelineRecordStatus.Missing && timeline.status !== TimelineRecordStatus.Valid)
      || timeline.record?.events.some((event) => !record.people.some((person) => person.id === event.personId))) {
      return false;
    }
    const projections = decodeEventProjections(storage.getItem(EVENT_PROJECTION_STORAGE_KEY));
    if ((projections.status !== EventProjectionStatus.Missing && projections.status !== EventProjectionStatus.Valid)
      || projections.record?.projections.some((projection) => !record.people.some((person) => person.id === projection.personId))) {
      return false;
    }
    storage.setItem(PEOPLE_STORAGE_KEY, serialized);
    return true;
  }
  catch {
    return false;
  }
}
