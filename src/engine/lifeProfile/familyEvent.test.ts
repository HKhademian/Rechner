import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  lifeEventCatalog,
} from "#engine/lifeProfile/eventCatalog";
import {
  actualBirthModule,
  expectedBirthModule,
  pregnancyStartedModule,
} from "#engine/lifeProfile/familyEvent";
import {
  TimelineRecordStatus,
  decodeTimelineRecord,
} from "#engine/lifeProfile/timelineRecord";

it("links expected and actual birth milestones to a same-person pregnancy and blocks duplicates", () => {
  const pregnancy = {
    id: "preg-ev-1",
    kind: pregnancyStartedModule.kind,
    personId: "p1",
    date: "2026-01-10",
    status: "actual",
    payload: {
      pregnancyId: "preg-1",
      expectedDueDate: "2026-09-20",
      multipleCount: 1,
      label: "First baby",
    },
  };
  const expected = {
    id: "exp-ev-1",
    kind: expectedBirthModule.kind,
    personId: "p1",
    date: "2026-09-20",
    status: "planned",
    payload: {
      pregnancyId: "preg-1",
      multipleCount: 1,
    },
  };
  const actual = {
    id: "act-ev-1",
    kind: actualBirthModule.kind,
    personId: "p1",
    date: "2026-09-14",
    status: "actual",
    payload: {
      pregnancyId: "preg-1",
      childName: "Lina",
      multipleCount: 1,
    },
  };

  const decode = (events: unknown[]) => decodeTimelineRecord(JSON.stringify({
    version: 2,
    events,
  }), lifeEventCatalog).status;

  assert.equal(decode([pregnancy, expected, actual]), TimelineRecordStatus.Valid);
  assert.equal(decode([expected]), TimelineRecordStatus.Invalid);
  assert.equal(decode([actual]), TimelineRecordStatus.Invalid);
  assert.equal(decode([pregnancy, {
    ...actual,
    personId: "p2",
  }]), TimelineRecordStatus.Invalid);
  assert.equal(decode([pregnancy, actual, {
    ...actual,
    id: "act-ev-2",
  }]), TimelineRecordStatus.Invalid);
});
