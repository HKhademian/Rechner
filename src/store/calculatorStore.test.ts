import {
  TaxAssessment,
} from "#engine/tax/taxAssessment";
import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  moveScenarioLeft,
  moveScenarioRight,
  calculateScenarioData,
  getCurrentInputs,
  savedScenarios,
  editScenario,
  scenarioDraft,
  cancelEdit,
  updateScenarioMetaData,
  updateScenarioInput,
  hasUnsavedScenarioChanges,
  saveDraft,
  deleteScenario,
  undoScenarioDeletion,
  pendingScenarioDeletion,
  setLiveTaxBracket,
  taxBracket,
  hasPartner,
  partnerGrossIncome,
  grossIncome,
  personalPayroll,
  deductions,
  saveWhatIfScenario,
} from "#store/calculatorStore";
import {
  WhatIfScenarioKind,
} from "#engine/tax/whatIfScenarios";
import {
  DEFAULT_TAX_YEAR,
} from "#engine/tax/taxRules";
import {
  parsePersonalPayrollOptions,
} from "#engine/tax/payroll";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  modifyParameterValue,
  resetAllParameterOverrides,
} from "#store/parameterStore";
import {
  selectedTaxRules,
  parseVerifiedTaxYear,
} from "#store/taxConfigStore";
import {
  toFullCalendarYear,
} from "#engine/types";

it("opens a draft partner only for III/IV/V selections and preserves manual overrides", () => {
  const inputs = { ...getCurrentInputs(),
    taxBracket: "1",
    hasPartner: false };
  const liveBefore = getCurrentInputs();
  try {
    for (const bracket of ["1", "2", "3", "4", "5", "6"]) {
      savedScenarios.value = [{ id: "partner-class",
        title: "Class selection",
        description: "",
        inputs,
        data: calculateScenarioData(inputs),
        timestamp: "2026-10-31" }];
      editScenario("partner-class");
      updateScenarioInput("taxBracket", bracket);
      const draft = scenarioDraft.peek()!;
      assert.equal(draft.inputs.hasPartner, ["3", "4", "5"].includes(bracket));
      assert.equal(draft.inputs.partnerGrossIncome, inputs.partnerGrossIncome);
      assert.equal(draft.inputs.partnerTaxBracket, inputs.partnerTaxBracket);
      assert.equal(savedScenarios.value[0].inputs.hasPartner, false);
      assert.deepEqual(getCurrentInputs(), liveBefore);
    }
    updateScenarioInput("taxBracket", "3");
    updateScenarioInput("hasPartner", false);
    assert.equal(scenarioDraft.peek()?.inputs.hasPartner, false);
    updateScenarioInput("hasPartner", true);
    updateScenarioInput("taxBracket", "6");
    assert.equal(scenarioDraft.peek()?.inputs.hasPartner, true);
  }
  finally {
    cancelEdit();
    savedScenarios.value = [];
  }
});

it("opens live partner inputs atomically without modifying saved drafts or partner values", () => {
  const before = getCurrentInputs();
  savedScenarios.value = [{ id: "live-partner",
    title: "Untouched",
    description: "",
    inputs: before,
    data: calculateScenarioData(before),
    timestamp: "2026-10-31" }];
  editScenario("live-partner");
  const savedBefore = JSON.stringify(savedScenarios.value);
  const draftBefore = JSON.stringify(scenarioDraft.value);
  try {
    for (const bracket of ["1", "2", "3", "4", "5", "6"]) {
      hasPartner.value = false;
      setLiveTaxBracket(bracket);
      assert.equal(hasPartner.value, ["3", "4", "5"].includes(bracket));
      assert.equal(partnerGrossIncome.value, before.partnerGrossIncome);
    }
    setLiveTaxBracket("4");
    setLiveTaxBracket("1");
    assert.equal(hasPartner.value, true);
    hasPartner.value = false;
    taxBracket.value = "1";
    partnerGrossIncome.value = -1;
    assert.throws(() => setLiveTaxBracket("3"), TypeError);
    assert.equal(taxBracket.value, "1");
    assert.equal(hasPartner.value, false);
    assert.equal(JSON.stringify(savedScenarios.value), savedBefore);
    assert.equal(JSON.stringify(scenarioDraft.value), draftBefore);
  }
  finally {
    partnerGrossIncome.value = before.partnerGrossIncome;
    taxBracket.value = before.taxBracket;
    hasPartner.value = before.hasPartner;
    cancelEdit();
    savedScenarios.value = [];
  }
});

it("tracks only unsaved scenario input or metadata changes", () => {
  const inputs = getCurrentInputs();
  savedScenarios.value = [{ id: "dirty-check",
    title: "Original",
    description: "",
    inputs,
    data: calculateScenarioData(inputs),
    timestamp: "2026-10-30" }];
  editScenario("dirty-check");
  assert.equal(hasUnsavedScenarioChanges.value, false);
  updateScenarioMetaData("Renamed", "");
  assert.equal(hasUnsavedScenarioChanges.value, true);
  updateScenarioMetaData("Original", "");
  assert.equal(hasUnsavedScenarioChanges.value, false);
  updateScenarioInput("grossIncome", inputs.grossIncome + 100);
  assert.equal(hasUnsavedScenarioChanges.value, true);
  saveDraft();
  assert.equal(hasUnsavedScenarioChanges.value, false);
  editScenario("dirty-check");
  assert.equal(hasUnsavedScenarioChanges.value, false);
  cancelEdit();
  savedScenarios.value = [];
});

it("undoes scenario deletion in its original position and recovers the last valid draft", () => {
  const inputs = getCurrentInputs();
  const data = calculateScenarioData(inputs);
  savedScenarios.value = ["first", "second"].map((id) => ({ id,
    title: id,
    description: "",
    inputs,
    data,
    timestamp: "2026-10-30" }));
  editScenario("first");
  updateScenarioMetaData("Unsaved title", "");
  deleteScenario("first");
  assert.deepEqual(savedScenarios.value.map((scenario) => scenario.id), ["second"]);
  assert.equal(scenarioDraft.value, null);
  undoScenarioDeletion();
  assert.deepEqual(savedScenarios.value.map((scenario) => scenario.id), ["first", "second"]);
  assert.equal(savedScenarios.value[0].title, "first");
  assert.equal(scenarioDraft.peek()?.title, "Unsaved title");
  assert.equal(hasUnsavedScenarioChanges.value, true);
  assert.deepEqual(getCurrentInputs(), inputs);
  assert.equal(pendingScenarioDeletion.value, null);
  undoScenarioDeletion();
  assert.equal(savedScenarios.value.length, 2);
  cancelEdit();
  savedScenarios.value = [];
});

it("calculator uses the independently verified class I payroll fixture", () => {
  const data = calculateScenarioData({ ...getCurrentInputs(),
    inputMode: "monthly",
    grossIncome: 5000,
    taxBracket: "1",
    hasChurchTax: false,
    state: "Berlin",
    children: 0,
    hasPartner: false,
    workingMonths: 12,
    salariesPerYear: 12,
    taxYear: toFullCalendarYear(2026) });
  assert.equal(data.person1.tax, 9388.92);
  assert.equal(data.person1.totalSocialSecurity, 13050);
  assert.equal(data.person1.netIncome, 37561.08);
});

it("calculator changes real cash flows for working months and preserves yearly input", () => {
  const inputs = { ...getCurrentInputs(),
    inputMode: "monthly" as const,
    grossIncome: 4000,
    workingMonths: 6,
    salariesPerYear: 12,
    hasPartner: false };
  const monthly = calculateScenarioData(inputs);
  const yearly = calculateScenarioData({ ...inputs,
    inputMode: "yearly",
    grossIncome: 24000 });
  assert.equal(monthly.person1.grossYearly, 24000);
  assert.deepEqual(monthly.person1, yearly.person1);
  const full = calculateScenarioData({ ...inputs,
    workingMonths: 12 });
  assert.equal(monthly.person1.netIncome * 2, full.person1.netIncome);
  const noWork = calculateScenarioData({ ...inputs,
    workingMonths: 0 });
  assert.equal(noWork.household.netIncome, 0);
});

it("personal insurer, state, church and verified year reach payroll", () => {
  const inputs = { ...getCurrentInputs(),
    inputMode: "monthly" as const,
    grossIncome: 5000,
    taxBracket: "1",
    workingMonths: 12,
    salariesPerYear: 12,
    hasPartner: false,
    children: 0,
    taxYear: toFullCalendarYear(2026),
    state: "Berlin",
    hasChurchTax: false };
  const standard = calculateScenarioData(inputs).person1;
  const custom = calculateScenarioData({ ...inputs,
    state: "Sachsen",
    hasChurchTax: true,
    personalPayroll: parsePersonalPayrollOptions({ healthSupplementTotalRate: 0.02,
      ageAtYearStart: 22 }) }).person1;
  assert.equal(custom.healthCare, 4980);
  assert.ok(custom.churchTax > 0);
  assert.notEqual(custom.netIncome, standard.netIncome);
  assert.notEqual(calculateScenarioData({ ...inputs,
    taxYear: toFullCalendarYear(2025) }).person1.tax, standard.tax);
  assert.throws(() => parseVerifiedTaxYear(2030), TypeError);
  assert.throws(() => parsePersonalPayrollOptions({ healthSupplementTotalRate: -0.01 }), TypeError);
  assert.throws(() => parsePersonalPayrollOptions({ expectedRegularAnnualGross: 1 }), TypeError);
});

it("old saved inputs migrate to the verified default and cached results are recalculated", () => {
  const { taxYear: _year, personalPayroll: _personal, partnerPersonalPayroll: _partner, taxFactor: _factor, ...oldInputs } = getCurrentInputs();
  const expected = calculateScenarioData({ ...oldInputs,
    taxYear: DEFAULT_TAX_YEAR });
  const cached = { ...expected,
    person1: { ...expected.person1,
      netIncome: 1 } };
  savedScenarios.value = [{ id: "legacy",
    title: "Legacy",
    description: "",
    timestamp: "",
    inputs: oldInputs,
    data: cached }];
  editScenario("legacy");
  assert.equal(scenarioDraft.value?.data.person1.netIncome, expected.person1.netIncome);
  cancelEdit();
  savedScenarios.value = [];
});

it("calculator annual taxable income uses its own active months, bonuses and partner inputs", () => {
  const inputs = { ...getCurrentInputs(),
    inputMode: "monthly" as const,
    grossIncome: 4000,
    workingMonths: 6,
    salariesPerYear: 13,
    taxBracket: "1",
    hasChurchTax: false,
    state: "Berlin",
    children: 0,
    hasPartner: false,
    taxYear: toFullCalendarYear(2026) };
  const single = calculateScenarioData(inputs).annualTaxableIncome;
  assert.equal(single.incomeByPerson.length, 1);
  assert.equal(single.incomeByPerson[0].gross, 26000);
  const yearly = calculateScenarioData({ ...inputs,
    inputMode: "yearly",
    grossIncome: 26000 }).annualTaxableIncome;
  assert.deepEqual(single, yearly);
  const joint = calculateScenarioData({ ...inputs,
    hasPartner: true,
    assessmentMode: TaxAssessment.Joint,
    partnerGrossIncome: 3000,
    partnerWorkingMonths: 12,
    partnerSalariesPerYear: 12,
    partnerTaxBracket: "4",
    partnerHasChurchTax: false }).annualTaxableIncome;
  assert.equal(joint.incomeByPerson.length, 2);
  assert.equal(joint.incomeByPerson[1].gross, 36000);
  assert.ok(joint.taxBase);
  assert.equal(joint.taxBase.specialExpenses, single.taxBase!.specialExpenses * joint.incomeByPerson.length);
});

it("reorders saved columns without changing live inputs or an active draft", () => {
  const before = savedScenarios.peek();
  const live = getCurrentInputs();
  try {
    savedScenarios.value = ["first", "middle", "last"].map((id) => ({ id,
      title: id,
      description: "",
      timestamp: "",
      inputs: live,
      data: calculateScenarioData(live) }));
    editScenario("middle");
    updateScenarioMetaData("Draft title", "Keep me");
    const draft = scenarioDraft.peek();
    moveScenarioLeft("first");
    moveScenarioRight("last");
    moveScenarioRight("missing");
    assert.deepEqual(savedScenarios.peek().map((item) => item.id), ["first", "middle", "last"]);
    moveScenarioLeft("middle");
    assert.deepEqual(savedScenarios.peek().map((item) => item.id), ["middle", "first", "last"]);
    moveScenarioRight("middle");
    assert.deepEqual(savedScenarios.peek().map((item) => item.id), ["first", "middle", "last"]);
    assert.equal(scenarioDraft.peek(), draft);
    assert.deepEqual(getCurrentInputs(), live);
  }
  finally {
    cancelEdit();
    savedScenarios.value = before;
  }
});

it("keeps assessment choice independent of partner presence and net withholding", () => {
  const inputs = { ...getCurrentInputs(),
    children: 0,
    hasChurchTax: false,
    partnerHasChurchTax: false,
    personalPayroll: {},
    partnerPersonalPayroll: {},
    hasPartner: true,
    assessmentMode: TaxAssessment.Unspecified };
  const pending = calculateScenarioData(inputs);
  const individual = calculateScenarioData({ ...inputs,
    assessmentMode: TaxAssessment.Individual });
  const joint = calculateScenarioData({ ...inputs,
    assessmentMode: TaxAssessment.Joint });
  assert.equal(pending.annualTaxableIncome.taxBase, undefined);
  assert.deepEqual(pending.household, individual.household);
  assert.deepEqual(individual.household, joint.household);
  assert.equal(calculateScenarioData({ ...inputs,
    hasPartner: false }).annualTaxableIncome.assessment, TaxAssessment.Individual);
});

it("updates live Net Pay deductions and selectedTaxRules when unified parameter overrides change", () => {
  const previousGross = grossIncome.peek();
  const previousPersonal = personalPayroll.peek();
  resetAllParameterOverrides();
  try {
    grossIncome.value = 60000;
    personalPayroll.value = {};
    const baselineHealth = deductions.peek().person1.healthCare;
    const baselineSupplement = selectedTaxRules.peek().parameters.healthSupplementTotalRate.value;

    const result = modifyParameterValue(ParameterId.Tax_HealthSupplementTotalRate, 0.045);
    assert.equal(result.ok, true);
    assert.equal(selectedTaxRules.peek().parameters.healthSupplementTotalRate.value, 0.045);
    assert.equal(selectedTaxRules.peek().parameters.healthSupplementTotalRate.overridden, true);
    assert.ok(deductions.peek().person1.healthCare > baselineHealth);
    assert.ok(baselineSupplement < 0.045);
  }
  finally {
    resetAllParameterOverrides();
    grossIncome.value = previousGross;
    personalPayroll.value = previousPersonal;
  }
});

it("models a non-employed (€0-wage) married spouse separately from unmarried or single payrolls", async () => {
  const { HouseholdRelationship } = await import("#engine/tax/taxAssessment");
  const { LawId } = await import("#engine/laws/types");
  const base = {
    ...getCurrentInputs(),
    inputMode: "monthly" as const,
    grossIncome: 5000,
    workingMonths: 12,
    salariesPerYear: 12,
    taxBracket: "3",
    hasChurchTax: false,
    state: "Berlin",
    children: 0,
    hasPartner: false,
    taxYear: toFullCalendarYear(2026),
  };

  // Married sole earner opting into Joint assessment gets 2x Sonderausgaben-Pauschbetrag (€72 vs €36)
  const marriedZeroWage = calculateScenarioData({
    ...base,
    relationshipStatus: HouseholdRelationship.MarriedOrCivilPartners,
    assessmentMode: TaxAssessment.Joint,
  });
  assert.equal(marriedZeroWage.partner, null);
  assert.equal(marriedZeroWage.includesZeroWageSpouse, true);
  assert.equal(marriedZeroWage.annualTaxableIncome.incomeByPerson.length, 2);
  assert.equal(marriedZeroWage.annualTaxableIncome.incomeByPerson[1].gross, 0);
  assert.equal(marriedZeroWage.annualTaxableIncome.taxBase?.taxableIncome, 46638);
  assert.deepEqual(marriedZeroWage.statutoryWarnings, []);

  // Same 1 payroll as Single (or married Individual) gets 1x Sonderausgaben-Pauschbetrag (€36)
  const marriedIndividual = calculateScenarioData({
    ...base,
    relationshipStatus: HouseholdRelationship.MarriedOrCivilPartners,
    assessmentMode: TaxAssessment.Individual,
  });
  assert.equal(marriedIndividual.includesZeroWageSpouse, false);
  assert.equal(marriedIndividual.annualTaxableIncome.taxBase?.taxableIncome, 46674);

  // Qualifying widowhood allows Class III without a partner payroll warning
  const widowed = calculateScenarioData({
    ...base,
    relationshipStatus: HouseholdRelationship.QualifyingWidowed,
    assessmentMode: TaxAssessment.Individual,
  });
  assert.deepEqual(widowed.statutoryWarnings, []);
  assert.equal(widowed.annualTaxableIncome.assessment, TaxAssessment.Individual);

  // Unmarried cohabiting partners always use separate individual bases even if Joint is passed
  const unmarriedTwoEarners = calculateScenarioData({
    ...base,
    hasPartner: true,
    taxBracket: "2",
    partnerTaxBracket: "1",
    children: 1,
    relationshipStatus: HouseholdRelationship.UnmarriedPartners,
    assessmentMode: TaxAssessment.Joint,
  });
  assert.equal(unmarriedTwoEarners.annualTaxableIncome.assessment, TaxAssessment.Individual);
  assert.ok(unmarriedTwoEarners.statutoryWarnings.some((w) => w.lawId === LawId.EStG_24b));
  assert.ok(unmarriedTwoEarners.statutoryWarnings.some((w) => w.lawId === LawId.EStG_26));
});

it("saves non-destructive what-if comparison scenarios using the shared payroll engine", () => {
  const before = getCurrentInputs();
  const savedBefore = savedScenarios.peek();
  savedScenarios.value = [];
  cancelEdit();
  try {
    const raised = saveWhatIfScenario(WhatIfScenarioKind.Raise10);
    const partnered = saveWhatIfScenario(WhatIfScenarioKind.PartnerSplit);
    const childAdded = saveWhatIfScenario(WhatIfScenarioKind.AddChild);

    assert.equal(savedScenarios.value.length, 3);
    assert.notEqual(raised.id, partnered.id);
    assert.notEqual(partnered.id, childAdded.id);
    assert.equal(scenarioDraft.value, null);
    assert.deepEqual(getCurrentInputs(), before);
    assert.deepEqual(raised.data, calculateScenarioData(raised.inputs));
    assert.deepEqual(partnered.data, calculateScenarioData(partnered.inputs));
    assert.deepEqual(childAdded.data, calculateScenarioData(childAdded.inputs));
    assert.ok(raised.data.household.netIncome > deductions.value.household.netIncome);
  }
  finally {
    cancelEdit();
    savedScenarios.value = savedBefore;
  }
});
