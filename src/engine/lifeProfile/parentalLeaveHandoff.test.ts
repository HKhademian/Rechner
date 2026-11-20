import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  PersonRelationship,
  toLifeDate,
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  actualBirthModule,
  pregnancyStartedModule,
  toFamilyPregnancyId,
} from "#engine/lifeProfile/familyEvent";
import {
  jobStartedModule,
  toLifeJobId,
} from "#engine/lifeProfile/employmentEvent";
import {
  buildParentalLeaveHandoffPreview,
} from "#engine/lifeProfile/parentalLeaveHandoff";
import {
  LifeEventStatus,
  toLifeEventDate,
  toLifeEventId,
} from "#engine/lifeProfile/timeline";
import {
  SalaryPeriod,
  toGrossSalary,
} from "#engine/types";

it("previews birth milestone, children count and household gross pay for Parental Leave Planner without mutating scenarios", () => {
  const selfId = toPersonId("self");
  const partnerId = toPersonId("partner");
  const people = [
    {
      id: selfId,
      name: "Alex",
      relationship: PersonRelationship.Self,
    },
    {
      id: partnerId,
      name: "Jordan",
      relationship: PersonRelationship.Partner,
    },
  ];
  const pregId = toFamilyPregnancyId("preg-1");
  const events = [
    {
      id: toLifeEventId("job-self"),
      kind: jobStartedModule.kind,
      personId: selfId,
      date: toLifeEventDate("2025-01-01"),
      status: LifeEventStatus.Actual,
      payload: {
        jobId: toLifeJobId("j1"),
        employer: "Acme GmbH",
        gross: toGrossSalary(5000),
        grossPeriod: SalaryPeriod.Monthly,
      },
    },
    {
      id: toLifeEventId("job-partner"),
      kind: jobStartedModule.kind,
      personId: partnerId,
      date: toLifeEventDate("2025-01-01"),
      status: LifeEventStatus.Actual,
      payload: {
        jobId: toLifeJobId("j2"),
        employer: "Beta AG",
        gross: toGrossSalary(48000),
        grossPeriod: SalaryPeriod.Yearly,
      },
    },
    {
      id: toLifeEventId("preg-1"),
      kind: pregnancyStartedModule.kind,
      personId: selfId,
      date: toLifeEventDate("2026-01-10"),
      status: LifeEventStatus.Actual,
      payload: {
        pregnancyId: pregId,
        expectedDueDate: toLifeDate("2026-09-20"),
      },
    },
    {
      id: toLifeEventId("birth-1"),
      kind: actualBirthModule.kind,
      personId: selfId,
      date: toLifeEventDate("2026-09-15"),
      status: LifeEventStatus.Actual,
      payload: {
        pregnancyId: pregId,
        childName: "Lina",
        multipleCount: 2,
      },
    },
  ];

  const preview = buildParentalLeaveHandoffPreview({
    people,
    events,
    asOf: toLifeDate("2026-10-01"),
    includePlanned: true,
  });

  assert.equal(preview.targetPath, "/elterngeld/");
  assert.equal(preview.birthDate, "2026-09-15");
  assert.equal(preview.birthDateIsActual, true);
  assert.equal(preview.multipleCount, 2);
  assert.equal(preview.dependentChildrenCount, 2);
  assert.equal(preview.primaryAnnualGrossEur, 60000);
  assert.equal(preview.partnerAnnualGrossEur, 48000);
  assert.equal(preview.proposedProfilePatch.dependentChildrenCount, 2);
  assert.equal(preview.proposedProfilePatch.primaryAnnualGrossEur, 60000);
  assert.equal(preview.proposedProfilePatch.partnerAnnualGrossEur, 48000);
});
