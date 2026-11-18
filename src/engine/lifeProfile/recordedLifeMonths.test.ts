import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  lifeEventCatalog,
} from "#engine/lifeProfile/eventCatalog";
import {
  decodeTimelineRecord,
} from "#engine/lifeProfile/timelineRecord";
import {
  recordedLifeMonths,
} from "#engine/lifeProfile/recordedLifeMonths";
import {
  toReplayMonth,
} from "#engine/lifeProfile/monthlyReplay";
import {
  toPersonId,
} from "#engine/lifeProfile/person";

it("replays job and move changes in the same month in separate scenarios and views", () => {
  const events = [{ id: "start",
    kind: "employment.started",
    personId: "p",
    date: "2026-01-01",
    status: "actual",
    payload: { jobId: "job",
      employer: "Example",
      gross: 4000,
      grossPeriod: "MONTHLY" } },
  { id: "raise",
    kind: "employment.changed",
    personId: "p",
    date: "2026-03-01",
    status: "planned",
    payload: { jobId: "job",
      gross: 5000,
      grossPeriod: "MONTHLY" } },
  { id: "move",
    kind: "residence.move",
    personId: "p",
    date: "2026-03-15",
    status: "planned",
    payload: { placeId: "place",
      location: "Berlin" } }];
  const decoded = decodeTimelineRecord(JSON.stringify({ version: 2,
    events }), lifeEventCatalog);
  assert.ok(decoded.record);
  const person = toPersonId("p");
  const january = toReplayMonth(2026, 1);
  const april = toReplayMonth(2026, 4);
  const actual = recordedLifeMonths(decoded.record.events, person, january, january, april, false);
  const planned = recordedLifeMonths(decoded.record.events, person, january, january, april, true);
  const onlyApril = recordedLifeMonths(decoded.record.events, person, january, april, april, true);
  assert.equal(actual[2].state.jobs[0].gross.value?.amount, 4000);
  assert.equal(actual[2].state.residence.value, undefined);
  assert.equal(planned[2].state.jobs[0].gross.value?.amount, 5000);
  assert.equal(planned[2].state.residence.value?.location, "Berlin");
  assert.deepEqual(onlyApril[0], planned[3]);
});
