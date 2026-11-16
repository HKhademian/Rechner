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
  getTopic,
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
