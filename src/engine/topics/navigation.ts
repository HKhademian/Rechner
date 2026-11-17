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
  if (topic.parentId) {
    const parent = getTopic(topic.parentId);
    return [...(parent ? [parent] : []), ...getSubtopics(topic.parentId).filter((sibling) => sibling.id !== topic.id)];
  }
  const category = topicCategories.find((item) => item.topicIds.some((id) => id === topic.id));
  return category ? category.topicIds.flatMap((id) => {
    const sibling = getTopic(id);
    return sibling && sibling.id !== topic.id ? [sibling] : [];
  }) : [];
}
