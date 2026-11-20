import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  TravelDestinationRegion,
  toTravelDestinationRegion,
} from "#engine/lifeProfile/travelEvent";
import {
  createScopedStateStore,
} from "#engine/storage/scopedStateStore";

export interface StandaloneTripItem {
  readonly id: string;
  readonly originCity: string;
  readonly destination: string;
  readonly region: TravelDestinationRegion;
  readonly startDate: string;
  readonly endDate: string;
  readonly budgetEur: number;
}

export interface TravelPlannerState {
  readonly passportExpiryDate: string;
  readonly permitExpiryDate: string;
  readonly compareOrigin: string;
  readonly compareDestination: string;
  readonly trips: readonly StandaloneTripItem[];
}

const DEFAULT_STATE: TravelPlannerState = {
  passportExpiryDate: "2028-11-30",
  permitExpiryDate: "2027-08-31",
  compareOrigin: "Berlin",
  compareDestination: "Paris",
  trips: [
    {
      id: "trip-1",
      originCity: "Berlin",
      destination: "Paris",
      region: TravelDestinationRegion.SchengenArea,
      startDate: "2026-07-10",
      endDate: "2026-07-15",
      budgetEur: 1200,
    },
    {
      id: "trip-2",
      originCity: "Frankfurt",
      destination: "Tokyo",
      region: TravelDestinationRegion.InternationalNonEu,
      startDate: "2026-10-02",
      endDate: "2026-10-16",
      budgetEur: 3400,
    },
  ],
};

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function clampEur(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(200000, Math.round(value)));
}

function parseTrip(raw: unknown, index: number): StandaloneTripItem | undefined {
  if (typeof raw !== "object" || raw === null) {
    return undefined;
  }
  const obj = raw as Record<string, unknown>;
  let region: TravelDestinationRegion = TravelDestinationRegion.SchengenArea;
  if (typeof obj.region === "string") {
    try {
      region = toTravelDestinationRegion(obj.region);
    }
    catch {
      region = TravelDestinationRegion.SchengenArea;
    }
  }
  return {
    id: typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : `trip-${index + 1}`,
    originCity: typeof obj.originCity === "string" ? obj.originCity.trim() : "Berlin",
    destination: typeof obj.destination === "string" && obj.destination.trim() ? obj.destination.trim() : `Destination ${index + 1}`,
    region,
    startDate: isIsoDate(obj.startDate) ? obj.startDate : "2026-07-01",
    endDate: isIsoDate(obj.endDate) ? obj.endDate : "2026-07-08",
    budgetEur: clampEur(obj.budgetEur, 0),
  };
}

function parseState(raw: unknown): TravelPlannerState {
  if (typeof raw !== "object" || raw === null) {
    return DEFAULT_STATE;
  }
  const obj = raw as Record<string, unknown>;
  const trips = Array.isArray(obj.trips)
    ? obj.trips.map(parseTrip).filter((item): item is StandaloneTripItem => item !== undefined)
    : DEFAULT_STATE.trips;

  return {
    passportExpiryDate: isIsoDate(obj.passportExpiryDate) ? obj.passportExpiryDate : DEFAULT_STATE.passportExpiryDate,
    permitExpiryDate: isIsoDate(obj.permitExpiryDate) ? obj.permitExpiryDate : "",
    compareOrigin: typeof obj.compareOrigin === "string" && obj.compareOrigin.trim() ? obj.compareOrigin.trim() : DEFAULT_STATE.compareOrigin,
    compareDestination: typeof obj.compareDestination === "string" && obj.compareDestination.trim() ? obj.compareDestination.trim() : DEFAULT_STATE.compareDestination,
    trips,
  };
}

export const travelPlannerStore = createScopedStateStore<TravelPlannerState>({
  appId: AppId.TravelPlanner,
  field: "state",
  createDefault: () => DEFAULT_STATE,
  parse: parseState,
});
