import {
  topicCategories,
} from "#engine/topics/categories";
import {
  type Topic,
  getSubtopics,
  getTopic,
} from "#engine/topics/registry";

/** Related pages share a parent, or are the parent itself. Children are subtopics. */
export function getRelatedTopics(topic: Topic): readonly Topic[] {
  const authored = (topic.relatedTopics ?? []).flatMap((id) => {
    const related = getTopic(id);
    return related ? [related] : [];
  });
  if (topic.parentId) {
    const parent = getTopic(topic.parentId);
    return [...authored, ...(parent && !authored.includes(parent) ? [parent] : []), ...getSubtopics(topic.parentId).filter((sibling) => sibling.id !== topic.id && !authored.includes(sibling))];
  }
  const category = topicCategories.find((item) => item.topicIds.some((id) => id === topic.id));
  const siblings = category ? category.topicIds.flatMap((id) => {
    const sibling = getTopic(id);
    return sibling && sibling.id !== topic.id && !authored.includes(sibling) ? [sibling] : [];
  }) : [];
  return [...authored, ...siblings];
}
