import assert from "node:assert/strict";
import {
  it, 
} from "node:test";
import lawContent from "../../../.generated/laws.json" with { type: "json" };
import groupContent from "../../../.generated/law-groups.json" with { type: "json" };
import {
  spawnSync, 
} from "node:child_process";
import {
  LAW_GROUP_REGISTRY,
  LAW_REGISTRY,
} from "#engine/laws/registry";

it("loads every law and group without changing the authored content", () => {
  const result = spawnSync(process.execPath, ["src/cli/lawContent.ts", "--check"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(LAW_REGISTRY, lawContent);
  assert.deepEqual(LAW_GROUP_REGISTRY, groupContent);
});
