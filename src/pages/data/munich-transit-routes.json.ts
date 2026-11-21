import routes from "#/apps/munich-map/data/transitRoutes.json";

export function GET(): Response {
  return Response.json(routes);
}
