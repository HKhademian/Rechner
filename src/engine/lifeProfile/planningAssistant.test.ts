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
  JobEndReason,
  jobEndedModule,
  jobStartedModule,
  toLifeJobId,
} from "#engine/lifeProfile/employmentEvent";
import {
  ResidencePermitKind,
  residencePermitModule,
} from "#engine/lifeProfile/residencePermitEvent";
import {
  AssetActionKind,
  AssetCategory,
  assetEventModule,
  toLifeAssetId,
} from "#engine/lifeProfile/assetEvent";
import {
  PlanningPriority,
  buildPlanningAssistance,
} from "#engine/lifeProfile/planningAssistant";
import {
  LifeEventStatus,
  toLifeEventDate,
  toLifeEventId,
} from "#engine/lifeProfile/timeline";
import {
  toEuroCents,
} from "#engine/types";

it("generates grounded suggestions and re-ranks them when user changes planning priority", () => {
  const selfId = toPersonId("self");
  const people = [
    {
      id: selfId,
      name: "Alex",
      relationship: PersonRelationship.Self,
    },
  ];
  const jobId = toLifeJobId("job-1");
  const events = [
    {
      id: toLifeEventId("job-start"),
      kind: jobStartedModule.kind,
      personId: selfId,
      date: toLifeEventDate("2024-01-01"),
      status: LifeEventStatus.Actual,
      payload: {
        jobId,
        employer: "Acme GmbH",
      },
    },
    {
      id: toLifeEventId("job-end"),
      kind: jobEndedModule.kind,
      personId: selfId,
      date: toLifeEventDate("2026-09-30"),
      status: LifeEventStatus.Planned,
      payload: {
        jobId,
        reason: JobEndReason.Resignation,
      },
    },
    {
      id: toLifeEventId("permit-1"),
      kind: residencePermitModule.kind,
      personId: selfId,
      date: toLifeEventDate("2024-02-01"),
      status: LifeEventStatus.Actual,
      payload: {
        permitKind: ResidencePermitKind.EuBlueCard,
        issueDate: toLifeDate("2024-02-01"),
      },
    },
    {
      id: toLifeEventId("solar-1"),
      kind: assetEventModule.kind,
      personId: selfId,
      date: toLifeEventDate("2026-07-01"),
      status: LifeEventStatus.Planned,
      payload: {
        assetId: toLifeAssetId("pv-1"),
        category: AssetCategory.Solar,
        action: AssetActionKind.Installation,
        title: "Roof PV",
        upfrontCents: toEuroCents(1400000),
      },
    },
  ];

  const cashFocused = buildPlanningAssistance({
    people,
    events,
    asOf: toLifeDate("2026-05-01"),
    includePlanned: true,
    priority: PlanningPriority.CashRunway,
  });
  assert.equal(cashFocused.suggestions[0].id, "employment-transition-runway");
  assert.equal(cashFocused.tradeOffs.length, 5);

  const residencyFocused = buildPlanningAssistance({
    people,
    events,
    asOf: toLifeDate("2026-05-01"),
    includePlanned: true,
    priority: PlanningPriority.ResidencyAndCitizenship,
  });
  assert.equal(residencyFocused.suggestions[0].id, "residency-citizenship-readiness");

  const purchaseFocused = buildPlanningAssistance({
    people,
    events,
    asOf: toLifeDate("2026-05-01"),
    includePlanned: true,
    priority: PlanningPriority.MajorPurchases,
  });
  assert.equal(purchaseFocused.suggestions[0].id, "major-purchases-affordability");
});
