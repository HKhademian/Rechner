import {
  type EuroCents,
  toEuroCents,
} from "#engine/types";
import {
  type LifeDate,
  toLifeDate,
} from "#engine/lifeProfile/person";
import {
  type LifeEventModule,
} from "#engine/lifeProfile/eventModules";
import {
  toLifeEventKind,
} from "#engine/lifeProfile/timeline";

export const TravelDestinationRegion = {
  DomesticGermany: "domestic-de",
  SchengenArea: "schengen",
  EuNonSchengen: "eu-non-schengen",
  UkIreland: "uk-ireland",
  InternationalNonEu: "international",
} as const;
export type TravelDestinationRegion = (typeof TravelDestinationRegion)[keyof typeof TravelDestinationRegion];

export function toTravelDestinationRegion(value: string): TravelDestinationRegion {
  if (!Object.values(TravelDestinationRegion).includes(value as TravelDestinationRegion)) {
    throw new TypeError("Invalid travel destination region.");
  }
  return value as TravelDestinationRegion;
}

export interface TravelTripPayload {
  readonly destination: string;
  readonly region: TravelDestinationRegion;
  readonly originCity?: string;
  readonly endDate?: LifeDate;
  readonly budgetCents?: EuroCents;
  readonly passportExpiryDate?: LifeDate;
  readonly tasks?: readonly string[];
}

const ALLOWED_KEYS = [
  "destination",
  "region",
  "originCity",
  "endDate",
  "budgetCents",
  "passportExpiryDate",
  "tasks",
] as const;

/** Records a planned or past trip with destination region, budget, document expiry and preparation tasks. */
export const travelTripModule: LifeEventModule<TravelTripPayload> = Object.freeze({
  kind: toLifeEventKind("travel.trip"),
  parsePayload(value: unknown): TravelTripPayload {
    if (typeof value !== "object" || value === null || Array.isArray(value)
      || Object.keys(value).some((key) => !(ALLOWED_KEYS as readonly string[]).includes(key))
      || !("destination" in value) || typeof value.destination !== "string" || !value.destination.trim()
      || !("region" in value) || typeof value.region !== "string") {
      throw new TypeError("A trip needs a destination and destination region.");
    }
    const raw = value as Record<string, unknown>;
    if ((raw.originCity !== undefined && (typeof raw.originCity !== "string" || !raw.originCity.trim()))
      || (raw.endDate !== undefined && typeof raw.endDate !== "string")
      || (raw.passportExpiryDate !== undefined && typeof raw.passportExpiryDate !== "string")
      || (raw.budgetCents !== undefined && (typeof raw.budgetCents !== "number" || !Number.isSafeInteger(raw.budgetCents) || raw.budgetCents < 0))) {
      throw new TypeError("Check trip origin, dates and non-negative integer euro cent budget.");
    }
    let tasks: readonly string[] | undefined;
    if (raw.tasks !== undefined) {
      if (!Array.isArray(raw.tasks) || raw.tasks.some((item) => typeof item !== "string" || !item.trim())) {
        throw new TypeError("Trip tasks must be an array of non-empty strings.");
      }
      tasks = Object.freeze(raw.tasks.map((item) => (item as string).trim()));
    }
    return Object.freeze({
      destination: value.destination.trim(),
      region: toTravelDestinationRegion(value.region),
      ...(typeof raw.originCity === "string" ? { originCity: raw.originCity.trim() } : {}),
      ...(typeof raw.endDate === "string" ? { endDate: toLifeDate(raw.endDate) } : {}),
      ...(typeof raw.budgetCents === "number" ? { budgetCents: toEuroCents(raw.budgetCents) } : {}),
      ...(typeof raw.passportExpiryDate === "string" ? { passportExpiryDate: toLifeDate(raw.passportExpiryDate) } : {}),
      ...(tasks ? { tasks } : {}),
    });
  },
});
