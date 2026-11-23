import landmarks from "#/apps/munich-map/data/landmarks.json";

export const prerender = true;

export function GET(): Response {
  return Response.json(landmarks);
}
