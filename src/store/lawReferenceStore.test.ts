import assert from "node:assert/strict";
import {
  beforeEach,
  describe,
  it,
} from "node:test";
import {
  LawGroupId,
  LawId,
  LawTag,
} from "#engine/laws/types";
import {
  activeLawModalState,
  activeLawSearchQuery,
  activeLawTagFilter,
  closeLawReference,
  navigateLawHistoryBack,
  navigateToRelatedLaw,
  openLawGroupReference,
  openLawReference,
  setLawSearchQuery,
  setLawTagFilter,
} from "#store/lawReferenceStore";

describe("lawReferenceStore navigation & history", () => {
  beforeEach(() => {
    closeLawReference();
  });

  it("opens a typed LawId, pushes cross-reference history, and navigates back", () => {
    assert.equal(activeLawModalState.peek(), null);
    openLawReference(LawId.BEEG_2b);
    assert.equal(activeLawModalState.peek()?.currentLawId, LawId.BEEG_2b);
    assert.equal(activeLawModalState.peek()?.activeGroupId, LawGroupId.BEEG_TaxSwap);
    assert.deepEqual(activeLawModalState.peek()?.history, []);

    navigateToRelatedLaw(LawId.BEEG_2c);
    assert.equal(activeLawModalState.peek()?.currentLawId, LawId.BEEG_2c);
    assert.deepEqual(activeLawModalState.peek()?.history, [LawId.BEEG_2b]);

    navigateToRelatedLaw(LawId.EStG_38b);
    assert.equal(activeLawModalState.peek()?.currentLawId, LawId.EStG_38b);
    assert.deepEqual(activeLawModalState.peek()?.history, [LawId.BEEG_2b, LawId.BEEG_2c]);

    // Navigating to the already-active law is a no-op
    navigateToRelatedLaw(LawId.EStG_38b);
    assert.deepEqual(activeLawModalState.peek()?.history, [LawId.BEEG_2b, LawId.BEEG_2c]);

    navigateLawHistoryBack();
    assert.equal(activeLawModalState.peek()?.currentLawId, LawId.BEEG_2c);
    assert.deepEqual(activeLawModalState.peek()?.history, [LawId.BEEG_2b]);

    navigateLawHistoryBack();
    assert.equal(activeLawModalState.peek()?.currentLawId, LawId.BEEG_2b);
    assert.deepEqual(activeLawModalState.peek()?.history, []);
  });

  it("opens thematic LawGroupId and resets filter state on close", () => {
    openLawGroupReference(LawGroupId.BEEG_SiblingBonus);
    assert.equal(activeLawModalState.value?.currentLawId, LawId.BEEG_2a);
    assert.equal(activeLawModalState.value?.activeGroupId, LawGroupId.BEEG_SiblingBonus);

    setLawTagFilter(LawTag.Child);
    setLawSearchQuery("Kindergeld");
    assert.equal(activeLawTagFilter.value, LawTag.Child);
    assert.equal(activeLawSearchQuery.value, "Kindergeld");

    closeLawReference();
    assert.equal(activeLawModalState.value, null);
    assert.equal(activeLawTagFilter.value, undefined);
    assert.equal(activeLawSearchQuery.value, "");
  });
});
