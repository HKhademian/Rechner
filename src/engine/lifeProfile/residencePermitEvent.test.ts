import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  lifeEventCatalog,
} from "#engine/lifeProfile/eventCatalog";
import {
  ApplicationMilestoneStage,
  ApplicationTarget,
  ResidencePermitKind,
  residenceInterruptionModule,
  residenceMilestoneModule,
  residencePermitModule,
} from "#engine/lifeProfile/residencePermitEvent";
import {
  TimelineRecordStatus,
  decodeTimelineRecord,
} from "#engine/lifeProfile/timelineRecord";

it("validates residence permits, interruptions and application milestones", () => {
  const permit = residencePermitModule.parsePayload({
    permitKind: ResidencePermitKind.EuBlueCard,
    issueDate: "2024-03-01",
    expiryDate: "2028-02-29",
    countryCode: "DE",
    label: "EU Blue Card Munich",
  });
  assert.equal(permit.permitKind, ResidencePermitKind.EuBlueCard);
  assert.throws(() => residencePermitModule.parsePayload({
    permitKind: ResidencePermitKind.EuBlueCard,
    issueDate: "2025-01-01",
    expiryDate: "2024-12-31",
  }));
  assert.throws(() => residencePermitModule.parsePayload({
    permitKind: "invalid-permit",
  }));

  const interruption = residenceInterruptionModule.parsePayload({
    days: 45,
    reason: "Extended remote stay abroad",
    returnDate: "2025-05-15",
  });
  assert.equal(interruption.days, 45);
  assert.throws(() => residenceInterruptionModule.parsePayload({
    days: 0,
    reason: "Invalid",
  }));

  const milestone = residenceMilestoneModule.parsePayload({
    target: ApplicationTarget.PermanentResidency,
    stage: ApplicationMilestoneStage.AppointmentBooked,
    title: "KVR Niederlassungserlaubnis appointment",
  });
  assert.equal(milestone.stage, ApplicationMilestoneStage.AppointmentBooked);

  const decoded = decodeTimelineRecord(JSON.stringify({
    version: 2,
    events: [
      {
        id: "permit-1",
        kind: "residence.permit",
        personId: "p",
        date: "2024-03-01",
        status: "actual",
        payload: permit,
      },
      {
        id: "absence-1",
        kind: "residence.interruption",
        personId: "p",
        date: "2025-04-01",
        status: "actual",
        payload: interruption,
      },
      {
        id: "milestone-1",
        kind: "residence.milestone",
        personId: "p",
        date: "2026-01-15",
        status: "planned",
        payload: milestone,
      },
    ],
  }), lifeEventCatalog);
  assert.equal(decoded.status, TimelineRecordStatus.Valid);
});
