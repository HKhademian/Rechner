import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  ScenarioId,
} from "#engine/types";
import {
  plannerCalculationLabels,
} from "#utils/plannerCalculationLabels";

describe("plannerCalculationLabels", () => {
  it("provides distinct non-empty labels for every scenario identifier", () => {
    const scenarioIds = [...new Set(Object.values(ScenarioId))];
    assert.equal(scenarioIds.length, 3);

    const seenLabels = new Set<string>();
    for (const id of scenarioIds) {
      const label = plannerCalculationLabels[id];
      assert.equal(typeof label, "string");
      assert.ok(label.trim().length > 0, `Expected non-empty label for ${id}`);
      seenLabels.add(label);
    }

    assert.equal(seenLabels.size, scenarioIds.length);
  });
});
