import lawContent from "../../../.generated/laws.json" with { type: "json" };
import groupContent from "../../../.generated/law-groups.json" with { type: "json" };
import {
  toSourceUrl, 
} from "#engine/config/benefitRules";
import {
  type ExternalSourceId as ExternalSourceIdType,
  type LawEntry,
  type LawGroupEntry,
  type LawRelationMetadata,
  type LawTag as LawTagType,
  LawGroupId,
  LawId,
  LawTag,
  toExternalSourceId,
  toLawCode,
  toLawGroupId,
  toLawId,
  toLawRelationType,
  toLawTag,
} from "#engine/laws/types";
import {
  toStatutoryCitation, 
} from "#engine/types";

type RawLaw = Omit<LawEntry, "id" | "citation" | "code" | "tags" | "groupId" | "relatedLaws" | "externalSources"> & {
  readonly id: string;
  readonly citation: string;
  readonly code: string;
  readonly tags: readonly string[];
  readonly groupId?: string;
  readonly relatedLaws: Readonly<Record<string, { readonly relationType?: string;
    readonly description?: string }>>;
  readonly externalSources: Readonly<Record<string, { readonly url: string;
    readonly label: string;
    readonly description?: string }>>;
};
type RawGroup = Omit<LawGroupEntry, "id" | "tags" | "primaryLawId" | "memberLawIds"> & {
  readonly id: string;
  readonly tags: readonly string[];
  readonly primaryLawId: string;
  readonly memberLawIds: readonly string[];
};

/** Convert editable content to the same validated, immutable domain records. */
function readLaw(raw: RawLaw): LawEntry {
  const relatedLaws = Object.fromEntries(Object.entries(raw.relatedLaws).map(([id, metadata]) => {
    const { relationType, ...rest } = metadata;
    return [toLawId(id), { ...rest,
      ...(relationType ? { relationType: toLawRelationType(relationType) } : {}) }];
  }));
  const externalSources = Object.fromEntries(Object.entries(raw.externalSources).map(([id, source]) => [toExternalSourceId(id), {
    ...source,
    url: toSourceUrl(source.url),
  }]));
  const { groupId, ...rest } = raw;
  return Object.freeze({ ...rest,
    id: toLawId(raw.id),
    citation: toStatutoryCitation(raw.citation),
    code: toLawCode(raw.code),
    tags: Object.freeze(raw.tags.map(toLawTag)),
    ...(groupId ? { groupId: toLawGroupId(groupId) } : {}),
    relatedLaws: Object.freeze(relatedLaws),
    externalSources: Object.freeze(externalSources)});
}

function readGroup(raw: RawGroup): LawGroupEntry {
  return Object.freeze({ ...raw,
    id: toLawGroupId(raw.id),
    tags: Object.freeze(raw.tags.map(toLawTag)),
    primaryLawId: toLawId(raw.primaryLawId),
    memberLawIds: Object.freeze(raw.memberLawIds.map(toLawId))});
}

const laws = Object.entries(lawContent).map(([key, raw]) => {
  const entry = readLaw(raw);
  if (entry.id !== toLawId(key)) {
    throw new TypeError(`Mismatched law key: ${key}`);
  }
  return [entry.id, entry] as const;
});
const groups = Object.entries(groupContent).map(([key, raw]) => {
  const entry = readGroup(raw);
  if (entry.id !== toLawGroupId(key)) {
    throw new TypeError(`Mismatched law group key: ${key}`);
  }
  return [entry.id, entry] as const;
});
if (laws.length !== Object.values(LawId).length || groups.length !== Object.values(LawGroupId).length) {
  throw new TypeError("Incomplete law reference content");
}
export const LAW_REGISTRY: Readonly<Record<LawId, LawEntry>> = Object.freeze(Object.fromEntries(laws)) as Readonly<Record<LawId, LawEntry>>;
export const LAW_GROUP_REGISTRY: Readonly<Record<LawGroupId, LawGroupEntry>> = Object.freeze(Object.fromEntries(groups)) as Readonly<Record<LawGroupId, LawGroupEntry>>;

/**
 * Resolved cross-reference link for UI display and graph traversal.
 */
export interface RelatedLawItem {
  readonly law: LawEntry;
  readonly metadata: LawRelationMetadata;
}

/** Looks up a strongly-typed `LawEntry` by `LawId`. */
export function getLawEntry(id: LawId): LawEntry {
  return LAW_REGISTRY[id];
}

/** Looks up a strongly-typed `LawGroupEntry` by `LawGroupId`. */
export function getLawGroupEntry(id: LawGroupId): LawGroupEntry {
  return LAW_GROUP_REGISTRY[id];
}

/** Returns all registered law entries in deterministic order. */
export function getAllLawEntries(): readonly LawEntry[] {
  return Object.values(LAW_REGISTRY);
}

/** Returns all registered law groups in deterministic order. */
export function getAllLawGroupEntries(): readonly LawGroupEntry[] {
  return Object.values(LAW_GROUP_REGISTRY);
}

/** Returns all laws tagged with the given `LawTag`. */
export function getLawsByTag(tag: LawTagType): readonly LawEntry[] {
  return getAllLawEntries().filter((entry) => entry.tags.includes(tag));
}

/** Returns all outgoing cross-referenced laws for `id` with their relation metadata. */
export function getRelatedLaws(id: LawId): readonly RelatedLawItem[] {
  const entry = getLawEntry(id);
  const items: RelatedLawItem[] = [];
  for (const [targetId, metadata] of Object.entries(entry.relatedLaws)) {
    if (metadata) {
      items.push({
        law: getLawEntry(targetId as LawId),
        metadata,
      });
    }
  }
  return items;
}

/** Returns all laws that explicitly reference `id` in their `relatedLaws` map. */
export function getLawsReferencing(id: LawId): readonly RelatedLawItem[] {
  const items: RelatedLawItem[] = [];
  for (const entry of getAllLawEntries()) {
    const metadata = entry.relatedLaws[id];
    if (metadata) {
      items.push({
        law: entry,
        metadata,
      });
    }
  }
  return items;
}

/** Returns all distinct tags actively used across registered laws, preserving enum order. */
export function getUsedLawTags(): readonly LawTagType[] {
  const used = new Set<LawTagType>();
  for (const entry of getAllLawEntries()) {
    for (const tag of entry.tags) {
      used.add(tag);
    }
  }
  return Object.values(LawTag).filter((tag) => used.has(tag));
}

/** Filters laws by optional search text (matching citation, title, summary) and optional `LawTag`. */
export function searchLaws(
  query: string,
  tag?: LawTagType,
): readonly LawEntry[] {
  const normalized = query.trim().toLowerCase();
  return getAllLawEntries().filter((entry) => {
    if (tag && !entry.tags.includes(tag)) {
      return false;
    }
    if (!normalized) {
      return true;
    }
    return (
      entry.citation.toLowerCase().includes(normalized) ||
      entry.title.toLowerCase().includes(normalized) ||
      entry.summary.toLowerCase().includes(normalized) ||
      entry.code.toLowerCase().includes(normalized)
    );
  });
}

/** Returns all external sources of a `LawEntry` as deterministic tuples. */
export function getExternalSourceEntries(
  entry: LawEntry,
): readonly {
  readonly sourceId: ExternalSourceIdType;
  readonly url: string;
  readonly label: string;
  readonly description?: string;
}[] {
  const items: {
    readonly sourceId: ExternalSourceIdType;
    readonly url: string;
    readonly label: string;
    readonly description?: string;
  }[] = [];
  for (const [sourceId, meta] of Object.entries(entry.externalSources)) {
    if (meta) {
      items.push({
        sourceId: sourceId as ExternalSourceIdType,
        url: meta.url,
        label: meta.label,
        description: meta.description,
      });
    }
  }
  return items;
}
