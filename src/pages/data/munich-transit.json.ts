import transit from "#/apps/munich-map/data/transit.json";

export const prerender = true;

export function GET(): Response {
  return Response.json(transit);
}
