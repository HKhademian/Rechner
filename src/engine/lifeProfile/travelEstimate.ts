import {
  type EuroCents,
  toEuroCents,
} from "#engine/types";
import {
  type LifeDate,
  type PersonId,
  toLifeDate,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
  type LifeEventId,
  LifeEventStatus,
} from "#engine/lifeProfile/timeline";
import {
  residencePermitModule,
} from "#engine/lifeProfile/residencePermitEvent";
import {
  type TravelTripPayload,
  TravelDestinationRegion,
  travelTripModule,
} from "#engine/lifeProfile/travelEvent";

export const TravelTransportMode = {
  Car: "car",
  Bus: "bus",
  Train: "train",
  Flight: "flight",
} as const;
export type TravelTransportMode = (typeof TravelTransportMode)[keyof typeof TravelTransportMode];

export interface OfflineCityCoordinate {
  readonly name: string;
  readonly lat: number;
  readonly lon: number;
}

/** Static offline city reference table (no external geocoding API calls). */
export const OFFLINE_TRAVEL_CITIES: readonly OfflineCityCoordinate[] = Object.freeze([
  { name: "Berlin",
    lat: 52.52,
    lon: 13.405 },
  { name: "Munich",
    lat: 48.1351,
    lon: 11.582 },
  { name: "Hamburg",
    lat: 53.5511,
    lon: 9.9937 },
  { name: "Frankfurt",
    lat: 50.1109,
    lon: 8.6821 },
  { name: "Cologne",
    lat: 50.9375,
    lon: 6.9603 },
  { name: "Stuttgart",
    lat: 48.7758,
    lon: 9.1829 },
  { name: "Vienna",
    lat: 48.2082,
    lon: 16.3738 },
  { name: "Zurich",
    lat: 47.3769,
    lon: 8.5417 },
  { name: "Paris",
    lat: 48.8566,
    lon: 2.3522 },
  { name: "Amsterdam",
    lat: 52.3676,
    lon: 4.9041 },
  { name: "Prague",
    lat: 50.0755,
    lon: 14.4378 },
  { name: "Milan",
    lat: 45.4642,
    lon: 9.19 },
  { name: "Rome",
    lat: 41.9028,
    lon: 12.4964 },
  { name: "Barcelona",
    lat: 41.3874,
    lon: 2.1686 },
  { name: "London",
    lat: 51.5074,
    lon: -0.1278 },
  { name: "New York",
    lat: 40.7128,
    lon: -74.006 },
  { name: "Tokyo",
    lat: 35.6762,
    lon: 139.6503 },
  { name: "Sydney",
    lat: -33.8688,
    lon: 151.2093 },
]);

export interface TransportModeEstimate {
  readonly mode: TravelTransportMode;
  readonly label: string;
  readonly providerHint: string;
  readonly distanceKm: number;
  readonly durationMinutes: number;
  readonly durationText: string;
  readonly estimatedOneWayCents: EuroCents;
  readonly estimatedRoundTripCents: EuroCents;
}

export interface TripReadinessAssessment {
  readonly eventId: LifeEventId;
  readonly startDate?: string;
  readonly payload: TravelTripPayload;
  readonly documentWarnings: readonly string[];
  readonly entryGuidance: string;
  readonly straightLineKm?: number;
  readonly transportEstimates: readonly TransportModeEstimate[];
}

export interface TravelPlannerSummary {
  readonly trips: readonly TripReadinessAssessment[];
  readonly totalBudgetCents: EuroCents;
  readonly warningCount: number;
}

interface TransportProfile {
  readonly mode: TravelTransportMode;
  readonly label: string;
  readonly providerHint: string;
  readonly distMult: number;
  readonly speedKmH: number;
  readonly pricePerKmEur: number;
  readonly overheadHours: number;
}

/** Pure offline multi-mode parameters harmonized with TravelPlanner donor constants. */
const TRANSPORT_PROFILES: readonly TransportProfile[] = Object.freeze([
  {
    mode: TravelTransportMode.Car,
    label: "Car",
    providerHint: "Personal vehicle",
    distMult: 1.2,
    speedKmH: 100,
    pricePerKmEur: 0.15,
    overheadHours: 0,
  },
  {
    mode: TravelTransportMode.Bus,
    label: "Bus",
    providerHint: "Long-distance coach",
    distMult: 1.2,
    speedKmH: 80,
    pricePerKmEur: 0.08,
    overheadHours: 0,
  },
  {
    mode: TravelTransportMode.Train,
    label: "Train",
    providerHint: "DB / ICE / Eurostar",
    distMult: 1.1,
    speedKmH: 150,
    pricePerKmEur: 0.2,
    overheadHours: 0,
  },
  {
    mode: TravelTransportMode.Flight,
    label: "Flight",
    providerHint: "Commercial flight (+3h airport buffer)",
    distMult: 1,
    speedKmH: 800,
    pricePerKmEur: 0.35,
    overheadHours: 3,
  },
]);

/** Computes great-circle Haversine distance in kilometers between two WGS-84 coordinates. */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180)
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function findOfflineCity(name: string | undefined): OfflineCityCoordinate | undefined {
  if (!name?.trim()) {
    return undefined;
  }
  const normalized = name.trim().toLowerCase();
  return OFFLINE_TRAVEL_CITIES.find((city) => city.name.toLowerCase() === normalized);
}

function formatDurationMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) {
    return `${mins}m`;
  }
  return `${hours}h ${mins}m`;
}

/** Estimates one-way and round-trip distance, duration and rough cost across Car, Bus, Train and Flight. */
export function estimateTransportModes(straightLineKm: number): readonly TransportModeEstimate[] {
  if (!Number.isFinite(straightLineKm) || straightLineKm <= 0) {
    return Object.freeze([]);
  }
  return Object.freeze(TRANSPORT_PROFILES.map((profile) => {
    const distanceKm = Math.round(straightLineKm * profile.distMult);
    const totalHours = (distanceKm / profile.speedKmH) + profile.overheadHours;
    const durationMinutes = Math.max(1, Math.round(totalHours * 60));
    const oneWayCents = toEuroCents(Math.round(distanceKm * profile.pricePerKmEur * 100));
    const roundTripCents = toEuroCents(oneWayCents * 2);
    return Object.freeze({
      mode: profile.mode,
      label: profile.label,
      providerHint: profile.providerHint,
      distanceKm,
      durationMinutes,
      durationText: formatDurationMinutes(durationMinutes),
      estimatedOneWayCents: oneWayCents,
      estimatedRoundTripCents: roundTripCents,
    });
  }));
}

function dayDiff(from: LifeDate, to: LifeDate): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

function entryGuidanceForRegion(region: TravelDestinationRegion): string {
  if (region === TravelDestinationRegion.DomesticGermany) {
    return "Domestic Germany travel: carry valid ID card or passport (and eAT if applicable).";
  }
  if (region === TravelDestinationRegion.SchengenArea) {
    return "Schengen Area: carry valid passport/ID and physical German residence permit (eAT) for re-entry; non-EU nationals should track 90/180-day short-stay limits in other Schengen states.";
  }
  if (region === TravelDestinationRegion.EuNonSchengen) {
    return "EU (non-Schengen): border passport control applies; verify whether a separate entry visa is required for your nationality alongside a German residence permit.";
  }
  if (region === TravelDestinationRegion.UkIreland) {
    return "UK / Ireland: passport required; check UK ETA or visa requirements for your nationality before booking.";
  }
  return "International (non-EU): verify destination visa/eTA rules, passport 6-month validity rule, and German residence permit re-entry validity with official embassy sources.";
}

/** Evaluates recorded trips, passport and permit validity against return dates, budget totals and offline transport estimates. */
export function evaluateTravelReadiness(input: {
  readonly events: readonly LifeEvent<unknown>[];
  readonly personId: PersonId;
  readonly includePlanned: boolean;
}): TravelPlannerSummary {
  const relevant = input.events.filter((event) => event.personId === input.personId
    && (input.includePlanned || event.status === LifeEventStatus.Actual));

  const permitExpiries: LifeDate[] = [];
  for (const event of relevant) {
    if (event.kind === residencePermitModule.kind) {
      const permit = residencePermitModule.parsePayload(event.payload);
      if (permit.expiryDate) {
        permitExpiries.push(permit.expiryDate);
      }
    }
  }
  permitExpiries.sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
  const latestPermitExpiry = permitExpiries[permitExpiries.length - 1];

  const trips: TripReadinessAssessment[] = [];
  let totalBudget = 0;
  let warningCount = 0;

  for (const event of relevant) {
    if (event.kind !== travelTripModule.kind) {
      continue;
    }
    const payload = travelTripModule.parsePayload(event.payload);
    totalBudget += payload.budgetCents ?? 0;

    const warnings: string[] = [];
    const referenceDate = payload.endDate ?? (event.date?.length === 10 ? toLifeDate(event.date) : undefined);

    if (referenceDate && payload.passportExpiryDate) {
      const remainingDays = dayDiff(referenceDate, payload.passportExpiryDate);
      if (remainingDays < 0) {
        warnings.push(`Passport expires on ${payload.passportExpiryDate}, before the trip return date (${referenceDate}).`);
      }
      else if (payload.region === TravelDestinationRegion.InternationalNonEu && remainingDays < 180) {
        warnings.push(`Passport has ${remainingDays} days validity after return (${payload.passportExpiryDate}); many non-EU destinations require 6 months (180 days).`);
      }
      else if (payload.region !== TravelDestinationRegion.DomesticGermany && remainingDays < 90) {
        warnings.push(`Passport has ${remainingDays} days validity after return (${payload.passportExpiryDate}); check 3-month entry validity rules.`);
      }
    }
    else if (payload.region !== TravelDestinationRegion.DomesticGermany && !payload.passportExpiryDate) {
      warnings.push("Passport expiry date not recorded; add it to verify document validity.");
    }

    if (referenceDate && latestPermitExpiry && payload.region !== TravelDestinationRegion.DomesticGermany) {
      const permitRemaining = dayDiff(referenceDate, latestPermitExpiry);
      if (permitRemaining < 0) {
        warnings.push(`Latest recorded residence permit expires ${latestPermitExpiry}, before trip return (${referenceDate}) — re-entry to Germany may be affected.`);
      }
    }

    const origin = findOfflineCity(payload.originCity);
    const dest = findOfflineCity(payload.destination);
    const straightLineKm = origin && dest
      ? Math.round(haversineDistanceKm(origin.lat, origin.lon, dest.lat, dest.lon))
      : undefined;
    const transportEstimates = straightLineKm && straightLineKm > 0
      ? estimateTransportModes(straightLineKm)
      : Object.freeze([]);

    warningCount += warnings.length;
    trips.push(Object.freeze({
      eventId: event.id,
      ...(event.date ? { startDate: event.date } : {}),
      payload,
      documentWarnings: Object.freeze(warnings),
      entryGuidance: entryGuidanceForRegion(payload.region),
      ...(straightLineKm !== undefined ? { straightLineKm } : {}),
      transportEstimates,
    }));
  }

  return Object.freeze({
    trips: Object.freeze(trips),
    totalBudgetCents: toEuroCents(totalBudget),
    warningCount,
  });
}
