import {
  sitePath,
} from "#/apps/appDefinition.ts";
import {
  InformationalNoticeIcon,
} from "#components/Icons";
import {
  getTopic,
} from "#engine/topics/registry";
import {
  isPlainPrimaryClick,
  openLawReference,
} from "#store/lawReferenceStore";
import type {
  JSX,
} from "preact";

/** Opens the shared reference popup; the link also works without JavaScript. */
export function TopicHelp({ id }: { readonly id: string }): JSX.Element | null {
  const topic = getTopic(id);
  if (!topic) {
    return null;
  }
  const href = sitePath(`/topics/${topic.id}/`);
  return <a className="topic-help" href={href} title={`Explain ${topic.title}`} aria-label={`Explain ${topic.title}`}
    onClick={(event) => {
      if (!isPlainPrimaryClick(event)) {
        return;
      }
      event.preventDefault();
      openLawReference(topic.laws[0], undefined, {
        title: topic.title,
        description: `${topic.description} ${topic.benefit} ${topic.limitation}`,
        calculatorEffect: topic.calculatorEffect,
        topicId: topic.id,
      });
    }}><InformationalNoticeIcon size={16} /></a>;
}
