import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  createStatutoryCalculationContext,
} from "#engine/formulas/context/statutoryContext";
import {
  BlueCardEligibilityStatus,
} from "#engine/formulas/pure/visaFormulas";
import {
  evaluateUnifiedLifeProfile,
} from "#engine/lifeProfile/engine";
import {
  computeEmploymentPayroll,
} from "#engine/tax/employmentPayroll";
import {
  computePayrollTaxBase,
} from "#engine/tax/payrollTaxBase";
import {
  createTaxRulesFromContext,
} from "#engine/parameters/contextAdapters";
import {
  toSalaryPaymentCount,
} from "#engine/tax/employmentPeriod";
import {
  TaxAssessment,
} from "#engine/tax/taxAssessment";
import {
  toAgeYears,
} from "#engine/tax/taxRules";
import {
  createDefaultUnifiedLifeProfile,
  parseUnifiedLifeProfile,
} from "#engine/lifeProfile/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  SalaryPeriod,
  TaxClass,
  toChildrenCount,
  toFullCalendarYear,
  toGrossSalary,
  toMonthDuration,
} from "#engine/types";

describe("Unified General Life & Support Input Engine", () => {
  it("evaluates household tax, Blue Card, Company Car, Solar, and Housing from one shared profile", () => {
    const profile = createDefaultUnifiedLifeProfile();
    const context = createStatutoryCalculationContext({ calendarYear: toFullCalendarYear(2026) });
    const result = evaluateUnifiedLifeProfile(profile, context);

    assert.equal(result.householdTax.combinedGrossAnnualEur, 107000);
    assert.equal(result.householdTax.annualKindergeldEur, 3108); // 259 * 12
    assert.equal(result.householdPayroll.appliedTaxClassLabel, "Class IV / IV");
    assert.ok(result.householdPayroll.householdMonthlyNetEur > 5000);
    assert.ok(result.householdPayroll.householdAnnualNetEur > 60000);
    assert.equal(result.parentalLeave.primaryBasiselterngeldMonthlyEur, 1800);
    assert.equal(result.parentalLeave.siblingBonusBasisMonthlyEur, 180); // 10% of 1800
    assert.equal(result.parentalLeave.incomeCapExceeded, false);
    assert.equal(result.visa.status, BlueCardEligibilityStatus.EligibleStandard);
    assert.equal(result.visa.requiredSettlementMonths, 21);
    assert.ok(result.companyCar.annualTaxSavingsVsIce > 2500);
    assert.ok(result.solarEnergy.annualNetCashBenefit > 1000);
    assert.equal(result.housing.kfw300Eligible, true);
    assert.equal(result.housing.craftsmanTaxCreditEur, 800);
    assert.ok(result.combinedAnnualBonusAndSavingsEur > 6000);
    assert.ok(result.governingLawIds.includes(LawId.AufenthG_18g));
    assert.ok(result.governingLawIds.includes(LawId.BEEG_2));
    assert.ok(result.governingLawIds.includes(LawId.EStG_6_1_4));
    assert.ok(result.governingLawIds.includes(LawId.EEG_48));
    assert.ok(result.governingLawIds.includes(LawId.KfW_300));
  });

  it("sanitizes corrupted input payloads, disables optional perks cleanly, and enforces BEEG income cap", () => {
    const fallback = parseUnifiedLifeProfile({
      planningYear: 2024,
      primaryAnnualGrossEur: -5000,
      federalState: "NOT_A_STATE",
      hasCompanyCar: false,
      plansSolarPv: false,
      plansHomePurchase: false,
      hasPartner: false,
      dependentChildrenCount: 0,
    });
    assert.equal(fallback.planningYear, 2026);
    assert.equal(fallback.primaryAnnualGrossEur, 65000);
    assert.equal(fallback.hasCompanyCar, false);
    assert.equal(fallback.dependentChildrenCount, 0);

    const singleNoPerks = parseUnifiedLifeProfile({
      ...fallback,
      primaryAnnualGrossEur: toGrossSalary(48000),
      hasCompanyCar: false,
      plansSolarPv: false,
      plansHomePurchase: false,
      hasPartner: false,
      dependentChildrenCount: 0,
    });
    const context = createStatutoryCalculationContext({ calendarYear: toFullCalendarYear(2026) });
    const result = evaluateUnifiedLifeProfile(singleNoPerks, context);

    assert.equal(result.householdPayroll.appliedTaxClassLabel, "Class I");
    assert.equal(result.householdPayroll.partnerMonthlyNetEur, 0);
    assert.equal(result.parentalLeave.siblingBonusBasisMonthlyEur, 0);
    assert.equal(result.parentalLeave.partnerBasiselterngeldMonthlyEur, 0);
    assert.equal(result.visa.status, BlueCardEligibilityStatus.BelowThreshold);
    assert.equal(result.householdTax.annualKindergeldEur, 0);
    assert.equal(result.housing.kfw300Eligible, false);
    assert.equal(result.combinedAnnualBonusAndSavingsEur, 0);

    const highIncomeHousehold = parseUnifiedLifeProfile({
      ...fallback,
      primaryAnnualGrossEur: toGrossSalary(140000),
      partnerAnnualGrossEur: toGrossSalary(110000),
      hasPartner: true,
    });
    const capped = evaluateUnifiedLifeProfile(highIncomeHousehold, context);
    assert.equal(capped.parentalLeave.incomeCapExceeded, true);
    assert.equal(capped.parentalLeave.primaryBasiselterngeldMonthlyEur, 0);
  });

  it("evaluates unmarried cohabiting partners with Class I / I and separate individual tax bases", () => {
    const context = createStatutoryCalculationContext({ calendarYear: toFullCalendarYear(2026) });
    const married = parseUnifiedLifeProfile({
      primaryAnnualGrossEur: 90000,
      partnerAnnualGrossEur: 20000,
      hasPartner: true,
      isMarriedJointAssessment: true,
      dependentChildrenCount: 1,
    });
    const unmarried = parseUnifiedLifeProfile({
      ...married,
      isMarriedJointAssessment: false,
    });
    const marriedResult = evaluateUnifiedLifeProfile(married, context);
    const unmarriedResult = evaluateUnifiedLifeProfile(unmarried, context);

    assert.equal(marriedResult.householdPayroll.appliedTaxClassLabel, "Class IV / IV");
    assert.equal(unmarriedResult.householdPayroll.appliedTaxClassLabel, "Class I / I (unmarried)");
    // Unmarried partners lose the § 26 / § 32a Abs. 5 splitting advantage on unequal incomes
    assert.ok(unmarriedResult.householdTax.estimatedAnnualIncomeTaxEur > marriedResult.householdTax.estimatedAnnualIncomeTaxEur);
  });

  it("matches Net Pay payroll and statutory ZvE math exactly without heuristic discounts", () => {
    const context = createStatutoryCalculationContext({ calendarYear: toFullCalendarYear(2026) });
    const profile = parseUnifiedLifeProfile({
      primaryAnnualGrossEur: 60000,
      hasPartner: false,
      dependentChildrenCount: 0,
      applicantAgeYears: 32,
    });
    const lifeResult = evaluateUnifiedLifeProfile(profile, context);

    const rules = createTaxRulesFromContext(context, profile.planningYear);
    const payroll = computeEmploymentPayroll(
      {
        gross: toGrossSalary(60000),
        period: SalaryPeriod.Yearly,
        monthsWorked: toMonthDuration(12),
        annualSalaryPayments: toSalaryPaymentCount(12),
      },
      TaxClass.I,
      toChildrenCount(profile.dependentChildrenCount),
      rules,
      { isParent: false,
        ageAtYearStart: toAgeYears(profile.applicantAgeYears) },
    );
    const payrollTaxBase = computePayrollTaxBase([payroll], rules, TaxAssessment.Individual);
    assert.equal(lifeResult.householdTax.estimatedTaxableIncomeZvEEur, payrollTaxBase.taxBase?.taxableIncome);
  });
});
