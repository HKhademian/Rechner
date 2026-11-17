import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  allCalculatorApps,
} from "#/apps/registry.ts";
import {
  getLawEntry,
} from "#engine/laws/registry";
import {
  getSubtopics,
  getTopic,
  searchTopics,
  topics,
  topicsForLaw,
} from "#engine/topics/registry";

it("has unique topics with valid rules, calculators and sources", () => {
  const ids = new Set<string>();
  for (const topic of topics) {
    assert.match(topic.id, /^[a-z0-9-]+$/);
    assert.equal(ids.has(topic.id), false);
    ids.add(topic.id);
    assert.equal(getTopic(topic.id), topic);
    assert.ok(topic.title && topic.description && topic.benefit && topic.limitation && topic.calculatorEffect);
    assert.doesNotMatch([topic.title, topic.description, topic.benefit, topic.limitation, topic.calculatorEffect].join(" "), /\bqr(?:[ -]?code)?\b/i);
    assert.ok(topic.laws.length || topic.source);
    if (topic.parentId) {
      const parent = getTopic(topic.parentId);
      assert.ok(parent, `Missing parent for ${topic.id}`);
      assert.equal(parent.parentId, undefined, "Subtopics must have a top-level parent");
      assert.ok(getSubtopics(parent.id).includes(topic));
    }
    for (const law of topic.laws) {
      assert.ok(getLawEntry(law));
      assert.ok(topicsForLaw(law).includes(topic));
    }
    for (const app of topic.apps) {
      assert.ok(allCalculatorApps.some((candidate) => candidate.id === app));
    }
    if (topic.source) {
      assert.equal(new URL(topic.source.url).protocol, "https:");
    }
  }
});

it("groups related explanations and preserves their rule links", () => {
  for (const [parent, child] of [["kfw-300", "eh40"], ["solar", "solar-vat"], ["company-car", "car-commute"], ["parental-allowance", "sibling-bonus"], ["girocode", "payment-reference"]]) {
    assert.ok(getSubtopics(parent).some((topic) => topic.id === child));
    assert.ok(searchTopics(getTopic(child)!.title).some((topic) => topic.id === parent));
  }
});


it("groups subtopics without hiding them from search", () => {
  const children = getSubtopics("mortgage-repayment");
  assert.deepEqual(children.map((item) => item.id), ["purchase-costs", "bank-loan-amount", "loan-to-value", "mortgage-payoff-term", "extra-bank-payment", "kfw-repayment-options", "mortgage-affordability"]);
  assert.ok(searchTopics("").every((topic) => !topic.parentId));
  assert.deepEqual(searchTopics("bank loan amount").map((topic) => topic.id), ["mortgage-repayment"]);
  assert.ok(searchTopics("purchase costs beyond").some((topic) => topic.id === "mortgage-repayment"));
});
