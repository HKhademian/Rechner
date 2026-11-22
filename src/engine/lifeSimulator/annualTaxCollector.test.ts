import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  toCalendarMonth,
  toChildIndex,
  toEuroAmount,
  toFullCalendarYear,
  toPercentageRate,
  toSimulationMonth,
} from "#engine/types";
import {
  collectAndSettleAnnualLifeTax,
} from "#engine/lifeSimulator/annualTaxCollector";
import {
  type LifeTaxTransaction,
  LifeEventDomain,
  TaxBucket,
} from "#engine/lifeSimulator/types";

function makeTx(
  bucket: TaxBucket,
  taxBasisAmount: number,
  year = 2026,
  id = "TX-1",
): LifeTaxTransaction {
  return Object.freeze({
    transactionId: id,
    month: toSimulationMonth(1),
    calendarYear: toFullCalendarYear(year),
    calendarMonth: toCalendarMonth(1),
    domain: LifeEventDomain.Tax,
    bucket,
    signedCashAmount: toEuroAmount(0),
    taxBasisAmount: toEuroAmount(taxBasisAmount),
    label: id,
  });
}

describe("lifeSimulator/annualTaxCollector", () => {
  it("applies § 9a lump sum, § 10(1)5 childcare 80%/€4,800 cap, and § 35a direct tax credits", () => {
    const year = toFullCalendarYear(2026);
    const result = collectAndSettleAnnualLifeTax({
      calendarYear: year,
      isCompleteYear: true,
      isJointAssessment: true,
      employedAdultsCount: 2,
      churchTaxRate: toPercentageRate(0),
      children: [
        {
          childIndex: toChildIndex(1),
          birthCalendarYear: toFullCalendarYear(2024),
          birthCalendarMonth: toCalendarMonth(1),
        },
      ],
      kindergeldReceived: toEuroAmount(3108),
      transactions: [
        makeTx(TaxBucket.TaxableWage, 110000, 2026, "WAGE"),
        makeTx(TaxBucket.SocialSecurity, 18000, 2026, "SOC"),
        makeTx(TaxBucket.WithheldWageTax, 21000, 2026, "WT"),
        makeTx(TaxBucket.ChildcareDeductible10_1_5, 7000, 2026, "KITA"),
        makeTx(TaxBucket.TaxCredit35a, 800, 2026, "C35A"),
      ],
    });

    // Two wage earners → § 9a lump sum is 2 * €1,230 = €2,460.
    assert.equal(result.werbungskostenApplied, 2460);
    // 80% of €7,000 = €5,600, capped at €4,800 for 1 child in 2026.
    assert.equal(result.childcareDeductibleApplied, 4800);
    // Direct § 35a credit reduces income tax liability euro-for-euro.
    assert.equal(result.taxCredit35aApplied, 800);
    assert.equal(
      result.settlementEur,
      Math.round((result.creditedWithholding - result.finalTotalTaxLiability) * 100) / 100,
    );
  });

  it("applies § 32b progression tax for Elterngeld/ALG I and produces Nachzahlung when under-withheld", () => {
    const year = toFullCalendarYear(2026);
    const withoutProgression = collectAndSettleAnnualLifeTax({
      calendarYear: year,
      isCompleteYear: true,
      isJointAssessment: true,
      employedAdultsCount: 2,
      churchTaxRate: toPercentageRate(0),
      children: [],
      kindergeldReceived: toEuroAmount(0),
      transactions: [
        makeTx(TaxBucket.TaxableWage, 80000, 2026, "WAGE"),
        makeTx(TaxBucket.SocialSecurity, 14000, 2026, "SOC"),
        makeTx(TaxBucket.WithheldWageTax, 10000, 2026, "WT"),
      ],
    });

    const withProgression = collectAndSettleAnnualLifeTax({
      calendarYear: year,
      isCompleteYear: true,
      isJointAssessment: true,
      employedAdultsCount: 2,
      churchTaxRate: toPercentageRate(0),
      children: [],
      kindergeldReceived: toEuroAmount(0),
      transactions: [
        makeTx(TaxBucket.TaxableWage, 80000, 2026, "WAGE"),
        makeTx(TaxBucket.SocialSecurity, 14000, 2026, "SOC"),
        makeTx(TaxBucket.WithheldWageTax, 10000, 2026, "WT"),
        makeTx(TaxBucket.ProgressionBenefit32b, 18000, 2026, "EG"),
      ],
    });

    assert.ok(
      withProgression.incomeTaxLiability > withoutProgression.incomeTaxLiability,
      "§ 32b progression benefits must increase effective income tax liability",
    );
    assert.ok(
      withProgression.settlementEur < withoutProgression.settlementEur,
      "Higher progression tax must reduce refund or increase Nachzahlung",
    );
  });

  it("applies Sparer-Pauschbetrag and Abgeltungsteuer on capital income for single assessment", () => {
    const year = toFullCalendarYear(2026);
    const result = collectAndSettleAnnualLifeTax({
      calendarYear: year,
      isCompleteYear: true,
      isJointAssessment: false,
      employedAdultsCount: 1,
      churchTaxRate: toPercentageRate(0),
      children: [],
      kindergeldReceived: toEuroAmount(0),
      transactions: [
        makeTx(TaxBucket.TaxableWage, 60000, 2026, "WAGE"),
        makeTx(TaxBucket.SocialSecurity, 11000, 2026, "SOC"),
        makeTx(TaxBucket.WithheldWageTax, 10500, 2026, "WT"),
        makeTx(TaxBucket.CapitalGains, 3000, 2026, "CAP"),
      ],
    });

    // (€3,000 − €1,000 Sparer-Pauschbetrag) * 26.375% = €527.50
    assert.equal(result.capitalGainsTax, 527.5);
  });
});
