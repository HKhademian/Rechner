import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  BlueCardEligibilityStatus,
  GermanLanguageLevel,
  VisaOccupationRoute,
  evaluateBlueCardEligibilityFormula,
  evaluateOpportunityCardPointsFormula,
  toGermanLanguageLevel,
  toVisaOccupationRoute,
} from "#engine/formulas/pure/visaFormulas";
import {
  toEuroAmount,
  toGrossSalary,
} from "#engine/types";

describe("Tier 1 Pure Visa & Residence Formulas (AufenthG)", () => {
  it("validates enum parsers and evaluates § 18g EU Blue Card standard vs shortage routes", () => {
    assert.equal(toVisaOccupationRoute("standard"), VisaOccupationRoute.Standard);
    assert.throws(() => toVisaOccupationRoute("unknown"), TypeError);
    assert.equal(toGermanLanguageLevel("b1_plus"), GermanLanguageLevel.B1Plus);
    assert.throws(() => toGermanLanguageLevel("c9"), TypeError);

    const standardEligible = evaluateBlueCardEligibilityFormula({
      annualGrossSalary: toGrossSalary(55000),
      applicantAgeYears: 32,
      occupationRoute: VisaOccupationRoute.Standard,
      germanLevel: GermanLanguageLevel.B1Plus,
      blueCardStandardSalaryThreshold: toEuroAmount(50700),
      blueCardShortageSalaryThreshold: toEuroAmount(45934.2),
      age45MinimumSalaryFloor: toEuroAmount(55770),
      settlementMonthsA1: 27,
      settlementMonthsB1: 21,
      opportunityCardMonthlyFunds: toEuroAmount(1091),
    });
    assert.equal(standardEligible.status, BlueCardEligibilityStatus.EligibleStandard);
    assert.equal(standardEligible.isEligible, true);
    assert.equal(standardEligible.salarySurplusOrShortfall, 4300);
    assert.equal(standardEligible.shortfallToStandard, 0);
    assert.equal(standardEligible.age45PensionProofRequired, false);
    assert.equal(standardEligible.requiredSettlementMonths, 21);
    assert.equal(standardEligible.settlementMonthsSavedByB1, 6);
    assert.equal(standardEligible.opportunityCardAnnualBlockedAccount, 13092);

    const shortageEligible = evaluateBlueCardEligibilityFormula({
      annualGrossSalary: toGrossSalary(47000),
      applicantAgeYears: 46,
      occupationRoute: VisaOccupationRoute.ShortageOrGraduate,
      germanLevel: GermanLanguageLevel.A1,
      blueCardStandardSalaryThreshold: toEuroAmount(50700),
      blueCardShortageSalaryThreshold: toEuroAmount(45934.2),
      age45MinimumSalaryFloor: toEuroAmount(55770),
      settlementMonthsA1: 27,
      settlementMonthsB1: 21,
      opportunityCardMonthlyFunds: toEuroAmount(1091),
    });
    assert.equal(shortageEligible.status, BlueCardEligibilityStatus.EligibleShortageOrGraduate);
    assert.equal(shortageEligible.isEligible, true);
    assert.equal(shortageEligible.age45PensionProofRequired, true);
    assert.equal(shortageEligible.requiredSettlementMonths, 27);
    assert.equal(shortageEligible.shortfallToStandard, 3700);

    const rejected = evaluateBlueCardEligibilityFormula({
      annualGrossSalary: toGrossSalary(42000),
      applicantAgeYears: 29,
      occupationRoute: VisaOccupationRoute.ShortageOrGraduate,
      germanLevel: GermanLanguageLevel.A1,
      blueCardStandardSalaryThreshold: toEuroAmount(50700),
      blueCardShortageSalaryThreshold: toEuroAmount(45934.2),
      age45MinimumSalaryFloor: toEuroAmount(55770),
      settlementMonthsA1: 27,
      settlementMonthsB1: 21,
      opportunityCardMonthlyFunds: toEuroAmount(1091),
    });
    assert.equal(rejected.status, BlueCardEligibilityStatus.BelowThreshold);
    assert.equal(rejected.isEligible, false);
    assert.equal(rejected.salarySurplusOrShortfall, -3934.2);
  });

  it("computes § 20a Opportunity Card points and blocked-account subsistence totals", () => {
    const qualifiedPoints = evaluateOpportunityCardPointsFormula({
      hasRecognizedGermanOrEquivalentDegree: false,
      hasVocationalOrPartialRecognition: true,
      germanLevel: GermanLanguageLevel.A2, // +1
      hasEnglishC1OrNative: true, // +1
      qualifiedExperienceYears: 3, // +2
      applicantAgeYears: 32, // +2
      hasPriorSixMonthLegalStayInGermany: false,
      isShortageOccupation: true, // +1
      partnerAlsoAppliesSkilled: false,
      stayDurationMonths: 12,
      monthlySubsistenceFunds: toEuroAmount(1091),
    });
    assert.equal(qualifiedPoints.totalPoints, 11);
    assert.equal(qualifiedPoints.eligibleViaPoints, true);
    assert.equal(qualifiedPoints.eligibleOverall, true);
    assert.equal(qualifiedPoints.requiredBlockedAccountTotal, 13092);

    const directTrack = evaluateOpportunityCardPointsFormula({
      hasRecognizedGermanOrEquivalentDegree: true,
      hasVocationalOrPartialRecognition: false,
      germanLevel: GermanLanguageLevel.NoneOrBasic,
      hasEnglishC1OrNative: false,
      qualifiedExperienceYears: 1,
      applicantAgeYears: 42,
      hasPriorSixMonthLegalStayInGermany: false,
      isShortageOccupation: false,
      partnerAlsoAppliesSkilled: false,
      stayDurationMonths: 6,
      monthlySubsistenceFunds: toEuroAmount(1091),
    });
    assert.equal(directTrack.directSkilledWorkerTrack, true);
    assert.equal(directTrack.eligibleOverall, true);
    assert.equal(directTrack.requiredBlockedAccountTotal, 6546);
  });
});
