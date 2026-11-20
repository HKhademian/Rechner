import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  toLifeDate,
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  ResidencePermitKind,
  residencePermitModule,
} from "#engine/lifeProfile/residencePermitEvent";
import {
  TravelDestinationRegion,
  travelTripModule,
} from "#engine/lifeProfile/travelEvent";
import {
  TravelTransportMode,
  estimateTransportModes,
  evaluateTravelReadiness,
  findOfflineCity,
  haversineDistanceKm,
} from "#engine/lifeProfile/travelEstimate";
import {
  LifeEventStatus,
  toLifeEventDate,
  toLifeEventId,
} from "#engine/lifeProfile/timeline";
import {
  toEuroCents,
} from "#engine/types";

it("computes offline Haversine distance and multi-mode transport estimates accurately", () => {
  const munich = findOfflineCity("Munich");
  const berlin = findOfflineCity("Berlin");
  assert.ok(munich && berlin);
  const km = Math.round(haversineDistanceKm(munich.lat, munich.lon, berlin.lat, berlin.lon));
  assert.ok(km >= 490 && km <= 520, `Expected ~504 km, got ${km}`);

  const modes = estimateTransportModes(500);
  assert.equal(modes.length, 4);
  const train = modes.find((entry) => entry.mode === TravelTransportMode.Train);
  const flight = modes.find((entry) => entry.mode === TravelTransportMode.Flight);
  assert.ok(train && flight);
  assert.equal(train.distanceKm, 550);
  assert.equal(train.estimatedOneWayCents, 11000);
  assert.equal(flight.distanceKm, 500);
  assert.ok(flight.durationMinutes > 180);
});

it("flags passport 6-month non-EU validity warnings and German residence permit re-entry expiry", () => {
  const personId = toPersonId("p1");
  const events = [
    {
      id: toLifeEventId("permit-1"),
      kind: residencePermitModule.kind,
      personId,
      date: toLifeEventDate("2024-01-01"),
      status: LifeEventStatus.Actual,
      payload: {
        permitKind: ResidencePermitKind.EuBlueCard,
        expiryDate: toLifeDate("2026-08-01"),
      },
    },
    {
      id: toLifeEventId("trip-1"),
      kind: travelTripModule.kind,
      personId,
      date: toLifeEventDate("2026-08-10"),
      status: LifeEventStatus.Planned,
      payload: {
        destination: "Tokyo",
        originCity: "Munich",
        region: TravelDestinationRegion.InternationalNonEu,
        endDate: toLifeDate("2026-08-25"),
        budgetCents: toEuroCents(350000),
        passportExpiryDate: toLifeDate("2026-12-01"),
        tasks: ["Check visa requirements"],
      },
    },
  ];

  const summary = evaluateTravelReadiness({
    events,
    personId,
    includePlanned: true,
  });

  assert.equal(summary.trips.length, 1);
  assert.equal(summary.totalBudgetCents, 350000);
  assert.equal(summary.warningCount, 2);
  assert.ok(summary.trips[0].straightLineKm && summary.trips[0].straightLineKm > 9000);
  assert.equal(summary.trips[0].transportEstimates.length, 4);
});
