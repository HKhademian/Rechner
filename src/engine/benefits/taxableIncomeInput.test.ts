import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  parseHouseholdTaxableIncome,
} from "#engine/benefits/taxableIncomeInput";
import {
  parseRawScenarioData,
  validateAndSanitizePersistedState,
} from "#engine/storage/persistence";

it("preserves supplied yearly taxable income through scenario boundaries", () => {
  const householdTaxableIncome = [{ calendarYear: 2025,
    taxableIncome: 175000.01 }];
  const parsed = parseRawScenarioData({ householdTaxableIncome });
  assert.deepEqual(parsed.householdTaxableIncome, householdTaxableIncome);
  assert.deepEqual(validateAndSanitizePersistedState(JSON.parse(JSON.stringify(parsed))).householdTaxableIncome, householdTaxableIncome);
  assert.equal(parseHouseholdTaxableIncome([{ calendarYear: 2025,
    taxableIncome: 0 }])[0].taxableIncome, 0);
  assert.equal(parseHouseholdTaxableIncome(undefined).length, 0);
  assert.throws(() => parseHouseholdTaxableIncome([...householdTaxableIncome, ...householdTaxableIncome]), /Duplicate/);
  assert.throws(() => parseRawScenarioData({ householdTaxableIncome: [{ calendarYear: 2025,
    taxableIncome: "175000" }] }), TypeError);
  const warnings: string[] = [];
  const sanitized = validateAndSanitizePersistedState({ ...parsed,
    householdTaxableIncome: "missing" }, undefined, warnings);
  assert.deepEqual(sanitized.householdTaxableIncome, []);
  assert.ok(warnings.some((warning) => warning.includes("taxable-income")));
});
