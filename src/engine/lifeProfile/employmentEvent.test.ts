import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  jobStartedModule,
} from "#engine/lifeProfile/employmentEvent";

it("validates job details without inventing pay from working hours", () => {
  const job = { jobId: "job-1",
    employer: "Example",
    weeklyHours: 32 };
  assert.deepEqual(jobStartedModule.parsePayload(job), job);
  assert.deepEqual(jobStartedModule.parsePayload({ ...job,
    gross: 4000,
    grossPeriod: "MONTHLY" }), { ...job,
    gross: 4000,
    grossPeriod: "MONTHLY" });
  assert.throws(() => jobStartedModule.parsePayload({ ...job,
    gross: 4000 }));
  assert.throws(() => jobStartedModule.parsePayload({ ...job,
    gross: -1,
    grossPeriod: "MONTHLY" }));
  assert.throws(() => jobStartedModule.parsePayload({ ...job,
    weeklyHours: 61 }));
});
