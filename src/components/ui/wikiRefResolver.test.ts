import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  FormulaId,
} from "#engine/formulas/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  toFullCalendarYear,
} from "#engine/types";
import {
  WikiPeekHorizontalAlign,
  WikiPeekVerticalAlign,
  WikiRefKind,
  computeWikiPeekPlacement,
  resolveWikiRef,
  toWikiRefKind,
} from "#/components/ui/wikiRefResolver.ts";

describe("wikiRefResolver", () => {
  it("validates WikiRefKind strictly", () => {
    assert.equal(toWikiRefKind("law"), WikiRefKind.Law);
    assert.equal(toWikiRefKind("topic"), WikiRefKind.Topic);
    assert.equal(toWikiRefKind("parameter"), WikiRefKind.Parameter);
    assert.equal(toWikiRefKind("formula"), WikiRefKind.Formula);
    assert.throws(() => toWikiRefKind("unknown"), TypeError);
  });

  it("resolves Law, Topic, Parameter, and Formula targets with cross-links", () => {
    const year = toFullCalendarYear(2026);

    const law = resolveWikiRef({
      kind: WikiRefKind.Law,
      id: LawId.BEEG_2b,
    }, year);
    assert.ok(law);
    assert.equal(law.kind, WikiRefKind.Law);
    assert.ok(law.title.includes("BEEG"));
    assert.ok(law.related.length > 0);

    const topic = resolveWikiRef({
      kind: WikiRefKind.Topic,
      id: "parental-allowance",
    }, year);
    assert.ok(topic);
    assert.equal(topic.kind, WikiRefKind.Topic);
    assert.ok(topic.related.some((item) => item.target.kind === WikiRefKind.Law));

    const param = resolveWikiRef(
      {
        kind: WikiRefKind.Parameter,
        id: ParameterId.Benefit_BasisMaximum,
      },
      year,
    );
    assert.ok(param);
    assert.equal(param.kind, WikiRefKind.Parameter);
    assert.ok(param.valueLine?.includes("statutory value"));

    const overriddenParam = resolveWikiRef(
      {
        kind: WikiRefKind.Parameter,
        id: ParameterId.Planning_AnnualInflationRate,
      },
      year,
      { [ParameterId.Planning_AnnualInflationRate]: 0.03 },
    );
    assert.ok(overriddenParam);
    assert.ok(overriddenParam.valueLine?.includes("custom"));

    const formula = resolveWikiRef({
      kind: WikiRefKind.Formula,
      id: FormulaId.ParentalAllowanceEntitlement,
    }, year);
    assert.ok(formula);
    assert.equal(formula.kind, WikiRefKind.Formula);
    assert.ok(formula.related.length > 0);
  });

  it("flips popover alignment away from viewport edges to prevent horizontal overflow", () => {
    // Trigger near right edge (like card 3 in diagnostics strip) flips to End
    const rightEdge = computeWikiPeekPlacement({
      triggerLeft: 1080,
      triggerRight: 1220,
      triggerTop: 220,
      triggerBottom: 240,
      viewportWidth: 1280,
      viewportHeight: 800,
    });
    assert.equal(rightEdge.horizontal, WikiPeekHorizontalAlign.End);
    assert.equal(rightEdge.vertical, WikiPeekVerticalAlign.Below);

    // Trigger near left edge stays Start
    const leftEdge = computeWikiPeekPlacement({
      triggerLeft: 48,
      triggerRight: 180,
      triggerTop: 220,
      triggerBottom: 240,
      viewportWidth: 1280,
      viewportHeight: 800,
    });
    assert.equal(leftEdge.horizontal, WikiPeekHorizontalAlign.Start);

    // Trigger near bottom fold flips Above
    const bottomEdge = computeWikiPeekPlacement({
      triggerLeft: 120,
      triggerRight: 260,
      triggerTop: 680,
      triggerBottom: 700,
      viewportWidth: 1280,
      viewportHeight: 760,
    });
    assert.equal(bottomEdge.vertical, WikiPeekVerticalAlign.Above);

    // Narrow mobile viewport docks cleanly inside viewport
    const mobile = computeWikiPeekPlacement({
      triggerLeft: 200,
      triggerRight: 340,
      triggerTop: 200,
      triggerBottom: 220,
      viewportWidth: 420,
      viewportHeight: 800,
    });
    assert.equal(mobile.horizontal, WikiPeekHorizontalAlign.ViewportDock);
  });
});
