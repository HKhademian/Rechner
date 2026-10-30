import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
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
} from "#store/calculatorStore";
import {
  DEFAULT_TAX_YEAR,
} from "#engine/tax/taxRules";
import {
  parsePersonalPayrollOptions,
} from "#engine/tax/payroll";
import {
  parseVerifiedTaxYear,
} from "#store/taxConfigStore";
import {
  toFullCalendarYear,
} from "#engine/types";

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
