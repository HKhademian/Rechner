import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  ChildcareApplicationStatus,
  ChildcareFacilityKind,
  childcarePlanModule,
} from "#engine/lifeProfile/childcareEvent";
import {
  lifeEventCatalog,
} from "#engine/lifeProfile/eventCatalog";
import {
  TimelineRecordStatus,
  decodeTimelineRecord,
} from "#engine/lifeProfile/timelineRecord";

it("validates childcare and school plan events and round-trips through timeline decode", () => {
  const payload = childcarePlanModule.parsePayload({
    facilityKind: ChildcareFacilityKind.Kita,
    providerName: "Kita Sonnenschein",
    municipality: "Munich",
    desiredStartDate: "2027-09-01",
    applicationDeadline: "2027-03-15",
    enrollmentDeadline: "2027-05-01",
    applicationStatus: ChildcareApplicationStatus.Applied,
    monthlyFeeCents: 22000,
    monthlyMealCents: 8500,
  });
  assert.equal(payload.providerName, "Kita Sonnenschein");
  assert.equal(payload.monthlyFeeCents, 22000);

  assert.throws(() => childcarePlanModule.parsePayload({
    facilityKind: ChildcareFacilityKind.Kita,
    providerName: " ",
    applicationStatus: ChildcareApplicationStatus.Applied,
  }));
  assert.throws(() => childcarePlanModule.parsePayload({
    facilityKind: ChildcareFacilityKind.Krippe,
    providerName: "Test",
    applicationStatus: ChildcareApplicationStatus.Shortlisted,
    monthlyFeeCents: -100,
  }));

  const decoded = decodeTimelineRecord(JSON.stringify({
    version: 2,
    events: [
      {
        id: "cc-1",
        kind: childcarePlanModule.kind,
        personId: "child-1",
        date: "2027-09-01",
        status: "planned",
        payload,
      },
    ],
  }), lifeEventCatalog);
  assert.equal(decoded.status, TimelineRecordStatus.Valid);
});
