import landmarks from "#/apps/munich-map/data/landmarks.json";

export function GET(): Response {
  return Response.json(landmarks);
}
