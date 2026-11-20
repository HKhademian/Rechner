import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  JurisdictionCode,
} from "#engine/lifeProfile/statutoryRuleResolver";
import {
  TaxClassCombination,
} from "#engine/lifeProfile/taxSwitchEvent";
import {
  compareTaxClassSwitches,
} from "#engine/lifeProfile/taxClassSwitchComparison";
import {
  ExplanationStatus,
} from "#engine/lifeProfile/calculationExplanation";

it("separates monthly payroll withholding from invariant final annual joint tax across switch dates", () => {
  const result = compareTaxClassSwitches({
    taxYear: 2026,
    primaryMonthlyGrossEur: 6500,
    secondaryMonthlyGrossEur: 3200,
    childrenCount: 1,
    initialCombination: TaxClassCombination.IV_IV,
    targetCombination: TaxClassCombination.III_V,
    switchMonth: 7,
    jurisdiction: JurisdictionCode.GermanyFederal,
  });

  assert.equal(result.supported, true);
  assert.ok(result.beforeSwitch && result.afterSwitch && result.finalAnnualTax && result.selectedSwitchScenario);

  // Switching to III/V for asymmetric incomes lowers monthly withholding (higher combined monthly net)
  assert.ok(result.afterSwitch.combinedMonthlyNetCents > result.beforeSwitch.combinedMonthlyNetCents);
  assert.ok(result.afterSwitch.combinedMonthlyTaxWithheldCents < result.beforeSwitch.combinedMonthlyTaxWithheldCents);

  // Switch in July means 6 months in IV/IV and 6 months in III/V
  assert.equal(result.selectedSwitchScenario.monthsInInitial, 6);
  assert.equal(result.selectedSwitchScenario.monthsInTarget, 6);
  assert.equal(result.finalAnnualTax.mandatoryFilingRequired, true);

  // Final annual joint tax is identical regardless of switch date
  const janSwitch = result.switchDateComparisons[0];
  const noSwitch = result.switchDateComparisons[4];
  assert.ok(janSwitch.annualCombinedTaxWithheldCents < noSwitch.annualCombinedTaxWithheldCents);
  assert.equal(
    janSwitch.annualCombinedTaxWithheldCents - janSwitch.estimatedYearEndSettlementCents,
    noSwitch.annualCombinedTaxWithheldCents - noSwitch.estimatedYearEndSettlementCents,
  );
});

it("marks unsupported jurisdiction or unverified tax years cleanly", () => {
  const unsupported = compareTaxClassSwitches({
    taxYear: 2026,
    primaryMonthlyGrossEur: 5000,
    secondaryMonthlyGrossEur: 4000,
    childrenCount: 0,
    initialCombination: TaxClassCombination.IV_IV,
    targetCombination: TaxClassCombination.IV_IV_Factor,
    switchMonth: 1,
    jurisdiction: JurisdictionCode.UnsupportedOther,
  });
  assert.equal(unsupported.supported, false);
  assert.equal(unsupported.explanation.status, ExplanationStatus.Unsupported);
});
