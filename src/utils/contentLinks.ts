import {
  AppId,
  calculatorPath,
  lawDetailPath,
  sitePath,
  toAppId,
} from "#/apps/appDefinition.ts";
import {
  type LawGroupId,
  type LawId,
  isLawGroupId,
  isLawId,
} from "#engine/laws/types";

export interface ContentPart {
  readonly text: string;
  readonly target?: string;
}

export interface ContentTopic {
  readonly id: string;
  readonly parentId?: string;
}

export interface ContentResources {
  readonly categoryIds: readonly string[];
  readonly primaryLawForGroup: (id: LawGroupId) => LawId | undefined;
}

/** Recognize inline Markdown links without interpreting or injecting HTML. */
export function parseContentLinks(text: string): readonly ContentPart[] {
  const parts: ContentPart[] = [];
  const expression = /\[([^\]\n]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g;
  let offset = 0;
  for (const match of text.matchAll(expression)) {
    const index = match.index;
    if (index > offset) {
      parts.push({ text: text.slice(offset, index) });
    }
    parts.push({ text: match[1],
      target: match[2] });
    offset = index + match[0].length;
  }
  if (offset < text.length) {
    parts.push({ text: text.slice(offset) });
  }
  return parts;
}

export function plainContentText(text: string): string {
  return parseContentLinks(text).map((part) => part.text).join("");
}

/** Resolve internal IDs to actual base-aware routes, rejecting unknown targets. */
export function resolveContentLink(target: string, topics: readonly ContentTopic[], resources?: ContentResources): { readonly href: string;
  readonly lawId?: LawId;
  readonly groupId?: LawGroupId } | undefined {
  const internal = /^rechner:\/\/(app|law|topic|category|group)\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/.exec(target);
  if (internal) {
    const [, kind, id, subId] = internal;
    if (kind === "app") {
      try {
        const app = toAppId(id);
        const href = app === AppId.Catalog ? sitePath("/") : calculatorPath(app);
        return { href: subId ? `${href}#${subId}` : href };
      }
      catch {
        return undefined;
      }
    }
    if (kind === "law") {
      if (!isLawId(id)) {
        return undefined;
      }
      const href = lawDetailPath(id);
      return subId ? { href: `${href}#${subId}` } : { href,
        lawId: id };
    }
    if (kind === "category") {
      return !subId && resources?.categoryIds.includes(id) ? { href: `${sitePath("/topics/")}#${id}` } : undefined;
    }
    if (kind === "group") {
      if (subId || !isLawGroupId(id)) {
        return undefined;
      }
      const primaryLaw = resources?.primaryLawForGroup(id);
      return primaryLaw ? { href: lawDetailPath(primaryLaw, id),
        groupId: id } : undefined;
    }
    const topic = topics.find((item) => item.id === (subId ?? id));
    if (!topic || (subId && topic.parentId !== id)) {
      return undefined;
    }
    return { href: sitePath(topic.parentId ? `/topics/${topic.parentId}/${topic.id}/` : `/topics/${topic.id}/`) };
  }
  try {
    const url = new URL(target);
    return url.protocol === "https:" || url.protocol === "http:" ? { href: target } : undefined;
  }
  catch {
    return undefined;
  }
}
