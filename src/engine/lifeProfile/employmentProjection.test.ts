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
  ProjectedFactStatus,
  projectEmploymentAtDate,
} from "#engine/lifeProfile/employmentProjection";
import {
  toLifeDate,
  toPersonId,
} from "#engine/lifeProfile/person";

function project(events: unknown[], date: string, planned = false) {
  const decoded = decodeTimelineRecord(JSON.stringify({ version: 2,
    events }), lifeEventCatalog);
  assert.ok(decoded.record);
  return projectEmploymentAtDate(decoded.record.events, toPersonId("p"), toLifeDate(date), planned);
}

const start = { id: "start",
  kind: "employment.started",
  personId: "p",
  date: "2026-01-01",
  status: "actual",
  payload: { jobId: "job",
    employer: "Example",
    gross: 4000,
    grossPeriod: "MONTHLY",
    weeklyHours: 40 } };
const change = { id: "change",
  kind: "employment.changed",
  personId: "p",
  date: "2026-07-01",
  status: "planned",
  payload: { jobId: "job",
    gross: 5000,
    grossPeriod: "MONTHLY" } };

it("projects recorded rates with sources without confusing planned changes with actual ones", () => {
  assert.equal(project([start, change], "2025-12-31").length, 0);
  assert.equal(project([start, change], "2026-08-01")[0].gross.value?.amount, 4000);
  const planned = project([start, change], "2026-08-01", true)[0];
  assert.equal(planned.gross.value?.amount, 5000);
  assert.equal(planned.gross.sourceEventId, "change");
  assert.equal(planned.weeklyHours.value, 40);
  assert.equal(planned.weeklyHours.sourceEventId, "start");
});

it("does not guess when dates or same-day changes conflict", () => {
  const monthChange = { ...change,
    date: "2026-07" };
  assert.equal(project([start, monthChange], "2026-07-15", true)[0].gross.status, ProjectedFactStatus.Ambiguous);
  assert.equal(project([start, monthChange], "2026-08-01", true)[0].gross.value?.amount, 5000);
  assert.equal(project([start, { ...change,
    date: undefined }], "2026-08-01", true)[0].gross.status, ProjectedFactStatus.Ambiguous);
  assert.equal(project([start, change, { ...change,
    id: "other",
    payload: { ...change.payload,
      gross: 6000 } }], "2026-08-01", true)[0].gross.status, ProjectedFactStatus.Ambiguous);
  assert.equal(project([{ ...start,
    date: "2026" }], "2026-07-01")[0].existence, ProjectedFactStatus.Ambiguous);
  assert.equal(project([start, { ...change,
    date: "2025-01-01" }], "2026-08-01", true)[0].existence, ProjectedFactStatus.Ambiguous);
  const yearChange = { ...change,
    id: "year",
    date: "2026",
    payload: { ...change.payload,
      gross: 4500 } };
  assert.equal(project([start, yearChange, change], "2027-01-01", true)[0].gross.status, ProjectedFactStatus.Ambiguous);
  const later = { ...change,
    id: "later",
    date: "2027-02-01",
    payload: { ...change.payload,
      gross: 5500 } };
  assert.equal(project([start, yearChange, change, later], "2027-03-01", true)[0].gross.value?.amount, 5500);
});

it("excludes ended jobs after their end date and surfaces active leave windows", () => {
  const leave = {
    id: "leave",
    kind: "employment.leave",
    personId: "p",
    date: "2026-04-01",
    status: "actual",
    payload: {
      jobId: "job",
      kind: "sabbatical",
      endDate: "2026-05-31",
    },
  };
  const ended = {
    id: "ended",
    kind: "employment.ended",
    personId: "p",
    date: "2026-09-30",
    status: "planned",
    payload: {
      jobId: "job",
      reason: "resignation",
      finalPayCents: 300000,
    },
  };
  const duringLeave = project([start, leave, ended], "2026-04-15", true);
  assert.equal(duringLeave.length, 1);
  assert.equal(duringLeave[0].activeLeave?.kind, "sabbatical");
  assert.equal(duringLeave[0].activeLeave?.endDate, "2026-05-31");

  const afterLeave = project([start, leave, ended], "2026-06-01", true);
  assert.equal(afterLeave.length, 1);
  assert.equal(afterLeave[0].activeLeave, undefined);

  const onEndDate = project([start, leave, ended], "2026-09-30", true);
  assert.equal(onEndDate.length, 1);

  const afterEnd = project([start, leave, ended], "2026-10-01", true);
  assert.equal(afterEnd.length, 0);

  const actualOnlyAfterPlannedEnd = project([start, leave, ended], "2026-10-01", false);
  assert.equal(actualOnlyAfterPlannedEnd.length, 1);
});
