import {
  type Brand,
} from "#engine/types";
import {
  type LifeEventModule,
} from "#engine/lifeProfile/eventModules";
import {
  toLifeEventKind,
} from "#engine/lifeProfile/timeline";

export type PlaceId = Brand<string, "PlaceId">;
export interface ResidenceMovePayload {
  readonly placeId: PlaceId;
  readonly location: string;
}

export function toPlaceId(value: string): PlaceId {
  if (!value || value.trim() !== value) {
    throw new TypeError("Place ID must not be empty or contain surrounding whitespace.");
  }
  return value as PlaceId;
}

/** A location is recorded information, not a residency eligibility decision. */
export const residenceMoveModule: LifeEventModule<ResidenceMovePayload> = Object.freeze({
  kind: toLifeEventKind("residence.move"),
  parsePayload(value: unknown): ResidenceMovePayload {
    if (typeof value !== "object" || value === null || Array.isArray(value)
      || Object.keys(value).some((key) => !["placeId", "location"].includes(key))
      || !("placeId" in value) || typeof value.placeId !== "string"
      || !("location" in value) || typeof value.location !== "string" || !value.location.trim()) {
      throw new TypeError("A move needs a place identifier and location.");
    }
    return Object.freeze({ placeId: toPlaceId(value.placeId),
      location: value.location });
  },
});
