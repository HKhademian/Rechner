import {
  type MapPosition,
  railLayers,
  toMapPosition,
} from "./places.ts";
import data from "./data/transitRoutes.json";

interface TransitRoute {
  readonly category: (typeof railLayers)[number];
  readonly lines: readonly string[];
  readonly paths: readonly (readonly MapPosition[])[];
}

export const transitRoutes: readonly TransitRoute[] = data.routes.map(({ category, lines, paths }) => {
  const mode = railLayers.find((layer) => layer === category);
  if (!mode) {
    throw new TypeError(`Invalid transit route category: ${category}`);
  }
  return {
    category: mode,
    lines,
    paths: paths.map((points) => points.map(([latitude, longitude]) => toMapPosition(latitude, longitude))),
  };
});
