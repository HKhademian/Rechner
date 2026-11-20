import {
  type MapPlace,
  MapCategory,
  toMapCategory,
  toMapPlaceId,
  toMapPosition,
} from "./places.ts";
import landmarks from "./data/landmarks.json";
import transit from "./data/transit.json";

function landmarkPlaces(): MapPlace[] {
  return landmarks.places.map((entry) => ({
    id: toMapPlaceId(`osm-${entry.osmUrl.split("/").slice(-2).join("-")}`),
    title: entry.name,
    category: entry.kind === "church" ? MapCategory.Church : MapCategory.Cemetery,
    position: toMapPosition(entry.lat, entry.lon),
    detail: entry.kind === "church" ? "Church" : "Cemetery",
    source: entry.osmUrl,
    sourceLabel: "View on OpenStreetMap",
  }));
}

function transitPlaces(): MapPlace[] {
  return transit.places.map(([id, title, latitude, longitude, modes, lines]) => {
    if (typeof id !== "string" || typeof title !== "string" || typeof latitude !== "number"
      || typeof longitude !== "number" || !Array.isArray(modes) || typeof lines !== "string") {
      throw new TypeError("Invalid transit stop.");
    }
    const categories = modes.map(toMapCategory);
    return {
      id: toMapPlaceId(`mvv-${id}`),
      title,
      category: categories[0],
      modes: categories,
      position: toMapPosition(latitude, longitude),
      detail: lines ? `${modes.join(" · ")} · ${lines}` : modes.join(" · "),
      source: "https://www.mvv-muenchen.de/",
      sourceLabel: "MVV journey planner",
    };
  });
}

export const cityPlaces: readonly MapPlace[] = [...landmarkPlaces(), ...transitPlaces()];
