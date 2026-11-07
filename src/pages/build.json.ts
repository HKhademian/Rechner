import {
  buildInfo,
} from "#/data/buildInfo";

export const prerender = true;

export function GET(): Response {
  return new Response(`${JSON.stringify(buildInfo)}\n`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
