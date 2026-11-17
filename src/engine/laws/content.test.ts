import assert from "node:assert/strict";
import {
  it, 
} from "node:test";
import lawContent from "#/content/laws/laws.json" with { type: "json" };
import groupContent from "#/content/laws/groups.json" with { type: "json" };
import {
  LAW_GROUP_REGISTRY,
  LAW_REGISTRY,
} from "#engine/laws/registry";

it("loads every law and group without changing the authored content", () => {
  assert.deepEqual(LAW_REGISTRY, lawContent);
  assert.deepEqual(LAW_GROUP_REGISTRY, groupContent);
});
