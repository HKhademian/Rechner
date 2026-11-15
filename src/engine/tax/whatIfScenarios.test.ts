import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  HouseholdRelationship,
  TaxAssessment,
} from "#engine/tax/taxAssessment";
import {
  WhatIfScenarioKind,
  buildWhatIfScenario,
  getAvailableWhatIfScenarios,
  isWhatIfScenarioKind,
  toWhatIfScenarioKind,
} from "#engine/tax/whatIfScenarios";
import {
  type CalculatorInputs,
} from "#store/calculatorStore";

const BASE_SINGLE: CalculatorInputs = {
  inputMode: "yearly",
  grossIncome: 60000,
  taxBracket: "1",
  hasChurchTax: false,
  state: "Berlin",
  children: 0,
  workingMonths: 12,
  salariesPerYear: 12,
  hasPartner: false,
  partnerGrossIncome: 40000,
  partnerTaxBracket: "4",
  partnerHasChurchTax: false,
  partnerState: "Berlin",
  partnerWorkingMonths: 12,
  partnerSalariesPerYear: 12,
};

it("validates what-if scenario kinds at runtime", () => {
  assert.equal(isWhatIfScenarioKind(WhatIfScenarioKind.Raise10), true);
  assert.equal(isWhatIfScenarioKind("unknown"), false);
  assert.equal(toWhatIfScenarioKind("add-child"), WhatIfScenarioKind.AddChild);
  assert.throws(() => toWhatIfScenarioKind("invalid"), TypeError);
});

it("builds non-destructive raise, partner, and child scenarios without mutating base inputs", () => {
  const snapshot = JSON.stringify(BASE_SINGLE);
  const scenarios = getAvailableWhatIfScenarios(BASE_SINGLE);

  assert.equal(scenarios.length, 3);
  assert.equal(scenarios[0]?.inputs.grossIncome, 66000);
  assert.equal(scenarios[1]?.inputs.hasPartner, true);
  assert.equal(scenarios[1]?.inputs.relationshipStatus, HouseholdRelationship.MarriedOrCivilPartners);
  assert.equal(scenarios[1]?.inputs.assessmentMode, TaxAssessment.Joint);
  assert.equal(scenarios[1]?.inputs.taxBracket, "4");
  assert.equal(scenarios[2]?.inputs.children, 1);
  assert.equal(JSON.stringify(BASE_SINGLE), snapshot);
});

it("switches between Class III/V and Class IV/IV when a partner is already active", () => {
  const partneredIv: CalculatorInputs = {
    ...BASE_SINGLE,
    hasPartner: true,
    taxBracket: "4",
    partnerTaxBracket: "4",
  };
  const classSplit = buildWhatIfScenario(partneredIv, WhatIfScenarioKind.PartnerSplit);
  assert.equal(classSplit.inputs.taxBracket, "3");
  assert.equal(classSplit.inputs.partnerTaxBracket, "5");

  const partneredIiiV: CalculatorInputs = {
    ...partneredIv,
    taxBracket: "3",
    partnerTaxBracket: "5",
  };
  const backToFour = buildWhatIfScenario(partneredIiiV, WhatIfScenarioKind.PartnerSplit);
  assert.equal(backToFour.inputs.taxBracket, "4");
  assert.equal(backToFour.inputs.partnerTaxBracket, "4");
});
