import {
  type DecodedTimelineRecord,
  type TimelineRecord,
  TIMELINE_STORAGE_KEY,
  TimelineRecordStatus,
  decodeTimelineRecord,
} from "#engine/lifeProfile/timelineRecord";
import {
  lifeEventCatalog,
} from "#engine/lifeProfile/eventCatalog";
import {
  readPeople,
} from "#engine/lifeProfile/peopleStorage";
import {
  PeopleRecordStatus,
} from "#engine/lifeProfile/peopleRecord";
import {
  browserWebStorageForCurrentMode,
} from "#engine/storage/appStorage";

export function readTimeline(): DecodedTimelineRecord {
  try {
    const storage = browserWebStorageForCurrentMode();
    return storage ? decodeTimelineRecord(storage.getItem(TIMELINE_STORAGE_KEY), lifeEventCatalog) : { status: TimelineRecordStatus.Invalid };
  }
  catch {
    return { status: TimelineRecordStatus.Invalid };
  }
}

export function writeTimeline(record: TimelineRecord): boolean {
  try {
    const storage = browserWebStorageForCurrentMode();
    if (!storage) {
      return false;
    }
    const current = decodeTimelineRecord(storage.getItem(TIMELINE_STORAGE_KEY), lifeEventCatalog);
    const serialized = JSON.stringify(record);
    const next = decodeTimelineRecord(serialized, lifeEventCatalog);
    if ((current.status !== TimelineRecordStatus.Missing && current.status !== TimelineRecordStatus.Valid)
      || next.status !== TimelineRecordStatus.Valid || !next.record) {
      return false;
    }
    const people = readPeople();
    if (next.record.events.length > 0 && (people.status !== PeopleRecordStatus.Valid
      || next.record.events.some((event) => !people.record?.people.some((person) => person.id === event.personId)))) {
      return false;
    }
    storage.setItem(TIMELINE_STORAGE_KEY, serialized);
    return true;
  }
  catch {
    return false;
  }
}
