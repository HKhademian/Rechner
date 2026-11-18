import {
  type LifeEvent,
  type LifeEventKind,
  toLifeEventKind,
} from "#engine/lifeProfile/timeline";

export interface LifeEventModule<Payload> {
  readonly kind: LifeEventKind;
  readonly parsePayload: (value: unknown) => Payload;
  readonly validateTimeline?: (events: readonly LifeEvent<unknown>[]) => boolean;
}

/** Modules validate their own information; the timeline does not interpret it. */
export function createLifeEventRegistry(modules: readonly LifeEventModule<unknown>[]): ReadonlyMap<LifeEventKind, LifeEventModule<unknown>> {
  const registry = new Map<LifeEventKind, LifeEventModule<unknown>>();
  for (const module of modules) {
    if (registry.has(module.kind)) {
      throw new TypeError(`Duplicate life event kind: ${module.kind}`);
    }
    registry.set(module.kind, module);
  }
  return registry;
}

export interface NoteEventPayload {
  readonly title: string;
}

export const noteEventModule: LifeEventModule<NoteEventPayload> = Object.freeze({
  kind: toLifeEventKind("note"),
  parsePayload(value: unknown): NoteEventPayload {
    if (typeof value !== "object" || value === null || Array.isArray(value)
      || Object.keys(value).some((key) => key !== "title")
      || !("title" in value) || typeof value.title !== "string" || !value.title.trim()) {
      throw new TypeError("A timeline note needs a title.");
    }
    return Object.freeze({ title: value.title });
  },
});
