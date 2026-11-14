import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  GERMAN_GRESTG_RATES,
  GermanFederalState,
  evaluateHousingAcquisitionFormula,
  toGermanFederalState,
} from "#engine/formulas/pure/housingFormulas";
import {
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";

describe("Tier 1 Pure Housing, GrEStG, KfW 300 & § 35a EStG Formulas", () => {
  it("covers all 16 federal states and calculates closing costs, KfW 300 limits, and § 35a credit", () => {
    assert.equal(Object.keys(GERMAN_GRESTG_RATES).length, 16);
    assert.equal(toGermanFederalState("BY"), GermanFederalState.Bayern);
    assert.throws(() => toGermanFederalState("XX"), TypeError);

    const eligibleFamily2Children = evaluateHousingAcquisitionFormula({
      purchasePriceEur: toEuroAmount(500000),
      availableEquityEur: toEuroAmount(120000),
      federalState: GermanFederalState.NordrheinWestfalen, // 6.5%
      includesBrokerCommission: true, // 3.57%
      isOwnerOccupiedNewBuildOrKfw300Standard: true,
      isQngPlusCertified: true,
      dependentChildrenCount: 2,
      priorAverageHouseholdZvEEur: toEuroAmount(98000),
      renovationLaborCostEur: toEuroAmount(7000), // caps at €1,200 credit
      marketMortgageAnnualInterestRate: toPercentageRate(0.036),
      initialAnnualRepaymentRate: toPercentageRate(0.02),
      notaryLandRegistryRate: toPercentageRate(0.02),
      buyerBrokerCommissionRate: toPercentageRate(0.0357),
      kfw300BaseIncomeLimit: toEuroAmount(90000),
      kfw300ExtraChildIncomeIncrement: toEuroAmount(10000),
      kfw300BaseLoan1To2Children: toEuroAmount(170000),
      kfw300BaseLoan3To4Children: toEuroAmount(200000),
      kfw300BaseLoan5PlusChildren: toEuroAmount(220000),
      kfw300QngLoanBonus: toEuroAmount(50000),
      craftsmanCreditRate: toPercentageRate(0.2),
      craftsmanCreditMaxAnnualEur: toEuroAmount(1200),
    });

    assert.equal(eligibleFamily2Children.transferTaxEur, 32500);
    assert.equal(eligibleFamily2Children.notaryAndRegistryEur, 10000);
    assert.equal(eligibleFamily2Children.buyerBrokerFeeEur, 17850);
    assert.equal(eligibleFamily2Children.totalClosingCostsEur, 60350);
    assert.equal(eligibleFamily2Children.totalCapitalRequirementEur, 560350);
    assert.equal(eligibleFamily2Children.totalFinancingNeededEur, 440350);
    assert.equal(eligibleFamily2Children.kfw300IncomeCeilingEur, 100000);
    assert.equal(eligibleFamily2Children.kfw300Eligible, true);
    assert.equal(eligibleFamily2Children.kfw300MaxSubsidizedLoanEur, 220000); // 170k + 50k QNG
    assert.equal(eligibleFamily2Children.remainingBankLoanEur, 220350);
    assert.equal(eligibleFamily2Children.craftsmanTaxCreditEur, 1200);

    // Zero children in Bavaria without broker is ineligible for KfW 300
    const bavariaSingle = evaluateHousingAcquisitionFormula({
      purchasePriceEur: toEuroAmount(400000),
      availableEquityEur: toEuroAmount(100000),
      federalState: GermanFederalState.Bayern, // 3.5%
      includesBrokerCommission: false,
      isOwnerOccupiedNewBuildOrKfw300Standard: true,
      isQngPlusCertified: false,
      dependentChildrenCount: 0,
      priorAverageHouseholdZvEEur: toEuroAmount(65000),
      renovationLaborCostEur: toEuroAmount(3000),
      marketMortgageAnnualInterestRate: toPercentageRate(0.036),
      initialAnnualRepaymentRate: toPercentageRate(0.02),
      notaryLandRegistryRate: toPercentageRate(0.02),
      buyerBrokerCommissionRate: toPercentageRate(0.0357),
      kfw300BaseIncomeLimit: toEuroAmount(90000),
      kfw300ExtraChildIncomeIncrement: toEuroAmount(10000),
      kfw300BaseLoan1To2Children: toEuroAmount(170000),
      kfw300BaseLoan3To4Children: toEuroAmount(200000),
      kfw300BaseLoan5PlusChildren: toEuroAmount(220000),
      kfw300QngLoanBonus: toEuroAmount(50000),
      craftsmanCreditRate: toPercentageRate(0.2),
      craftsmanCreditMaxAnnualEur: toEuroAmount(1200),
    });
    assert.equal(bavariaSingle.transferTaxEur, 14000);
    assert.equal(bavariaSingle.buyerBrokerFeeEur, 0);
    assert.equal(bavariaSingle.kfw300Eligible, false);
    assert.equal(bavariaSingle.kfw300MaxSubsidizedLoanEur, 0);
    assert.equal(bavariaSingle.craftsmanTaxCreditEur, 600);
  });
});
