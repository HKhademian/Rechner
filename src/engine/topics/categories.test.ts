import assert from "node:assert/strict";
import {
  it, 
} from "node:test";
import {
  topicCategories, 
} from "#engine/topics/categories";
import {
  getTopic,
  topics,
} from "#engine/topics/registry";

it("places every topic overview in exactly one category", () => {
  const ids = topicCategories.flatMap((category) => [...category.topicIds]);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) {
    assert.ok(getTopic(id), `Missing topic ${id}`);
    assert.equal(getTopic(id)?.parentId, undefined);
  }
  assert.deepEqual([...ids].sort(), topics.filter((topic) => !topic.parentId).map((topic) => topic.id).sort());
  assert.equal(new Set(topicCategories.map((category) => category.id)).size, topicCategories.length);
});
