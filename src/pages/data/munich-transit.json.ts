import transit from "#/apps/munich-map/data/transit.json";

export function GET(): Response {
  return Response.json(transit);
}
