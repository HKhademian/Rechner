import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  evaluateBlueCardEligibilityInContext,
  evaluateCompanyCarBenefitInContext,
  evaluateHousingAcquisitionInContext,
  evaluateOpportunityCardPointsInContext,
  evaluateSolarEnergyYieldInContext,
} from "#engine/formulas/context/domainEvaluators";
import {
  createStatutoryCalculationContext,
} from "#engine/formulas/context/statutoryContext";
import {
  CommuteValuationMethod,
  VehiclePowertrain,
} from "#engine/formulas/pure/companyCarFormulas";
import {
  GermanFederalState,
} from "#engine/formulas/pure/housingFormulas";
import {
  SolarFeedInMode,
} from "#engine/formulas/pure/solarEnergyFormulas";
import {
  BlueCardEligibilityStatus,
  GermanLanguageLevel,
  VisaOccupationRoute,
} from "#engine/formulas/pure/visaFormulas";
import {
  CalculationTier,
} from "#engine/formulas/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  toEuroAmount,
  toFullCalendarYear,
  toGrossSalary,
  toPercentageRate,
} from "#engine/types";

describe("Tier 2 Context-Aware Track 3 Domain Evaluators", () => {
  it("resolves year-indexed Visa, Company Car, Solar, and Housing rules with full legal provenance", () => {
    const context2024 = createStatutoryCalculationContext({ calendarYear: toFullCalendarYear(2024) });
    const context2026 = createStatutoryCalculationContext({
      calendarYear: toFullCalendarYear(2026),
      customParameterOverrides: {
        [ParameterId.Solar_GridElectricityPriceEur]: 0.4,
        [ParameterId.Housing_DefaultNotaryLandRegistryRate]: 0.02,
      },
    });

    // Visa Blue Card 2024 vs 2026 thresholds + Opportunity Card
    const blueCard2024 = evaluateBlueCardEligibilityInContext(
      {
        annualGrossSalary: toGrossSalary(46000),
        applicantAgeYears: 34,
        occupationRoute: VisaOccupationRoute.Standard,
        germanLevel: GermanLanguageLevel.B1Plus,
      },
      context2024,
    );
    assert.equal(blueCard2024.value.status, BlueCardEligibilityStatus.EligibleStandard);
    assert.equal(blueCard2024.value.requiredSettlementMonths, 21);
    assert.equal(blueCard2024.audit.tier, CalculationTier.ContextAwareStatutoryEvaluator);
    assert.ok(blueCard2024.audit.governingLawIds.includes(LawId.AufenthG_18g));

    const blueCard2026BelowStandard = evaluateBlueCardEligibilityInContext(
      {
        annualGrossSalary: toGrossSalary(46000),
        applicantAgeYears: 34,
        occupationRoute: VisaOccupationRoute.Standard,
        germanLevel: GermanLanguageLevel.A1,
      },
      context2026,
    );
    assert.equal(blueCard2026BelowStandard.value.status, BlueCardEligibilityStatus.BelowThreshold);

    const opportunityCard = evaluateOpportunityCardPointsInContext(
      {
        hasRecognizedGermanOrEquivalentDegree: false,
        hasVocationalOrPartialRecognition: true,
        germanLevel: GermanLanguageLevel.B1Plus,
        hasEnglishC1OrNative: true,
        qualifiedExperienceYears: 5,
        applicantAgeYears: 33,
        hasPriorSixMonthLegalStayInGermany: false,
        isShortageOccupation: true,
        partnerAlsoAppliesSkilled: false,
        stayDurationMonths: 12,
      },
      context2026,
    );
    assert.equal(opportunityCard.value.eligibleOverall, true);
    assert.equal(opportunityCard.value.requiredBlockedAccountTotal, 13092);

    // Company Car 2024 €70k EV cap vs 2026 €100k EV cap
    const car2024 = evaluateCompanyCarBenefitInContext(
      {
        grossListPriceEur: toEuroAmount(80000),
        powertrain: VehiclePowertrain.PureElectricEv,
        commuteOneWayKm: 15,
        commuteValuationMethod: CommuteValuationMethod.MonthlyFlat003,
        commuteOfficeDaysPerMonth: 12,
        combinedMarginalTaxAndSocialRate: toPercentageRate(0.42),
      },
      context2024,
    );
    assert.equal(car2024.value.exceedsEvQuarterRateCap, true);

    const car2026 = evaluateCompanyCarBenefitInContext(
      {
        grossListPriceEur: toEuroAmount(80000),
        powertrain: VehiclePowertrain.PureElectricEv,
        commuteOneWayKm: 15,
        commuteValuationMethod: CommuteValuationMethod.MonthlyFlat003,
        commuteOfficeDaysPerMonth: 12,
        combinedMarginalTaxAndSocialRate: toPercentageRate(0.42),
      },
      context2026,
    );
    assert.equal(car2026.value.exceedsEvQuarterRateCap, false);
    assert.equal(car2026.value.privateUseRateApplied, 0.0025);

    // Solar PV reading customizable grid price override (0.40 €/kWh)
    const solar = evaluateSolarEnergyYieldInContext(
      {
        capacityKwp: 10,
        specificYieldKwhPerKwp: 1000,
        systemCostNetEur: toEuroAmount(14000),
        annualMaintenanceEur: toEuroAmount(100),
        annualHouseholdConsumptionKwh: 4500,
        selfConsumptionShareRate: toPercentageRate(0.3),
        feedInMode: SolarFeedInMode.PartialSelfConsumption,
        vatExemptEligible: true,
      },
      context2026,
    );
    assert.equal(solar.value.selfConsumedKwh, 3000);
    assert.equal(solar.value.annualSelfConsumptionSavings, 1200);
    assert.equal(solar.audit.customOverrideApplied, true);

    // Housing + KfW 300
    const housing = evaluateHousingAcquisitionInContext(
      {
        purchasePriceEur: toEuroAmount(550000),
        availableEquityEur: toEuroAmount(110000),
        federalState: GermanFederalState.Bayern,
        includesBrokerCommission: true,
        isOwnerOccupiedNewBuildOrKfw300Standard: true,
        isQngPlusCertified: false,
        dependentChildrenCount: 2,
        priorAverageHouseholdZvEEur: toEuroAmount(95000),
        renovationLaborCostEur: toEuroAmount(6000),
        marketMortgageAnnualInterestRate: toPercentageRate(0.036),
        initialAnnualRepaymentRate: toPercentageRate(0.02),
      },
      context2026,
    );
    assert.equal(housing.value.kfw300Eligible, true);
    assert.equal(housing.value.kfw300MaxSubsidizedLoanEur, 170000);
    assert.equal(housing.value.craftsmanTaxCreditEur, 1200);
    assert.ok(housing.audit.governingLawIds.includes(LawId.KfW_300));
  });
});
