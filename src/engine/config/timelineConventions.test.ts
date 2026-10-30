import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  createTimelineConventions,
} from "#engine/config/timelineConventions";

it("distinguishes configurable claim/timing assumptions from statutory values", () => {
  const plan = createTimelineConventions({ motherOrdinaryPlusMonths: 6,
    partnershipBonusMonths: 0 });
  assert.equal(plan.motherOrdinaryPlusMonths.value, 6);
  assert.equal(plan.partnershipBonusMonths.value, 0);
  for (const parameter of Object.values(plan)) {
    assert.equal(parameter.assumption, true);
    assert.equal(new URL(parameter.statutoryContext).hostname, "www.gesetze-im-internet.de");
  }
  assert.throws(() => createTimelineConventions({ motherOrdinaryPlusMonths: 1.5 }), TypeError);
  assert.throws(() => createTimelineConventions({ typo: 1 }), TypeError);
});
