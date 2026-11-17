import assert from "node:assert/strict";
import {
  it, 
} from "node:test";
import {
  getRelatedTopics, 
} from "#engine/topics/navigation";
import {
  getTopic,
  topics,
} from "#engine/topics/registry";
import {
  topicPath, 
} from "#utils/topicPath";

it("places each subtopic under its parent and relates only parents or siblings", () => {
  for (const topic of topics) {
    const related = getRelatedTopics(topic);
    assert.ok(related.every((other) => other.id !== topic.id));
    if (topic.parentId) {
      assert.ok(topicPath(topic.id).endsWith(`/topics/${topic.parentId}/${topic.id}/`));
      assert.ok(related.some((other) => other.id === topic.parentId));
      assert.ok(related.every((other) => other.id === topic.parentId || other.parentId === topic.parentId));
    }
    else {
      assert.ok(topicPath(topic.id).endsWith(`/topics/${topic.id}/`));
      assert.ok(related.every((other) => !other.parentId));
    }
  }
  assert.ok(getRelatedTopics(getTopic("solar-vat")!).some((topic) => topic.id === "solar-yield"));
  assert.ok(!getRelatedTopics(getTopic("solar")!).some((topic) => topic.id === "solar-vat"));
});
