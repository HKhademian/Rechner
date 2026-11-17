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

it("preserves relationship intent, descriptions and display order", () => {
  const law = LAW_REGISTRY["beeg-2c"];
  assert.deepEqual(Object.keys(law.relatedLaws), ["beeg-2b", "beeg-2e", "estg-38b", "estg-26b"]);
  assert.equal(law.relatedLaws["beeg-2b"]?.relationType, "depends_on");
  assert.ok(law.relatedLaws["beeg-2b"]?.description);
});
