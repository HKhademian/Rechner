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
  projectResidenceAtDate,
} from "#engine/lifeProfile/residenceProjection";
import {
  ProjectedFactStatus,
} from "#engine/lifeProfile/datedFacts";
import {
  toLifeDate,
  toPersonId,
} from "#engine/lifeProfile/person";

it("projects moves with the same uncertain-date rules as other recorded facts", () => {
  const events = [{ id: "move",
    kind: "residence.move",
    personId: "p",
    date: "2026-03",
    status: "actual",
    payload: { placeId: "place",
      location: "Berlin" } }];
  const decoded = decodeTimelineRecord(JSON.stringify({ version: 2,
    events }), lifeEventCatalog);
  assert.ok(decoded.record);
  assert.equal(projectResidenceAtDate(decoded.record.events, toPersonId("p"), toLifeDate("2026-03-15"), false).status, ProjectedFactStatus.Ambiguous);
  const after = projectResidenceAtDate(decoded.record.events, toPersonId("p"), toLifeDate("2026-04-01"), false);
  assert.equal(after.value?.location, "Berlin");
  assert.equal(after.sourceEventId, "move");
});
