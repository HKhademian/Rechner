import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  ExternalSourceId,
  LAW_RELATION_LABELS,
  LAW_TAG_LABELS,
  LawCode,
  LawGroupId,
  LawId,
  LawRelationType,
  LawTag,
  isLawGroupId,
  isLawId,
  toExternalSourceId,
  toLawCode,
  toLawGroupId,
  toLawId,
  toLawRelationType,
  toLawTag,
} from "#engine/laws/types";

describe("Law reference type system", () => {
  it("validates every LawId enum member and rejects unknown IDs", () => {
    for (const id of Object.values(LawId)) {
      assert.equal(toLawId(id), id);
      assert.equal(isLawId(id), true);
    }
    assert.equal(isLawId("unknown-law"), false);
    assert.throws(() => toLawId("unknown-law"), TypeError);
  });

  it("validates every LawGroupId enum member and rejects unknown group IDs", () => {
    for (const id of Object.values(LawGroupId)) {
      assert.equal(toLawGroupId(id), id);
      assert.equal(isLawGroupId(id), true);
    }
    assert.equal(isLawGroupId("group-unknown"), false);
    assert.throws(() => toLawGroupId("group-unknown"), TypeError);
  });

  it("validates LawCode, LawTag, LawRelationType, and ExternalSourceId enums", () => {
    for (const code of Object.values(LawCode)) {
      assert.equal(toLawCode(code), code);
    }
    for (const tag of Object.values(LawTag)) {
      assert.equal(toLawTag(tag), tag);
      assert.ok(LAW_TAG_LABELS[tag].length > 0);
    }
    for (const rel of Object.values(LawRelationType)) {
      assert.equal(toLawRelationType(rel), rel);
      assert.ok(LAW_RELATION_LABELS[rel].length > 0);
    }
    for (const sourceId of Object.values(ExternalSourceId)) {
      assert.equal(toExternalSourceId(sourceId), sourceId);
    }
    assert.throws(() => toLawCode("INVALID"), TypeError);
    assert.throws(() => toLawTag("invalid-tag"), TypeError);
    assert.throws(() => toLawRelationType("invalid-rel"), TypeError);
    assert.throws(() => toExternalSourceId("invalid-source"), TypeError);
  });
});
