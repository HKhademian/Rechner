import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  lifeEventCatalog,
} from "#engine/lifeProfile/eventCatalog";
import {
  TravelDestinationRegion,
  travelTripModule,
} from "#engine/lifeProfile/travelEvent";
import {
  TimelineRecordStatus,
  decodeTimelineRecord,
} from "#engine/lifeProfile/timelineRecord";

it("validates travel.trip payloads and decodes cleanly in timeline records", () => {
  const payload = travelTripModule.parsePayload({
    destination: "Paris",
    region: TravelDestinationRegion.SchengenArea,
    originCity: "Munich",
    endDate: "2026-08-18",
    budgetCents: 145000,
    passportExpiryDate: "2029-05-01",
    tasks: ["Book TGV tickets", "Pack eAT card"],
  });
  assert.equal(payload.destination, "Paris");
  assert.equal(payload.tasks?.length, 2);

  assert.throws(() => travelTripModule.parsePayload({
    destination: " ",
    region: TravelDestinationRegion.SchengenArea,
  }));
  assert.throws(() => travelTripModule.parsePayload({
    destination: "Tokyo",
    region: TravelDestinationRegion.InternationalNonEu,
    budgetCents: -500,
  }));

  const decoded = decodeTimelineRecord(JSON.stringify({
    version: 2,
    events: [
      {
        id: "trip-1",
        kind: travelTripModule.kind,
        personId: "p1",
        date: "2026-08-10",
        status: "planned",
        payload,
      },
    ],
  }), lifeEventCatalog);
  assert.equal(decoded.status, TimelineRecordStatus.Valid);
});
