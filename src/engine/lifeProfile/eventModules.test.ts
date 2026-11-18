import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  createLifeEventRegistry,
  noteEventModule,
} from "#engine/lifeProfile/eventModules";
import {
  toLifeEventKind,
} from "#engine/lifeProfile/timeline";

it("registers independent event modules and rejects duplicate kinds", () => {
  const other = { kind: toLifeEventKind("example.move"),
    parsePayload: (value: unknown) => value };
  const registry = createLifeEventRegistry([noteEventModule, other]);
  assert.equal(registry.get(other.kind), other);
  assert.throws(() => createLifeEventRegistry([noteEventModule, noteEventModule]));
  assert.deepEqual(noteEventModule.parsePayload({ title: "Start course" }), { title: "Start course" });
  assert.throws(() => noteEventModule.parsePayload({ title: "" }));
  assert.throws(() => noteEventModule.parsePayload({ title: "A",
    extra: true }));
});
