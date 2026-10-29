import {
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";
import {
  toFullCalendarYear,
} from "#engine/types";
import {
  createTaxRules,
} from "#engine/tax/taxRules";

describe("Sourced annual statutory rules", () => {
  it("selects different verified profiles at the year boundary", () => {
    const before = createTaxRules(toFullCalendarYear(2025));
    const after = createTaxRules(toFullCalendarYear(2026));
    assert.equal(before.parameters.basicAllowance.value, 12096);
    assert.equal(after.parameters.basicAllowance.value, 12348);
    assert.equal(after.parameters.healthCapMonthly.value, 5812.5);
    assert.equal(after.parameters.pensionCapMonthly.value, 8450);
    assert.equal(after.projected, false);
    for (const entry of Object.values(after.parameters)) {
      assert.equal(new URL(entry.source).protocol, "https:");
      assert.ok(Object.isFrozen(entry));
    }
  });

  it("labels future projections and rejects unavailable historical profiles", () => {
    const future = createTaxRules(toFullCalendarYear(2030));
    assert.equal(future.calendarYear, 2030);
    assert.equal(future.sourceYear, 2026);
    assert.equal(future.projected, true);
    assert.throws(() => createTaxRules(toFullCalendarYear(2024)), TypeError);
  });

  it("validates custom assumptions and preserves their official references", () => {
    const custom = createTaxRules(toFullCalendarYear(2026), { basicAllowance: 13000 });
    assert.equal(custom.parameters.basicAllowance.value, 13000);
    assert.equal(custom.parameters.basicAllowance.overridden, true);
    for (const overrides of [{ basicAllowance: -1 }, { topRate: 42 }, { healthCapMonthly: 0 }, { wrong: 1 }, { basicAllowance: "13000" }]) {
      assert.throws(() => createTaxRules(toFullCalendarYear(2026), overrides), TypeError);
    }
  });
});
