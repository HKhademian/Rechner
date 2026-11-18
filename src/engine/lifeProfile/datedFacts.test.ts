import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  eventDateBounds,
} from "#engine/lifeProfile/datedFacts";
import {
  toLifeEventDate,
} from "#engine/lifeProfile/timeline";

it("preserves the full possible interval of partial dates", () => {
  assert.deepEqual(eventDateBounds(toLifeEventDate("2024-02")), ["2024-02-01", "2024-02-29"]);
  assert.deepEqual(eventDateBounds(toLifeEventDate("2025-02")), ["2025-02-01", "2025-02-28"]);
  assert.deepEqual(eventDateBounds(toLifeEventDate("2026")), ["2026-01-01", "2026-12-31"]);
  assert.equal(eventDateBounds(undefined), undefined);
});
