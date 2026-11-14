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
  isPlainPrimaryClick,
  navigateLawHistoryBack,
  navigateToRelatedLaw,
  openLawGroupReference,
  openLawReference,
  setLawSearchQuery,
  setLawTagFilter,
} from "#store/lawReferenceStore";
import {
  lawCatalogPath,
  lawDetailPath,
} from "#/apps/appDefinition.ts";

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

  it("distinguishes plain primary click (popup) from Ctrl/Cmd/middle click (full Law Page)", () => {
    assert.equal(
      isPlainPrimaryClick({ button: 0,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false }),
      true,
    );
    assert.equal(
      isPlainPrimaryClick({ button: 0,
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false }),
      false,
    );
    assert.equal(
      isPlainPrimaryClick({ button: 0,
        ctrlKey: false,
        metaKey: true,
        shiftKey: false,
        altKey: false }),
      false,
    );
    assert.equal(
      isPlainPrimaryClick({ button: 1,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false }),
      false,
    );
    assert.equal(lawCatalogPath(), "/laws/");
    assert.equal(lawDetailPath(LawId.BEEG_2b), "/laws/beeg-2b/");
    assert.equal(
      lawDetailPath(LawId.BEEG_2b, LawGroupId.BEEG_TaxSwap),
      "/laws/beeg-2b/?group=group-beeg-tax-swap",
    );
  });
});
