import assert from "node:assert/strict";
import {
  spawnSync, 
} from "node:child_process";
import {
  it, 
} from "node:test";

it("keeps the generated topic data in sync with Markdown", () => {
  const result = spawnSync(process.execPath, ["src/cli/topicContent.ts", "--check"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});
