import topicContent from "#/content/topics/topics.json" with { type: "json" };
import {
  type AppId,
  toAppId,
} from "#/apps/appDefinition.ts";
import {
  type LawId,
  isLawId,
} from "#engine/laws/types";

/** A practical explanation linked to its underlying legal references and calculators. */
export interface Topic {
  readonly id: string;
  readonly title: string;
  readonly parentId?: string;
  readonly description: string;
  readonly benefit: string;
  readonly limitation: string;
  readonly calculatorEffect: string;
  readonly laws: readonly LawId[];
  readonly apps: readonly AppId[];
  readonly source?: { readonly label: string;
    readonly url: string };
}

/** Validate the content boundary before exposing typed topic references. */
function readTopic(input: (typeof topicContent)[number]): Topic {
  const laws = input.laws.map((id) => {
    if (!isLawId(id)) {
      throw new TypeError(`Unknown law ${id} in topic ${input.id}`);
    }
    return id;
  });
  return { ...input,
    laws,
    apps: input.apps.map(toAppId) };
}

export const topics: readonly Topic[] = topicContent.map(readTopic);

export function getTopic(id: string): Topic | undefined {
  return topics.find((topic) => topic.id === id);
}

/** Subtopics have their own pages but stay grouped under a single directory entry. */
export function getSubtopics(parentId: string): readonly Topic[] {
  return topics.filter((topic) => topic.parentId === parentId);
}

export function searchTopics(query: string): readonly Topic[] {
  const search = query.trim().toLowerCase();
  const matches = (topic: Topic): boolean => `${topic.title} ${topic.description}`.toLowerCase().includes(search);
  return topics.filter((topic) => !topic.parentId && (matches(topic) || getSubtopics(topic.id).some(matches)));
}

export function topicsForLaw(lawId: LawId): readonly Topic[] {
  return topics.filter((topic) => topic.laws.includes(lawId));
}
