import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  setPregnancy1PositiveDate,
  customPregnancies,
  startCalendarYear,
  startCalendarMonth,
  child1BirthMonth,
  prePregnancyPlanningMonths,
  resetToDefaults,
  LegalRuleKey,
  LEGAL_RULE_LAW_MAP,
  activeLegalRuleKey,
  scrollToLegalRule,
  statutoryOptimizedData,
  derivedSpousalSet,
  salaryInputMode,
  husbandGross,
  husbandGrossYearly,
  husbandHours,
  setHusbandHours,
  husbandSalariesCount,
  setHusbandSalariesCount,
  husbandBonusPreset,
  setHusbandBonusPreset,
  enable13thSalary,
  wifeGross,
  existingChildrenCount,
  setExistingChildrenCount,
  childcarePlan,
  updateChildcarePlan,
  indexFutureTaxBrackets,
  setIndexFutureTaxBrackets,
  getCurrentPersistedState,
  importSimulationState,
} from "#store/elterngeldStore";
import {
  activeLawModalState,
  closeLawReference,
} from "#store/lawReferenceStore";
import {
  modifyParameterValue,
  resetAllParameterOverrides,
} from "#store/parameterStore";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  getStandard3ChildrenPersistedState,
} from "#engine/storage/persistence";
import {
  getLawEntry,
  getLawGroupEntry,
} from "#engine/laws/registry";
import {
  AnnualSalariesCount,
  BonusDistributionPreset,
  SalaryInputMode,
  FederalStateKitaPresetId,
  toPregnancyId,
  toChildIndex,
  toCalendarMonth,
  toFullCalendarYear,
  toSimulationMonth,
  toWorkingHours,
  toNetSalary,
  toMonthDuration,
  toGrossSalary,
  toEuroAmount,
} from "#engine/types";

it("keeps October 2026 selected in the pregnancy action and delivery baseline", () => {
  resetToDefaults();
  customPregnancies.value = [1, 2].map((child) => ({
    pregnancyId: toPregnancyId(`PREG-CHILD-${child}`),
    childIndex: toChildIndex(child),
    positiveTestCalendarMonth: toCalendarMonth(9),
    positiveTestCalendarYear: toFullCalendarYear(2025 + child),
    positiveTestSimulationMonth: toSimulationMonth(9 + (child - 1) * 12),
    calculatedDeliverySimulationMonth: toSimulationMonth(17 + (child - 1) * 12),
    motherPostBirthPartTimeHours: toWorkingHours(0),
    motherPostBirthPartTimeClass5Net: toNetSalary(0),
    motherPostBirthPartTimeClass3Net: toNetSalary(0),
    fatherPartnerMonthsCount: toMonthDuration(0),
  }));
  const laterPregnancies = customPregnancies.value.slice(1);
  try {
    setPregnancy1PositiveDate(2026, 10);
    const first = customPregnancies.value[0];
    assert.equal(first.positiveTestCalendarMonth, 10);
    assert.equal(first.positiveTestCalendarYear, 2026);
    assert.equal(first.positiveTestSimulationMonth, 10);
    assert.equal(first.calculatedDeliverySimulationMonth, 18);
    assert.equal(child1BirthMonth.value, 18);
    assert.equal(startCalendarYear.value, 2026);
    assert.equal(startCalendarMonth.value, 1);
    assert.equal(prePregnancyPlanningMonths.value, 9);
    assert.deepEqual(customPregnancies.value.slice(1), laterPregnancies);

    setPregnancy1PositiveDate(2027, 2);
    assert.equal(startCalendarYear.value, 2026);
    assert.equal(customPregnancies.value[0].positiveTestSimulationMonth, 14);
    assert.equal(customPregnancies.value[0].positiveTestCalendarMonth, 2);
    assert.equal(customPregnancies.value[0].positiveTestCalendarYear, 2027);
    assert.equal(child1BirthMonth.value, 22);
  }
  finally {
    resetToDefaults();
  }
});

it("maps every LegalRuleKey to valid LawRegistry entries and opens unified modal", () => {
  closeLawReference();
  try {
    for (const ruleKey of Object.values(LegalRuleKey)) {
      const mapping = LEGAL_RULE_LAW_MAP[ruleKey];
      const law = getLawEntry(mapping.lawId);
      const group = getLawGroupEntry(mapping.groupId);
      assert.equal(law.id, mapping.lawId);
      assert.equal(group.id, mapping.groupId);
      assert.equal(group.memberLawIds.includes(mapping.lawId), true);

      scrollToLegalRule(ruleKey);
      assert.equal(activeLegalRuleKey.peek(), ruleKey);
      assert.equal(activeLawModalState.peek()?.currentLawId, mapping.lawId);
      assert.equal(activeLawModalState.peek()?.activeGroupId, mapping.groupId);
    }
  }
  finally {
    closeLawReference();
  }
});

it("propagates unified parameterStore tax and planning convention overrides into Parental Leave simulations", () => {
  resetToDefaults();
  resetAllParameterOverrides();
  try {
    salaryInputMode.value = SalaryInputMode.Gross;
    husbandGross.value = toGrossSalary(5500);
    wifeGross.value = toGrossSalary(4000);
    const baselineClass3 = derivedSpousalSet.peek().husbandClass3Net;

    assert.equal(modifyParameterValue(ParameterId.Tax_HealthSupplementTotalRate, 0.045).ok, true);
    assert.equal(modifyParameterValue(ParameterId.Convention_MotherOrdinaryPlusMonths, 8).ok, true);

    assert.ok(derivedSpousalSet.peek().husbandClass3Net < baselineClass3);
    const result = statutoryOptimizedData.peek();
    assert.equal(result.configuration?.timelineConventions.motherOrdinaryPlusMonths.value, 8);
    assert.equal(result.configuration?.taxProfiles[0].parameters.healthSupplementTotalRate.value, 0.045);
    assert.equal(result.configuration?.taxProfiles[0].parameters.healthSupplementTotalRate.overridden, true);
  }
  finally {
    resetAllParameterOverrides();
    resetToDefaults();
  }
});

it("wires existingChildrenCount, childcarePlan, and inflation planning assumptions into reactive simulation results", () => {
  resetToDefaults();
  resetAllParameterOverrides();
  importSimulationState(getStandard3ChildrenPersistedState());
  try {
    const baseResult = statutoryOptimizedData.peek();
    assert.equal(existingChildrenCount.peek(), 0);
    assert.equal(childcarePlan.peek().enabled, false);
    assert.equal(indexFutureTaxBrackets.peek(), false);

    // 1. Prior living children increases statutory Kindergeld flow and clamps to 0..10
    setExistingChildrenCount(2);
    assert.equal(existingChildrenCount.peek(), 2);
    const twoPriorResult = statutoryOptimizedData.peek();
    assert.ok(twoPriorResult.summary.totalKindergeld > baseResult.summary.totalKindergeld);

    setExistingChildrenCount(99);
    assert.equal(existingChildrenCount.peek(), 10);
    setExistingChildrenCount(-3);
    assert.equal(existingChildrenCount.peek(), 0);

    // 2. Enabling Kita fee schedule produces outflows and § 10(1)5 EStG tax deductions
    updateChildcarePlan({
      enabled: true,
      presetId: FederalStateKitaPresetId.Custom,
      customMonthlyFeePerChild: toEuroAmount(400),
      startAgeMonths: 12,
      endAgeMonths: 48,
    });
    const kitaResult = statutoryOptimizedData.peek();
    assert.ok((kitaResult.summary.totalChildcareFees ?? 0) > 0);
    assert.ok((kitaResult.summary.childcareTaxDeductionTotal ?? 0) > 0);
    assert.ok(kitaResult.summary.grandTotal < twoPriorResult.summary.grandTotal);

    // 3. CPI inflation & wage growth affect real purchasing power and nominal salaries
    assert.equal(modifyParameterValue(ParameterId.Planning_AnnualInflationRate, 0.03).ok, true);
    assert.equal(modifyParameterValue(ParameterId.Planning_AnnualWageGrowthRate, 0.02).ok, true);
    setIndexFutureTaxBrackets(true);
    assert.equal(indexFutureTaxBrackets.peek(), true);

    const inflResult = statutoryOptimizedData.peek();
    assert.equal(inflResult.summary.inflationRateApplied, 0.03);
    assert.ok(inflResult.summary.totalSalaries > kitaResult.summary.totalSalaries);
    assert.ok((inflResult.summary.realGrandTotal ?? 0) < inflResult.summary.grandTotal);

    // 4. Snapshot roundtrip via getCurrentPersistedState / importSimulationState & resetToDefaults
    setExistingChildrenCount(1);
    const snapshot = getCurrentPersistedState();
    resetToDefaults();
    assert.equal(existingChildrenCount.peek(), 0);
    assert.equal(childcarePlan.peek().enabled, false);
    assert.equal(indexFutureTaxBrackets.peek(), false);

    importSimulationState(snapshot);
    assert.equal(existingChildrenCount.peek(), 1);
    assert.equal(childcarePlan.peek().enabled, true);
    assert.equal(childcarePlan.peek().customMonthlyFeePerChild, 400);
    assert.equal(indexFutureTaxBrackets.peek(), true);
  }
  finally {
    resetAllParameterOverrides();
    resetToDefaults();
  }
});

it("handles repeated husband working hours switches including 0h leave and 12x–15x annual salary counts cleanly", () => {
  resetToDefaults();
  try {
    salaryInputMode.value = SalaryInputMode.Gross;
    husbandGross.value = toGrossSalary(4000);

    // Repeated working hours transitions including 0h (Leave) must never throw
    for (const targetHours of [40, 32, 24, 0, 40, 0, 32]) {
      setHusbandHours(targetHours);
      assert.equal(husbandHours.peek(), targetHours);
      assert.equal(derivedSpousalSet.peek().husbandWeeklyHours, targetHours);

      const timeline = statutoryOptimizedData.peek();
      if (targetHours === 0) {
        assert.equal(derivedSpousalSet.peek().husbandClass3Net, 0);
        assert.equal(derivedSpousalSet.peek().husbandClass5Net, 0);
        assert.equal(timeline.months[0].husbandSalary, 0);
      }
      else {
        assert.ok(derivedSpousalSet.peek().husbandClass3Net > 0);
        assert.ok(timeline.months[0].husbandSalary > 0);
      }
    }

    // Annual salary counts 12x..15x update yearly gross, bonus presets, and enable13thSalary atomically
    setHusbandSalariesCount(AnnualSalariesCount.Thirteen);
    assert.equal(husbandSalariesCount.peek(), AnnualSalariesCount.Thirteen);
    assert.equal(husbandGrossYearly.peek(), 52000);
    assert.equal(enable13thSalary.peek(), true);
    assert.equal(husbandBonusPreset.peek(), BonusDistributionPreset.Ratio40_60);

    setHusbandBonusPreset(BonusDistributionPreset.Ratio50_50);
    assert.equal(husbandBonusPreset.peek(), BonusDistributionPreset.Ratio50_50);

    setHusbandSalariesCount(AnnualSalariesCount.Fourteen);
    assert.equal(husbandSalariesCount.peek(), AnnualSalariesCount.Fourteen);
    assert.equal(husbandGrossYearly.peek(), 56000);
    assert.equal(husbandBonusPreset.peek(), BonusDistributionPreset.Double100_100);

    setHusbandSalariesCount(AnnualSalariesCount.Fifteen);
    assert.equal(husbandSalariesCount.peek(), AnnualSalariesCount.Fifteen);
    assert.equal(husbandGrossYearly.peek(), 60000);
    assert.equal(husbandBonusPreset.peek(), BonusDistributionPreset.Triple100_100_100);

    setHusbandSalariesCount(AnnualSalariesCount.Twelve);
    assert.equal(husbandSalariesCount.peek(), AnnualSalariesCount.Twelve);
    assert.equal(husbandGrossYearly.peek(), 48000);
    assert.equal(enable13thSalary.peek(), false);
  }
  finally {
    resetToDefaults();
  }
});
