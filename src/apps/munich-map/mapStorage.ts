import {
  type MapPlace,
  type MapPosition,
  type PersonalPin,
  toMapCategory,
  toMapPlaceId,
  toMapPosition,
  toPersonalPin,
} from "./places.ts";
import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  browserAppStorage,
} from "#engine/storage/appStorage";

export interface SavedPin {
  readonly position: MapPosition;
  readonly address: string;
}

export interface MapData {
  readonly pins: Partial<Record<PersonalPin, SavedPin>>;
  readonly places: readonly MapPlace[];
}

const storage = browserAppStorage(AppId.MunichMap);
const key = "places";
const emptyData: MapData = { pins: {},
  places: [] };

function savedDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().startsWith(value) ? value : undefined;
}

export function loadMapData(): MapData {
  const raw = storage.getItem(key);
  if (!raw) {
    return emptyData;
  }
  try {
    const decoded: unknown = JSON.parse(raw);
    if (!decoded || typeof decoded !== "object" || !("pins" in decoded) || !("places" in decoded)
      || !decoded.pins || typeof decoded.pins !== "object" || !Array.isArray(decoded.places)) {
      return emptyData;
    }
    const pins: MapData["pins"] = {};
    for (const [name, pin] of Object.entries(decoded.pins)) {
      pins[toPersonalPin(name)] = { position: toMapPosition(pin.position[0], pin.position[1]),
        address: typeof pin.address === "string" ? pin.address : "" };
    }
    const places: MapPlace[] = decoded.places.map((entry) => {
      if (typeof entry.title !== "string" || !entry.title.trim() || typeof entry.detail !== "string") {
        throw new TypeError("Invalid saved place.");
      }
      return {
        id: toMapPlaceId(entry.id),
        title: entry.title,
        category: toMapCategory(entry.category),
        position: toMapPosition(entry.position[0], entry.position[1]),
        detail: entry.detail,
        date: savedDate(entry.date),
      };
    });
    return { pins,
      places };
  }
  catch {
    return emptyData;
  }
}

export function saveMapData(data: MapData): boolean {
  return storage.setItem(key, JSON.stringify(data));
}
