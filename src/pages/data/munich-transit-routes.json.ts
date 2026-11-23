import routes from "#/apps/munich-map/data/transitRoutes.json";

export const prerender = true;

export function GET(): Response {
  return Response.json(routes);
}
