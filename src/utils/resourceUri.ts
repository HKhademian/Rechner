/** Internal resource identifiers in authored metadata and inline links. */
export const ResourceKind = {
  App: "app",
  Category: "category",
  Group: "group",
  Law: "law",
  Topic: "topic",
} as const;
export type ResourceKind = (typeof ResourceKind)[keyof typeof ResourceKind];

export function resourceId(uri: unknown, kind: ResourceKind): string {
  if (typeof uri !== "string") {
    throw new TypeError(`Expected a ${kind} resource URI`);
  }
  const match = /^rechner:\/\/([a-z]+)\/([a-z0-9-]+)$/.exec(uri);
  if (!match || match[1] !== kind) {
    throw new TypeError(`Invalid ${kind} resource URI: ${uri}`);
  }
  return match[2];
}
