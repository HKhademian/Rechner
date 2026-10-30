import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  toGrossSalary,
  toEuroAmount,
} from "#engine/types";
import {
  DEFAULT_TAX_RULES,
} from "#engine/tax/taxRules";
import {
  computeAnnualEmploymentTaxBase,
} from "#engine/tax/annualEmploymentIncome";

const income = (gross = 0, health = 0, care = 0, pension = 0, unemployment = 0) => ({
  gross: toGrossSalary(gross),
  health: toEuroAmount(health),
  care: toEuroAmount(care),
  pension: toEuroAmount(pension),
  unemployment: toEuroAmount(unemployment),
});

it("deducts actual employee contributions, with basic health/care protected above the ceiling", () => {
  // EStG §10: https://www.gesetze-im-internet.de/estg/__10.html
  // Given annual receipts: 60000 -1230 -5580 -(5250×.96+1440) -72 =46638.
  const result = computeAnnualEmploymentTaxBase(income(60000, 5250, 1440, 5580, 780), income(), DEFAULT_TAX_RULES);
  assert.equal(result.protectedInsurance, 6480);
  assert.equal(result.insuranceDeduction, 6480);
  assert.equal(result.taxableIncome, 46638);
});

it("uses remaining capacity for full health and unemployment contributions and pools spousal limits", () => {
  // Given receipts: 22000 -2460 -1800 -(1800+360+360) -72 =15148.
  const low = computeAnnualEmploymentTaxBase(income(12000, 1000, 200, 1000, 200), income(10000, 800, 160, 800, 160), DEFAULT_TAX_RULES);
  assert.equal(low.insuranceDeduction, 2520);
  assert.equal(low.taxableIncome, 15148);
  // Joint basic health4320 exceeds the joint3800 limit: no additional unemployment deduction.
  const pooled = computeAnnualEmploymentTaxBase(income(40000, 4000), income(10000, 500, 0, 0, 400), DEFAULT_TAX_RULES);
  assert.equal(pooled.insuranceDeduction, 4320);
});

it("retains each parent's unused work allowance for progression benefits without creating a loss", () => {
  const partial = computeAnnualEmploymentTaxBase(income(600), income(), DEFAULT_TAX_RULES);
  assert.equal(partial.husbandWorkExpenses, 600);
  assert.equal(partial.husbandUnusedWorkAllowance, 630);
  assert.equal(partial.wifeUnusedWorkAllowance, 1230);
  assert.equal(partial.taxableIncome, 0);
  assert.equal(computeAnnualEmploymentTaxBase(income(), income(), DEFAULT_TAX_RULES).taxableIncome, 0);
  assert.throws(() => computeAnnualEmploymentTaxBase({ ...income(),
    health: toEuroAmount(-1) }, income(), DEFAULT_TAX_RULES), TypeError);
});

it("retains separate partner contributions that reconcile with the unchanged joint tax base", () => {
  for (const [husband, wife] of [[income(60000, 5250, 1440, 5580, 780), income()], [income(12000, 1000, 200, 1000, 200), income(10000, 800, 160, 800, 160)], [income(600), income()]]) {
    const result = computeAnnualEmploymentTaxBase(husband, wife, DEFAULT_TAX_RULES);
    const partners = result.incomeByPartner;
    assert.equal(partners.husband.gross, husband.gross);
    assert.equal(partners.wife.gross, wife.gross);
    assert.equal(partners.husband.employmentIncome, husband.gross - result.husbandWorkExpenses);
    assert.equal(partners.wife.employmentIncome, wife.gross - result.wifeWorkExpenses);
    const combined = partners.husband.employmentIncome + partners.wife.employmentIncome;
    assert.equal(combined, result.gross - result.husbandWorkExpenses - result.wifeWorkExpenses);
    assert.equal(result.taxableIncome, Math.max(0, combined - result.pensionDeduction - result.insuranceDeduction - result.specialExpenses));
    assert.ok(Object.isFrozen(partners.husband));
    assert.ok(Object.isFrozen(partners.wife));
  }
});
