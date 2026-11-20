import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  JobEndReason,
  JobLeaveKind,
  jobChangedModule,
  jobEndedModule,
  jobLeaveModule,
  jobStartedModule,
} from "#engine/lifeProfile/employmentEvent";
import {
  lifeEventCatalog,
} from "#engine/lifeProfile/eventCatalog";
import {
  TimelineRecordStatus,
  decodeTimelineRecord,
} from "#engine/lifeProfile/timelineRecord";

it("validates job details without inventing pay from working hours", () => {
  const job = {
    jobId: "job-1",
    employer: "Example",
    weeklyHours: 32,
  };
  assert.deepEqual(jobStartedModule.parsePayload(job), job);
  assert.deepEqual(jobStartedModule.parsePayload({
    ...job,
    gross: 4000,
    grossPeriod: "MONTHLY",
  }), {
    ...job,
    gross: 4000,
    grossPeriod: "MONTHLY",
  });
  assert.throws(() => jobStartedModule.parsePayload({
    ...job,
    gross: 4000,
  }));
  assert.throws(() => jobStartedModule.parsePayload({
    ...job,
    gross: -1,
    grossPeriod: "MONTHLY",
  }));
  assert.throws(() => jobStartedModule.parsePayload({
    ...job,
    weeklyHours: 61,
  }));
});

it("accepts only job changes, endings and leaves linked to a job belonging to the same person", () => {
  const start = {
    id: "start",
    kind: "employment.started",
    personId: "p",
    date: "2026",
    status: "actual",
    payload: {
      jobId: "job-1",
      employer: "Example",
    },
  };
  const change = {
    id: "change",
    kind: "employment.changed",
    personId: "p",
    date: "2027",
    status: "planned",
    payload: {
      jobId: "job-1",
      weeklyHours: 32,
    },
  };
  const ended = {
    id: "ended",
    kind: "employment.ended",
    personId: "p",
    date: "2027-06-30",
    status: "planned",
    payload: {
      jobId: "job-1",
      reason: JobEndReason.Resignation,
      finalPayCents: 450000,
    },
  };
  const leave = {
    id: "leave",
    kind: "employment.leave",
    personId: "p",
    date: "2026-09-01",
    status: "planned",
    payload: {
      jobId: "job-1",
      kind: JobLeaveKind.Sabbatical,
      endDate: "2026-11-30",
    },
  };
  const decode = (events: unknown[]) => decodeTimelineRecord(JSON.stringify({
    version: 2,
    events,
  }), lifeEventCatalog).status;
  assert.equal(decode([start, change, leave, ended]), TimelineRecordStatus.Valid);
  assert.equal(decode([change]), TimelineRecordStatus.Invalid);
  assert.equal(decode([ended]), TimelineRecordStatus.Invalid);
  assert.equal(decode([leave]), TimelineRecordStatus.Invalid);
  assert.equal(decode([start, ended, {
    ...ended,
    id: "duplicate-end",
  }]), TimelineRecordStatus.Invalid);
  assert.equal(decode([start, {
    ...change,
    personId: "other",
  }]), TimelineRecordStatus.Invalid);
  assert.equal(decode([start, {
    ...ended,
    personId: "other",
  }]), TimelineRecordStatus.Invalid);
  assert.equal(decode([start, {
    ...start,
    id: "duplicate",
  }]), TimelineRecordStatus.Invalid);
  assert.throws(() => jobChangedModule.parsePayload({ jobId: "job-1" }));
  assert.throws(() => jobEndedModule.parsePayload({
    jobId: "job-1",
    reason: "unknown-reason",
  }));
  assert.throws(() => jobEndedModule.parsePayload({
    jobId: "job-1",
    reason: JobEndReason.Resignation,
    finalPayCents: -100,
  }));
  assert.throws(() => jobLeaveModule.parsePayload({
    jobId: "job-1",
    kind: "unknown-leave",
  }));
});
