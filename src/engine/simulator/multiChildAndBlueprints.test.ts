import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  runScenarioBatches,
} from "#engine/simulator/timelineGenerator";
import {
  type PregnancyAction,
  type ScenarioActionBatches,
  FederalStateKitaPresetId,
  SalaryInputMode,
  ScenarioId,
  SpecialEventCategory,
  TaxClass,
  TransactionType,
  toCalendarMonth,
  toChildIndex,
  toChildrenCount,
  toEuroAmount,
  toFullCalendarYear,
  toGrossSalary,
  toMonthDuration,
  toNetSalary,
  toPercentageRate,
  toPregnancyId,
  toSimulationMonth,
  toWorkingHours,
} from "#engine/types";
import {
  standardPreexistingConditions,
} from "../../../test/fixture/standardHouseholds.ts";

function makePregnancy(childNumber: number, deliverySimMonth: number, startYear = 2026): PregnancyAction {
  const posSimMonth = Math.max(1, deliverySimMonth - 8);
  const totalElapsed = posSimMonth - 1;
  return {
    pregnancyId: toPregnancyId(`PREG-CHILD-${childNumber}`),
    childIndex: toChildIndex(childNumber),
    positiveTestCalendarMonth: toCalendarMonth((totalElapsed % 12) + 1),
    positiveTestCalendarYear: toFullCalendarYear(startYear + Math.floor(totalElapsed / 12)),
    positiveTestSimulationMonth: toSimulationMonth(posSimMonth),
    calculatedDeliverySimulationMonth: toSimulationMonth(deliverySimMonth),
    motherPostBirthPartTimeHours: toWorkingHours(24),
    motherPostBirthPartTimeClass5Net: toNetSalary(1600),
    motherPostBirthPartTimeClass3Net: toNetSalary(1950),
    fatherPartnerMonthsCount: toMonthDuration(2),
  };
}

describe("Track 4 Blueprints: Multi-Child (>2), Municipal Daycare (§ 10(1)5), and Inflation Mechanics", () => {
  it("models 3 and 4 sequential children with Birth 1..4 labels, Kindergeld scaling, and § 2a 2-under-6 sibling tier", () => {
    // 4 births spaced across 120 months: M12, M44, M80, M108
    // Notice at Child 3 birth (M80): Child 1 is 68mo (<72), Child 2 is 36mo (not <36, <72) -> triggers 2-under-6 § 2a tier!
    const batches: ScenarioActionBatches = {
      scenarioKey: ScenarioId.C,
      preexisting: {
        ...standardPreexistingConditions,
        startCalendarYear: toFullCalendarYear(2026),
        startCalendarMonth: toCalendarMonth(1),
        simulationDurationMonths: toMonthDuration(120),
        salaryInputMode: SalaryInputMode.Gross,
        husbandGross: toGrossSalary(6000),
        wifeGross: toGrossSalary(4000),
        husbandInitialTaxClass: TaxClass.III,
        wifeInitialTaxClass: TaxClass.V,
        enable13thSalary: false,
        husbandSalariesCount: undefined,
        wifeSalariesCount: undefined,
      },
      pregnancies: [
        makePregnancy(1, 12),
        makePregnancy(2, 44),
        makePregnancy(3, 80),
        makePregnancy(4, 108),
      ],
      taxClassSwitches: [],
      salaryRaises: [],
    };

    const result = runScenarioBatches(batches);
    assert.equal(result.months.length, 120);

    // Birth labels for all 4 children
    assert.ok(result.months[11].relativeMonthLabel.includes("Birth 1"));
    assert.ok(result.months[43].relativeMonthLabel.includes("Birth 2"));
    assert.ok(result.months[79].relativeMonthLabel.includes("Birth 3"));
    assert.ok(result.months[107].relativeMonthLabel.includes("Birth 4"));

    // Kindergeld scaling: 1 -> 2 -> 3 -> 4 children
    const kg = standardPreexistingConditions.kindergeldPerChild;
    assert.equal(result.months[11].kindergeld, kg);
    assert.equal(result.months[43].kindergeld, 2 * kg);
    assert.equal(result.months[79].kindergeld, 3 * kg);
    assert.equal(result.months[107].kindergeld, 4 * kg);

    // At M83 (Mother's Child 3 ElterngeldPlus start): Child 1 = 71mo (<72), Child 2 = 39mo (>=36 and <72)
    // Sibling bonus must remain active solely via the "2 older siblings under 6" rule!
    assert.equal(result.months[82].hasSiblingBonus, true);

    // SGB XI care employee discount increases linearly up to 4 children in gross payroll
    const monthPreBirth = result.months[0].payroll!.husband.careInsurance;
    const monthFourKids = result.months[108].payroll!.husband.careInsurance;
    assert.ok(monthFourKids < monthPreBirth);
  });

  it("deducts monthly municipal daycare (Kita) fees, honors sibling exemptions, and credits § 10(1)5 EStG tax relief", () => {
    const baseBatches: ScenarioActionBatches = {
      scenarioKey: ScenarioId.C,
      preexisting: {
        ...standardPreexistingConditions,
        householdTaxableIncome: undefined,
        startCalendarYear: toFullCalendarYear(2026),
        startCalendarMonth: toCalendarMonth(1),
        simulationDurationMonths: toMonthDuration(72),
        salaryInputMode: SalaryInputMode.Gross,
        husbandGross: toGrossSalary(6500),
        wifeGross: toGrossSalary(4500),
        husbandInitialTaxClass: TaxClass.III,
        wifeInitialTaxClass: TaxClass.V,
        enable13thSalary: false,
      },
      pregnancies: [makePregnancy(1, 15, 2026), makePregnancy(2, 39, 2026)],
      taxClassSwitches: [],
      salaryRaises: [],
    };

    const withoutKita = runScenarioBatches(baseBatches);
    const withKita = runScenarioBatches({
      ...baseBatches,
      preexisting: {
        ...baseBatches.preexisting,
        childcarePlan: {
          enabled: true,
          presetId: FederalStateKitaPresetId.NrwDuesseldorf,
          customMonthlyFeePerChild: toEuroAmount(0),
          startAgeMonths: 12,
          endAgeMonths: 72,
        },
      },
    });

    assert.equal(withoutKita.summary.totalChildcareFees, 0);
    assert.equal(withoutKita.summary.childcareTaxDeductionTotal, 0);

    // Child 1 born at M15 -> enters Kita at M27 (age 12mo), fee-free in NRW at M63 (age 48mo)
    assert.equal(withKita.months[25].childcareFee ?? 0, 0);
    assert.ok((withKita.months[26].childcareFee ?? 0) > 0);
    // Child 2 enters at M51 while Child 1 is 36mo -> NRW exempts Child 2 (sibling exemption) and exempts Child 1 from M63 onward!
    assert.equal(withKita.months[63].childcareFee ?? 0, 0);

    // Outflow event & accounting transaction generated cleanly
    const kitaMonth = withKita.months[26];
    assert.ok(kitaMonth.specialEvents.some((ev) => ev.category === SpecialEventCategory.ChildcareFees && ev.amount < 0));
    assert.ok(kitaMonth.transactions.some((tx) => tx.type === TransactionType.ExpenseOutflow));
    assert.ok((withKita.summary.totalChildcareFees ?? 0) > 0);

    // § 10 Abs. 1 Nr. 5 EStG lowers taxable income and yields higher net annual tax refunds
    assert.ok((withKita.summary.childcareTaxDeductionTotal ?? 0) > 0);
    assert.ok(withKita.summary.totalTaxRefunds > withoutKita.summary.totalTaxRefunds);
  });

  it("caps full-year custom § 10(1)5 childcare deduction at €4,800 per child in 2025+", () => {
    const res = runScenarioBatches({
      scenarioKey: ScenarioId.B,
      preexisting: {
        ...standardPreexistingConditions,
        householdTaxableIncome: undefined,
        startCalendarYear: toFullCalendarYear(2025),
        startCalendarMonth: toCalendarMonth(1),
        simulationDurationMonths: toMonthDuration(24),
        salaryInputMode: SalaryInputMode.Gross,
        husbandGross: toGrossSalary(6000),
        wifeGross: toGrossSalary(4000),
        enable13thSalary: false,
        childcarePlan: {
          enabled: true,
          presetId: FederalStateKitaPresetId.Custom,
          customMonthlyFeePerChild: toEuroAmount(600), // €7,200/yr paid -> 80% = €5,760, capped at €4,800
          startAgeMonths: 0,
          endAgeMonths: 72,
        },
      },
      pregnancies: [makePregnancy(1, 1, 2025)],
      taxClassSwitches: [],
      salaryRaises: [],
    });

    assert.equal(res.annualTaxRecords?.find((r) => r.calendarYear === 2025)?.childcareDeduction, 4800);
  });

  it("preserves exact nominal parity when optional inflation features are default and computes real purchasing power", () => {
    const baseBatches: ScenarioActionBatches = {
      scenarioKey: ScenarioId.C,
      preexisting: {
        ...standardPreexistingConditions,
        householdTaxableIncome: undefined,
        startCalendarYear: toFullCalendarYear(2026),
        startCalendarMonth: toCalendarMonth(1),
        simulationDurationMonths: toMonthDuration(48),
        salaryInputMode: SalaryInputMode.Gross,
        husbandGross: toGrossSalary(6000),
        wifeGross: toGrossSalary(4000),
        enable13thSalary: false,
      },
      pregnancies: [makePregnancy(1, 15, 2026)],
      taxClassSwitches: [],
      salaryRaises: [],
    };

    const omitted = runScenarioBatches(baseBatches);
    const explicitDefaults = runScenarioBatches({
      ...baseBatches,
      preexisting: {
        ...baseBatches.preexisting,
        inflationAssumptions: {
          annualInflationRate: toPercentageRate(0.02),
          annualWageGrowthRate: toPercentageRate(0),
          annualBracketIndexRate: toPercentageRate(0),
          indexFutureTaxBrackets: false,
        },
      },
    });

    assert.equal(explicitDefaults.summary.grandTotal, omitted.summary.grandTotal);
    assert.equal(explicitDefaults.summary.totalSalaries, omitted.summary.totalSalaries);
    assert.equal(explicitDefaults.summary.totalBenefits, omitted.summary.totalBenefits);
    assert.equal(explicitDefaults.months[0].purchasingPowerFactor, 1);
    assert.equal(explicitDefaults.months[0].realMonthlyTotal, explicitDefaults.months[0].monthlyTotal);
    assert.ok((explicitDefaults.months[47].purchasingPowerFactor ?? 1) < 1);
    assert.ok((explicitDefaults.summary.realGrandTotal ?? 0) < explicitDefaults.summary.grandTotal);

    // Enable 3% annual wage growth + 2.5% future-year bracket indexing (on 2027..2029 > 2026 sourceYear)
    const dynamic = runScenarioBatches({
      ...baseBatches,
      preexisting: {
        ...baseBatches.preexisting,
        existingChildrenCount: toChildrenCount(0),
        inflationAssumptions: {
          annualInflationRate: toPercentageRate(0.025),
          annualWageGrowthRate: toPercentageRate(0.03),
          annualBracketIndexRate: toPercentageRate(0.025),
          indexFutureTaxBrackets: true,
        },
      },
    });

    // Month 1 (year 0) stays untouched, Month 13+ grows nominally
    assert.equal(dynamic.months[0].husbandSalary, omitted.months[0].husbandSalary);
    assert.ok(dynamic.months[12].husbandSalary > omitted.months[12].husbandSalary);

    // Indexed-only (no wage growth) lowers future projected year (2028) income tax liability vs unindexed
    const indexedOnly = runScenarioBatches({
      ...baseBatches,
      preexisting: {
        ...baseBatches.preexisting,
        inflationAssumptions: {
          annualInflationRate: toPercentageRate(0.02),
          annualWageGrowthRate: toPercentageRate(0),
          annualBracketIndexRate: toPercentageRate(0.03),
          indexFutureTaxBrackets: true,
        },
      },
    });
    const rec2026Omitted = omitted.annualTaxRecords!.find((r) => r.calendarYear === 2026)!;
    const rec2026Indexed = indexedOnly.annualTaxRecords!.find((r) => r.calendarYear === 2026)!;
    assert.equal(rec2026Indexed.assessment?.totalLiability, rec2026Omitted.assessment?.totalLiability);

    const rec2028Omitted = omitted.annualTaxRecords!.find((r) => r.calendarYear === 2028)!;
    const rec2028Indexed = indexedOnly.annualTaxRecords!.find((r) => r.calendarYear === 2028)!;
    assert.ok(
      (rec2028Indexed.assessment?.totalLiability ?? Number.POSITIVE_INFINITY) <
      (rec2028Omitted.assessment?.totalLiability ?? 0),
    );
  });
});
