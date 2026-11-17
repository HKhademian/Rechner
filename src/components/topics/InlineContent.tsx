import type {
  JSX, 
} from "preact";
import LawRefLink from "#components/laws/LawRefLink";
import {
  getLawGroupEntry, 
} from "#engine/laws/registry";
import {
  topicCategories, 
} from "#engine/topics/categories";
import {
  topics, 
} from "#engine/topics/registry";
import {
  parseContentLinks,
  resolveContentLink,
} from "#utils/contentLinks";

/** Render authored links as normal application links and law references. */
export function InlineContent({ text }: { readonly text: string }): JSX.Element {
  return <>{parseContentLinks(text).map((part, index) => {
    if (!part.target) {
      return part.text;
    }
    const resolved = resolveContentLink(part.target, topics, {
      categoryIds: topicCategories.map((category) => category.id),
      primaryLawForGroup: (id) => getLawGroupEntry(id)?.primaryLawId,
    });
    if (!resolved) {
      return part.text;
    }
    if (resolved.lawId) {
      return <LawRefLink key={index} lawId={resolved.lawId} variant="plain" showIcon={false} label={part.text} />;
    }
    if (resolved.groupId) {
      return <LawRefLink key={index} groupId={resolved.groupId} variant="plain" showIcon={false} label={part.text} />;
    }
    return <a key={index} href={resolved.href}>{part.text}</a>;
  })}</>;
}
