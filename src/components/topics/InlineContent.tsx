import type {
  JSX, 
} from "preact";
import LawRefLink from "#components/laws/LawRefLink";
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
    const resolved = resolveContentLink(part.target, topics);
    if (!resolved) {
      return part.text;
    }
    return resolved.lawId
      ? <LawRefLink key={index} lawId={resolved.lawId} variant="plain" showIcon={false} label={part.text} />
      : <a key={index} href={resolved.href}>{part.text}</a>;
  })}</>;
}
