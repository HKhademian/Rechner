import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  getDefaultPersistedState,
  parseRawScenarioData,
  validateAndSanitizePersistedState,
  serializeState,
  deserializeState,
} from "#engine/storage/persistence";
import {
  parsePersonalPayrollOptions,
} from "#engine/tax/payroll";

it("preserves personal payroll settings in imported and saved scenarios", () => {
  const personal = parsePersonalPayrollOptions({ ageAtYearStart: 22,
    childrenUnder25: 0,
    healthSupplementTotalRate: 0.023,
    childAllowanceFactor: 0.5,
    saxony: true,
    churchTaxRate: 0.09 });
  const state = { ...getDefaultPersistedState(),
    husbandPayrollOptions: personal };
  assert.deepEqual(parseRawScenarioData(state).husbandPayrollOptions, personal);
  assert.deepEqual(deserializeState(serializeState(state))?.husbandPayrollOptions, personal);
  assert.deepEqual(validateAndSanitizePersistedState(state)?.husbandPayrollOptions, personal);
  assert.throws(() => parseRawScenarioData({ ...state,
    husbandPayrollOptions: { healthSupplementTotalRate: -1 } }), TypeError);
});
