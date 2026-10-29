import {
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_BENEFIT_RULES,
  createBenefitRules,
  toSourceUrl,
} from "#engine/config/benefitRules";

describe("Source-linked benefit rule configuration", () => {
  it("attaches an official reference to every validated default", () => {
    for (const parameter of Object.values(DEFAULT_BENEFIT_RULES)) {
      assert.equal(new URL(parameter.source).hostname, "www.gesetze-im-internet.de");
      assert.ok(parameter.label.length > 0);
      assert.equal(parameter.overridden, false);
      assert.ok(Object.isFrozen(parameter));
    }
    assert.equal(DEFAULT_BENEFIT_RULES.siblingMinimumBasis.value, 75);
    assert.ok(Object.isFrozen(DEFAULT_BENEFIT_RULES));
  });

  it("keeps overrides isolated, validated, and marked as assumptions", () => {
    const rules = createBenefitRules({ basisMaximum: 2000,
      siblingMinimumBasis: 80.5 });
    assert.equal(rules.basisMaximum.value, 2000);
    assert.equal(rules.siblingMinimumBasis.value, 80.5);
    assert.equal(rules.basisMaximum.overridden, true);
    assert.equal(DEFAULT_BENEFIT_RULES.basisMaximum.value, 1800);
    assert.equal(rules.basisMaximum.source, DEFAULT_BENEFIT_RULES.basisMaximum.source);
  });

  it("rejects corrupt, unknown, or inconsistent overrides", () => {
    for (const input of [null, [], { typo: 42 }, { basisMaximum: NaN }, { basisMaximum: "900" }, { basisMinimum: -1 }, { minimumReplacementRate: 2 }, { assessmentMonths: 1.5 }, { maximumWeeklyHours: 61 }, { basisMaximum: 1 }, { plusFraction: 0 }]) {
      assert.throws(() => createBenefitRules(input), TypeError);
    }
    assert.throws(() => toSourceUrl("javascript:alert(1)"), TypeError);
    assert.throws(() => toSourceUrl("http://example.com"), TypeError);
    assert.throws(() => toSourceUrl("https://user:secret@example.com"), TypeError);
  });
});
