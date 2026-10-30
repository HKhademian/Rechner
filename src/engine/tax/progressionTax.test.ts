import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  toEuroAmount,
} from "#engine/types";
import {
  DEFAULT_TAX_RULES,
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  computeJointProgressionTax,
} from "#engine/tax/progressionTax";

it("applies independently worked 2026 splitting and progression references", () => {
  // §32a tariff: z=(25000-17799)/10000=.7201, floor((173.10z+2397)z+1034.87)=2850.
  // Joint hypothetical5700/50000=11.4%; apply to40000 =>4560.
  const result = computeJointProgressionTax(toEuroAmount(40000), toEuroAmount(10000), DEFAULT_TAX_RULES);
  assert.equal(result.hypotheticalTax, 5700);
  assert.equal(result.specialRate, 0.114);
  assert.equal(result.incomeTax, 4560);
  // At80000 joint rate income, hypothetical14418/80000=18.0225%, ×60000 floors to10813.
  assert.equal(computeJointProgressionTax(toEuroAmount(60000), toEuroAmount(20000), DEFAULT_TAX_RULES).incomeTax, 10813);
});

it("truncates the special rate but retains the ordinary tariff when progression is zero", () => {
  // Independently calculated hypothetical6404/52638=12.166115...%, truncate12.1661%; ×46638 =>5674.
  const result = computeJointProgressionTax(toEuroAmount(46638), toEuroAmount(6000), DEFAULT_TAX_RULES);
  assert.equal(result.specialRate, 0.121661);
  assert.equal(result.incomeTax, 5674);
  assert.equal(computeJointProgressionTax(toEuroAmount(46638), toEuroAmount(0), DEFAULT_TAX_RULES).incomeTax, 4820);
  assert.equal(computeJointProgressionTax(toEuroAmount(0), toEuroAmount(6000), DEFAULT_TAX_RULES).incomeTax, 0);
  assert.throws(() => computeJointProgressionTax(toEuroAmount(100), toEuroAmount(-1), DEFAULT_TAX_RULES), TypeError);
  assert.throws(() => createTaxRules(undefined, { progressionRatePercentDecimalPlaces: 1.5 }), TypeError);
});
