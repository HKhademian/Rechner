import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  serializeCalculatorScenario,
  parseCalculatorScenario,
} from "#engine/storage/calculatorScenario";
import {
  calculateScenarioData,
  getCurrentInputs,
  importCalculatorScenario,
  savedScenarios,
  scenarioDraft,
} from "#store/calculatorStore";

it("round-trips complete calculator inputs and imports transactionally without changing saved cases", () => {
  const initial = getCurrentInputs();
  const inputs = { ...initial,
    grossIncome: 6123.45,
    inputMode: "monthly" as const,
    hasPartner: true,
    partnerGrossIncome: 0 };
  const scenario = { id: "transfer",
    title: "Transfer",
    description: "A saved case",
    timestamp: "",
    inputs,
    data: calculateScenarioData(inputs) };
  const raw = JSON.parse(serializeCalculatorScenario(scenario));
  assert.equal(raw.data, undefined);
  assert.deepEqual(parseCalculatorScenario(raw), inputs);
  const saved = savedScenarios.peek();
  const draft = scenarioDraft.peek();
  try {
    importCalculatorScenario({ ...raw,
      data: { household: { netIncome: 999999 } } });
    assert.deepEqual(getCurrentInputs(), inputs);
    assert.equal(savedScenarios.peek(), saved);
    assert.equal(scenarioDraft.peek(), draft);
    for (const invalid of [
      { ...raw,
        version: 999 },
      { ...raw,
        format: "simulator" },
      ...[{ grossIncome: -1 }, { hasPartner: "yes" }, { workingMonths: 13 }, { state: "unknown" }, { taxYear: 2035 }, { inputMode: "weekly" }, { partnerGrossIncome: "" }, { taxFactor: 2 }, { partnerPersonalPayroll: { ageAtYearStart: -1 } }].map((change) => ({ ...raw,
        inputs: { ...inputs,
          ...change } })),
    ]) {
      assert.throws(() => importCalculatorScenario(invalid), TypeError);
      assert.deepEqual(getCurrentInputs(), inputs);
    }
  }
  finally {
    importCalculatorScenario({ ...raw,
      inputs: initial });
  }
});
