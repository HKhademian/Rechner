import {
  type Brand,
} from "#engine/types";

export const MapCategory = {
  FleaMarket: "Flea markets",
  Event: "Events",
  ChristmasMarket: "Christmas markets",
  ChristmasOuting: "Christmas outings",
  Festival: "Fairs & festivals",
  Concert: "Concerts",
  Landmark: "Landmarks",
  Transit: "Public transit",
  Church: "Churches",
  Cemetery: "Cemeteries",
  Subway: "U-Bahn",
  SuburbanRail: "S-Bahn",
  Tram: "Tram",
  Bus: "Bus",
} as const;
export type MapCategory = (typeof MapCategory)[keyof typeof MapCategory];

export function toMapCategory(value: string): MapCategory {
  const category = Object.values(MapCategory).find((entry) => entry === value);
  if (!category) {
    throw new TypeError("Choose a map category.");
  }
  return category;
}

export const PersonalPin = { Home: "Home",
  Work: "Work" } as const;
export type PersonalPin = (typeof PersonalPin)[keyof typeof PersonalPin];

export function toPersonalPin(value: string): PersonalPin {
  const pin = Object.values(PersonalPin).find((entry) => entry === value);
  if (!pin) {
    throw new TypeError("Choose Home or Work.");
  }
  return pin;
}

export type MapPosition = Brand<readonly [latitude: number, longitude: number], "MapPosition">;

export function toMapPosition(
  latitude: number,
  longitude: number,
): MapPosition {
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 85
    || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
    throw new TypeError("Enter a valid map position.");
  }
  const position = [latitude, longitude] as const;
  return position as MapPosition;
}

/** Great-circle distance using the same Earth radius as the map's distance scale. */
export function distanceKm(
  from: MapPosition,
  to: MapPosition,
): number {
  const radians = Math.PI / 180;
  const latitudeDelta = (to[0] - from[0]) * radians;
  const longitudeDelta = (to[1] - from[1]) * radians;
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(from[0] * radians) * Math.cos(to[0] * radians) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

export interface MapFocus {
  readonly position: MapPosition;
  readonly minimumZoom?: number;
  readonly zoom?: number;
  readonly radius?: number;
  readonly fitPositions?: readonly MapPosition[];
}

export type MapPlaceId = Brand<string, "MapPlaceId">;

export function toMapPlaceId(value: string): MapPlaceId {
  if (!/^[a-z0-9-]+$/.test(value)) {
    throw new TypeError("Invalid map place ID.");
  }
  return value as MapPlaceId;
}

export type TravelMinutes = Brand<number, "TravelMinutes">;

export function toTravelMinutes(value: number): TravelMinutes {
  if (!Number.isInteger(value) || value < 0 || value > 1440) {
    throw new TypeError("Travel time must be a whole number of minutes between 0 and 1440.");
  }
  return value as TravelMinutes;
}

export const OutingTravelMode = {
  Drive: "drive",
  Train: "train",
} as const;
export type OutingTravelMode = (typeof OutingTravelMode)[keyof typeof OutingTravelMode];

export function toOutingTravelMode(value: string): OutingTravelMode {
  const mode = Object.values(OutingTravelMode).find((entry) => entry === value);
  if (!mode) {
    throw new TypeError(`Unknown outing travel mode: ${value}`);
  }
  return mode;
}

export interface OutingJourney {
  readonly minutes: TravelMinutes;
  readonly source: string;
  readonly from?: string;
  readonly transfer?: {
    readonly label: string;
    readonly instructions: string;
  };
}

export type OutingLocation = {
  readonly locality: string;
} & Readonly<Partial<Record<OutingTravelMode, OutingJourney>>>;

export function formatTravelMinutes(minutes: TravelMinutes): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return [hours ? `${hours} h` : "", remainder || !hours ? `${remainder} min` : ""].filter(Boolean).join(" ");
}

export interface SeasonalSchedule {
  readonly venue: string;
  readonly theme: string;
  readonly hours: readonly (readonly [label: string, time: string])[];
  readonly exceptions?: readonly (readonly [label: string, time: string])[];
}

export interface MapPlace {
  readonly id: MapPlaceId;
  readonly title: string;
  readonly category: MapCategory;
  readonly position: MapPosition;
  readonly detail: string;
  readonly source?: string;
  readonly date?: string;
  readonly endDate?: string;
  readonly modes?: readonly MapCategory[];
  readonly sourceLabel?: string;
  readonly schedule?: SeasonalSchedule;
  readonly outing?: OutingLocation;
  readonly alsoListedUnder?: MapCategory;
}

const dateLabel = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export function formatPlaceDate(place: MapPlace): string | undefined {
  if (!place.date) {
    return undefined;
  }
  return place.endDate
    ? dateLabel.formatRange(new Date(place.date), new Date(place.endDate))
    : dateLabel.format(new Date(place.date));
}

export const landmarkLayers = [MapCategory.Landmark, MapCategory.Church, MapCategory.Cemetery] as const;
export const railLayers = [MapCategory.Subway, MapCategory.SuburbanRail, MapCategory.Tram] as const;
export const transitLayers = [...railLayers, MapCategory.Bus] as const;
export const mapLayers: readonly MapCategory[] = [...landmarkLayers, ...transitLayers];

export const MUNICH_CENTER = toMapPosition(48.1374, 11.5755);

export const categoryStyle: Record<MapCategory, { readonly code?: string;
  readonly color: string }> = {
  [MapCategory.FleaMarket]: { code: "F",
    color: "var(--color-gain-hover)" },
  [MapCategory.Event]: { code: "E",
    color: "var(--color-primary-hover)" },
  [MapCategory.ChristmasMarket]: { color: "#174b36" },
  [MapCategory.ChristmasOuting]: { color: "#43327b" },
  [MapCategory.Festival]: { code: "T",
    color: "#92400e" },
  [MapCategory.Concert]: { code: "C",
    color: "#6d28d9" },
  [MapCategory.Landmark]: { code: "L",
    color: "#334155" },
  [MapCategory.Transit]: { code: "P",
    color: "#0369a1" },
  [MapCategory.Church]: { code: "+",
    color: "#475569" },
  [MapCategory.Cemetery]: { code: "G",
    color: "#57534e" },
  [MapCategory.Subway]: { code: "U",
    color: "#1e40af" },
  [MapCategory.SuburbanRail]: { code: "S",
    color: "#166534" },
  [MapCategory.Tram]: { code: "T",
    color: "#991b1b" },
  [MapCategory.Bus]: { code: "B",
    color: "#115e59" },
};

function place(
  id: string,
  title: string,
  category: MapCategory,
  position: MapPosition,
  detail: string,
  source: string,
  date?: string,
  endDate?: string,
): MapPlace {
  return { id: toMapPlaceId(id),
    title,
    category,
    position,
    detail,
    source,
    date,
    endDate };
}

// Locations are approximate venue or station positions. Organizer pages carry the schedules.
export const munichPlaces: readonly MapPlace[] = [
  place("riem", "Flohmarkt Riem", MapCategory.FleaMarket, toMapPosition(48.1398, 11.7142), "Open-air flea market at the Messe Riem grounds.", "https://www.flohmarkt-riem.com/", "2026-11-21"),
  place("olympiapark-flohmarkt", "Flohmarkt im Olympiapark", MapCategory.FleaMarket, toMapPosition(48.1739, 11.5349), "Flea market on the Parkharfe.", "https://www.olympiapark.de/"),
  place("messe", "Messe München", MapCategory.Event, toMapPosition(48.1357, 11.6958), "Trade fairs and exhibitions in Riem.", "https://messe-muenchen.de/"),
  place("deutsches-museum", "Deutsches Museum", MapCategory.Event, toMapPosition(48.1299, 11.5832), "Exhibitions and public programs on Museumsinsel.", "https://www.deutsches-museum.de/"),
  place("sommertollwood", "Tollwood Sommerfestival", MapCategory.Festival, toMapPosition(48.1686, 11.5417), "Summer festival in the southern Olympiapark.", "https://www.tollwood.de/"),
  place("isarphilharmonie", "Isarphilharmonie", MapCategory.Concert, toMapPosition(48.1140, 11.5483), "Concert hall at Gasteig HP8.", "https://www.gasteig.de/"),
  place("olympiahalle", "Olympiahalle", MapCategory.Concert, toMapPosition(48.1743, 11.5500), "Concert and event venue in Olympiapark.", "https://www.olympiapark.de/"),
  place("english-garden", "Chinesischer Turm", MapCategory.Landmark, toMapPosition(48.1522, 11.5928), "Landmark in the Englischer Garten.", "https://www.schloesser.bayern.de/"),
  place("nymphenburg", "Schloss Nymphenburg", MapCategory.Landmark, toMapPosition(48.1582, 11.5033), "Palace and gardens in western Munich.", "https://www.schloss-nymphenburg.de/"),
  place("odeonsplatz", "Odeonsplatz", MapCategory.Landmark, toMapPosition(48.1427, 11.5771), "Historic square by the Feldherrnhalle.", "https://www.muenchen.de/"),
];
