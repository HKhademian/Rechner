import {
  type Brand,
} from "#engine/types";

export const MapCategory = {
  FleaMarket: "Flea markets",
  Event: "Events",
  ChristmasMarket: "Christmas markets",
  Festival: "Fairs & festivals",
  Concert: "Concerts",
  Landmark: "Landmarks",
  Transit: "Public transit",
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

export type MapPlaceId = Brand<string, "MapPlaceId">;

export function toMapPlaceId(value: string): MapPlaceId {
  if (!/^[a-z0-9-]+$/.test(value)) {
    throw new TypeError("Invalid map place ID.");
  }
  return value as MapPlaceId;
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
}

export const MUNICH_CENTER = toMapPosition(48.1374, 11.5755);

export const categoryStyle: Record<MapCategory, { readonly code: string;
  readonly color: string }> = {
  [MapCategory.FleaMarket]: { code: "F",
    color: "var(--color-gain-hover)" },
  [MapCategory.Event]: { code: "E",
    color: "var(--color-primary-hover)" },
  [MapCategory.ChristmasMarket]: { code: "X",
    color: "var(--color-loss-hover)" },
  [MapCategory.Festival]: { code: "T",
    color: "#92400e" },
  [MapCategory.Concert]: { code: "C",
    color: "#6d28d9" },
  [MapCategory.Landmark]: { code: "L",
    color: "#334155" },
  [MapCategory.Transit]: { code: "U",
    color: "#0369a1" },
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
  place("christkindlmarkt", "Münchner Christkindlmarkt", MapCategory.ChristmasMarket, toMapPosition(48.1374, 11.5755), "Seasonal market around Marienplatz and the Neues Rathaus.", "https://www.christkindlmarkt-muenchen.de/", "2026-11-20", "2026-12-24"),
  place("wintertollwood", "Tollwood Winterfestival", MapCategory.Festival, toMapPosition(48.1342, 11.5496), "Winter festival at Theresienwiese.", "https://www.tollwood.de/", "2026-11-24", "2026-12-23"),
  place("sommertollwood", "Tollwood Sommerfestival", MapCategory.Festival, toMapPosition(48.1686, 11.5417), "Summer festival in the southern Olympiapark.", "https://www.tollwood.de/"),
  place("isarphilharmonie", "Isarphilharmonie", MapCategory.Concert, toMapPosition(48.1140, 11.5483), "Concert hall at Gasteig HP8.", "https://www.gasteig.de/"),
  place("olympiahalle", "Olympiahalle", MapCategory.Concert, toMapPosition(48.1743, 11.5500), "Concert and event venue in Olympiapark.", "https://www.olympiapark.de/"),
  place("english-garden", "Chinesischer Turm", MapCategory.Landmark, toMapPosition(48.1522, 11.5928), "Landmark in the Englischer Garten.", "https://www.schloesser.bayern.de/"),
  place("nymphenburg", "Schloss Nymphenburg", MapCategory.Landmark, toMapPosition(48.1582, 11.5033), "Palace and gardens in western Munich.", "https://www.schloss-nymphenburg.de/"),
  place("odeonsplatz", "Odeonsplatz", MapCategory.Landmark, toMapPosition(48.1427, 11.5771), "Historic square by the Feldherrnhalle.", "https://www.muenchen.de/"),
  place("hauptbahnhof", "München Hauptbahnhof", MapCategory.Transit, toMapPosition(48.1403, 11.5586), "Rail, S-Bahn, U-Bahn, tram and bus connections.", "https://www.mvv-muenchen.de/"),
  place("sendlinger-tor", "Sendlinger Tor", MapCategory.Transit, toMapPosition(48.1338, 11.5667), "U-Bahn, tram and bus connections.", "https://www.mvv-muenchen.de/"),
  place("ostbahnhof", "München Ostbahnhof", MapCategory.Transit, toMapPosition(48.1277, 11.6048), "Rail, S-Bahn, U-Bahn, tram and bus connections.", "https://www.mvv-muenchen.de/"),
  place("olympiazentrum", "Olympiazentrum", MapCategory.Transit, toMapPosition(48.1791, 11.5557), "U-Bahn and bus connections.", "https://www.mvv-muenchen.de/"),
  place("messestadt-west", "Messestadt West", MapCategory.Transit, toMapPosition(48.1333, 11.6925), "U-Bahn and bus connections near Messe München.", "https://www.mvv-muenchen.de/"),
];
