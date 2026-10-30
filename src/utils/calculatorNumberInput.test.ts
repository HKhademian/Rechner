import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  parseCalculatorNumber,
} from "#utils/calculatorNumberInput";
import {
  toGrossSalary,
  toChildrenCount,
} from "#engine/types";

it("preserves blank edits without turning them into zero income", () => {
  assert.equal(parseCalculatorNumber("", toGrossSalary), undefined);
  assert.equal(parseCalculatorNumber("  ", toGrossSalary), undefined);
  assert.equal(parseCalculatorNumber("0", toGrossSalary), 0);
  assert.equal(parseCalculatorNumber("4200.25", toGrossSalary), 4200.25);
});

it("rejects non-finite values and uses the field's existing constructor", () => {
  for (const raw of ["NaN", "Infinity", "-1", "1e999"]) {
    assert.throws(() => parseCalculatorNumber(raw, toGrossSalary), TypeError);
  }
  assert.equal(parseCalculatorNumber("2", toChildrenCount), 2);
  assert.throws(() => parseCalculatorNumber("1.5", toChildrenCount), TypeError);
});
