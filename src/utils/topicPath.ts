import {
  sitePath, 
} from "#/apps/appDefinition.ts";
import {
  getTopic, 
} from "#engine/topics/registry";

/** Build topic links from the registry so subtopics always sit below their parent. */
export function topicPath(id?: string): string {
  if (!id) {
    return sitePath("/topics/");
  }
  const topic = getTopic(id);
  return sitePath(topic?.parentId ? `/topics/${topic.parentId}/${id}/` : `/topics/${id}/`);
}
