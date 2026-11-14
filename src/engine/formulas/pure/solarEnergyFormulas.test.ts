import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  SolarFeedInMode,
  evaluateSolarEnergyYieldFormula,
  toSolarFeedInMode,
} from "#engine/formulas/pure/solarEnergyFormulas";
import {
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";

describe("Tier 1 Pure Solar & Green Energy Formulas (§ 48 EEG, § 3 Nr. 72 EStG, § 12 Abs. 3 UStG)", () => {
  it("validates enum parser and blends <=10 kWp and 10-40 kWp feed-in tariffs cleanly", () => {
    assert.equal(toSolarFeedInMode("partial_self_consumption"), SolarFeedInMode.PartialSelfConsumption);
    assert.throws(() => toSolarFeedInMode("off_grid"), TypeError);

    const partialResult = evaluateSolarEnergyYieldFormula({
      capacityKwp: 15,
      specificYieldKwhPerKwp: 950,
      systemCostNetEur: toEuroAmount(18000),
      annualMaintenanceEur: toEuroAmount(150),
      annualHouseholdConsumptionKwh: 5000,
      selfConsumptionShareRate: toPercentageRate(0.3),
      feedInMode: SolarFeedInMode.PartialSelfConsumption,
      gridElectricityPriceEurPerKwh: 0.37,
      eegPartialFirst10KwpEur: 0.0778,
      eegFullFirst10KwpEur: 0.1234,
      eegPartial10To40KwpEur: 0.0674,
      eegFull10To40KwpEur: 0.1035,
      incomeTaxExemptMaxKwp: 30,
      vatExemptEligible: true,
    });

    assert.equal(partialResult.annualGenerationKwh, 14250);
    assert.equal(partialResult.selfConsumedKwh, 4275);
    assert.equal(partialResult.fedInKwh, 9975);
    // (10 * 0.0778 + 5 * 0.0674) / 15 = 0.07433...
    assert.equal(partialResult.blendedFeedInTariffEurPerKwh, 0.07433);
    assert.equal(partialResult.annualSelfConsumptionSavings, 1581.75);
    assert.equal(partialResult.vatSavedAt19Percent, 3420);
    assert.equal(partialResult.isZeroVatEligible, true);
    assert.equal(partialResult.isIncomeTaxExempt, true);
    assert.ok(partialResult.twentyYearNetGain > 20000);

    const fullFeedIn35Kwp = evaluateSolarEnergyYieldFormula({
      capacityKwp: 35,
      specificYieldKwhPerKwp: 900,
      systemCostNetEur: toEuroAmount(38000),
      annualMaintenanceEur: toEuroAmount(300),
      annualHouseholdConsumptionKwh: 4500,
      selfConsumptionShareRate: toPercentageRate(0.35),
      feedInMode: SolarFeedInMode.FullFeedIn,
      gridElectricityPriceEurPerKwh: 0.37,
      eegPartialFirst10KwpEur: 0.0778,
      eegFullFirst10KwpEur: 0.1234,
      eegPartial10To40KwpEur: 0.0674,
      eegFull10To40KwpEur: 0.1035,
      incomeTaxExemptMaxKwp: 30,
      vatExemptEligible: true,
    });
    assert.equal(fullFeedIn35Kwp.selfConsumedKwh, 0);
    assert.equal(fullFeedIn35Kwp.isIncomeTaxExempt, false);
    assert.equal(fullFeedIn35Kwp.isZeroVatEligible, false);
    assert.equal(fullFeedIn35Kwp.vatSavedAt19Percent, 0);
  });
});
