import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  LAW_GROUP_REGISTRY,
  LAW_REGISTRY,
  getAllLawEntries,
  getAllLawGroupEntries,
  getExternalSourceEntries,
  getLawEntry,
  getLawGroupEntry,
  getLawsByTag,
  getLawsReferencing,
  getRelatedLaws,
  getUsedLawTags,
  searchLaws,
} from "#engine/laws/registry";
import {
  LawGroupId,
  LawId,
  LawTag,
  isLawGroupId,
  isLawId,
} from "#engine/laws/types";

describe("Central Law Reference Registry & Graph", () => {
  it("registers a frozen entry for every LawId with non-empty citation, title, summary, tags, and external sources", () => {
    const allIds = Object.values(LawId);
    assert.equal(getAllLawEntries().length, allIds.length);
    for (const id of allIds) {
      const entry = getLawEntry(id);
      assert.equal(entry.id, id);
      assert.equal(Object.isFrozen(entry), true);
      assert.ok(entry.citation.length > 0, `${id} missing citation`);
      assert.ok(entry.title.length > 0, `${id} missing title`);
      assert.ok(entry.summary.length > 0, `${id} missing summary`);
      assert.ok(entry.tags.length > 0, `${id} missing tags`);
      assert.ok(getExternalSourceEntries(entry).length > 0, `${id} missing external sources`);
    }
  });

  it("contains zero dangling cross-references and no self-references", () => {
    for (const entry of getAllLawEntries()) {
      for (const targetKey of Object.keys(entry.relatedLaws)) {
        assert.equal(isLawId(targetKey), true, `${entry.id} references unknown law ${targetKey}`);
        assert.notEqual(targetKey, entry.id, `${entry.id} self-references`);
      }
      if (entry.groupId !== undefined) {
        assert.equal(isLawGroupId(entry.groupId), true, `${entry.id} references unknown group ${entry.groupId}`);
      }
    }
  });

  it("validates every LawGroupEntry has valid primary and member LawIds", () => {
    const allGroups = Object.values(LawGroupId);
    assert.equal(getAllLawGroupEntries().length, allGroups.length);
    for (const groupId of allGroups) {
      const group = getLawGroupEntry(groupId);
      assert.equal(Object.isFrozen(group), true);
      assert.equal(isLawId(group.primaryLawId), true);
      assert.ok(group.memberLawIds.includes(group.primaryLawId));
      for (const memberId of group.memberLawIds) {
        assert.equal(isLawId(memberId), true);
      }
    }
  });

  it("supports outgoing and incoming graph traversal, tag filtering, and search", () => {
    const relatedTo2c = getRelatedLaws(LawId.BEEG_2c);
    assert.ok(relatedTo2c.some((item) => item.law.id === LawId.BEEG_2b));
    assert.ok(relatedTo2c.some((item) => item.law.id === LawId.EStG_38b));

    const referencing2b = getLawsReferencing(LawId.BEEG_2b);
    assert.ok(referencing2b.some((item) => item.law.id === LawId.BEEG_2));
    assert.ok(referencing2b.some((item) => item.law.id === LawId.BEEG_2c));

    const childLaws = getLawsByTag(LawTag.Child);
    assert.ok(childLaws.some((law) => law.id === LawId.EStG_66));
    assert.ok(childLaws.some((law) => law.id === LawId.BEEG_2a));

    assert.ok(getUsedLawTags().includes(LawTag.Child));
    assert.ok(getUsedLawTags().includes(LawTag.Tax));

    const splittingMatches = searchLaws("Splitting");
    assert.ok(splittingMatches.some((law) => law.id === LawId.EStG_32a));

    const filteredChildSearch = searchLaws("Kindergeld", LawTag.Child);
    assert.ok(filteredChildSearch.some((law) => law.id === LawId.EStG_66));
    assert.equal(searchLaws("Kindergeld", LawTag.Solar).length, 0);

    assert.equal(Object.isFrozen(LAW_REGISTRY), true);
    assert.equal(Object.isFrozen(LAW_GROUP_REGISTRY), true);
  });
});
