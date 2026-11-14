import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  CommuteValuationMethod,
  VehiclePowertrain,
  evaluateCompanyCarBenefitFormula,
  toCommuteValuationMethod,
  toVehiclePowertrain,
} from "#engine/formulas/pure/companyCarFormulas";
import {
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";

describe("Tier 1 Pure Company Car Formulas (§ 6 Abs. 1 Nr. 4 & § 8 Abs. 2 EStG)", () => {
  it("validates enum parsers and computes 0.25% EV vs 0.5% over-cap vs 1.0% ICE benefit", () => {
    assert.equal(toVehiclePowertrain("pure_electric_ev"), VehiclePowertrain.PureElectricEv);
    assert.throws(() => toVehiclePowertrain("diesel"), TypeError);
    assert.equal(toCommuteValuationMethod("per_trip_0002"), CommuteValuationMethod.PerTrip0002);
    assert.throws(() => toCommuteValuationMethod("unknown"), TypeError);

    const evWithinCap = evaluateCompanyCarBenefitFormula({
      grossListPriceEur: toEuroAmount(65490), // floors to €65,400
      powertrain: VehiclePowertrain.PureElectricEv,
      commuteOneWayKm: 20,
      commuteValuationMethod: CommuteValuationMethod.MonthlyFlat003,
      commuteOfficeDaysPerMonth: 8,
      combinedMarginalTaxAndSocialRate: toPercentageRate(0.42),
      iceMonthlyRate: toPercentageRate(0.01),
      phevMonthlyRate: toPercentageRate(0.005),
      evMonthlyRate: toPercentageRate(0.0025),
      evGrossListPriceCap: toEuroAmount(100000),
      commuteMonthlyKmRate: toPercentageRate(0.0003),
      commuteDailyTripRate: toPercentageRate(0.00002),
    });
    assert.equal(evWithinCap.roundedListPrice, 65400);
    assert.equal(evWithinCap.exceedsEvQuarterRateCap, false);
    assert.equal(evWithinCap.effectiveAssessmentBasis, 16350); // 25% of 65,400
    assert.equal(evWithinCap.monthlyPrivateUseBenefit, 163.5);
    assert.equal(evWithinCap.monthlyCommuteBenefit, 98.1); // 16,350 * 0.0003 * 20
    assert.equal(evWithinCap.totalMonthlyImputedBenefit, 261.6);
    assert.equal(evWithinCap.perTripCommuteSavesMoney, true);
    assert.ok(evWithinCap.annualTaxSavingsVsIce > 3000);

    // 2024 historical €70,000 cap vs €80,000 EV drops to 0.5%
    const evOver2024Cap = evaluateCompanyCarBenefitFormula({
      grossListPriceEur: toEuroAmount(80000),
      powertrain: VehiclePowertrain.PureElectricEv,
      commuteOneWayKm: 20,
      commuteValuationMethod: CommuteValuationMethod.PerTrip0002,
      commuteOfficeDaysPerMonth: 8,
      combinedMarginalTaxAndSocialRate: toPercentageRate(0.42),
      iceMonthlyRate: toPercentageRate(0.01),
      phevMonthlyRate: toPercentageRate(0.005),
      evMonthlyRate: toPercentageRate(0.0025),
      evGrossListPriceCap: toEuroAmount(70000),
      commuteMonthlyKmRate: toPercentageRate(0.0003),
      commuteDailyTripRate: toPercentageRate(0.00002),
    });
    assert.equal(evOver2024Cap.exceedsEvQuarterRateCap, true);
    assert.equal(evOver2024Cap.privateUseRateApplied, 0.005);
    assert.equal(evOver2024Cap.effectiveAssessmentBasis, 40000);
    assert.equal(evOver2024Cap.monthlyPrivateUseBenefit, 400);
    assert.equal(evOver2024Cap.monthlyCommuteBenefit, 128); // 40,000 * 0.00002 * 20 * 8
  });
});
