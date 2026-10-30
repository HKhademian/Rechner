import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  toEuroAmount,
  toFullCalendarYear,
  toCalendarMonth,
  toChildIndex,
} from "#engine/types";
import {
  computeAnnualTaxSettlement,
} from "#engine/tax/annualTaxSettlement";

const base = { calendarYear: toFullCalendarYear(2026),
  taxableIncome: toEuroAmount(40000),
  progressionIncome: toEuroAmount(10000),
  withheldIncomeTax: toEuroAmount(5000),
  withheldSolidarity: toEuroAmount(0),
  children: [] };

it("returns a refund, repayment or zero from actual credits and annual liability", () => {
  // Independently worked §32a/§32b: 5700/50000 ×40000=4560; 5000-4560=440.
  const refund = computeAnnualTaxSettlement(base);
  assert.equal(refund.incomeTaxLiability, 4560);
  assert.equal(refund.settlement, 440);
  assert.equal(computeAnnualTaxSettlement({ ...base,
    withheldIncomeTax: toEuroAmount(4000) }).settlement, -560);
  assert.equal(computeAnnualTaxSettlement({ ...base,
    withheldIncomeTax: toEuroAmount(4560) }).settlement, 0);
  const zero = computeAnnualTaxSettlement({ ...base,
    taxableIncome: toEuroAmount(0),
    progressionIncome: toEuroAmount(0),
    withheldIncomeTax: toEuroAmount(0) });
  assert.equal(zero.settlement, 0);
});

it("keeps child favorability and solidarity relief separate", () => {
  // EStG §§31,32; SolzG §3(2). Independent 2026 arithmetic:
  // ESt44928 without child,40830 with9756 allowance. Favorable final ESt40830+3108=43938.
  // Soli uses40830: (40830-40700)×.119=15.47. 44100-43953.47=146.53 refund.
  const result = computeAnnualTaxSettlement({ ...base,
    taxableIncome: toEuroAmount(160000),
    progressionIncome: toEuroAmount(0),
    withheldIncomeTax: toEuroAmount(44000),
    withheldSolidarity: toEuroAmount(100),
    children: [{ childIndex: toChildIndex(1),
      birthCalendarYear: toFullCalendarYear(2025),
      birthCalendarMonth: toCalendarMonth(1) }] });
  assert.equal(result.incomeTaxLiability, 43938);
  assert.equal(result.solidarityLiability, 15.47);
  assert.equal(result.totalLiability, 43953.47);
  assert.equal(result.settlement, 146.53);
  assert.equal(result.taxableIncomeForNonTaxLaw, 150244);
});

it("records statutory credit rounding separately from actual cents withheld", () => {
  // EStG §36(3): https://www.gesetze-im-internet.de/estg/__36.html
  const result = computeAnnualTaxSettlement({ ...base,
    withheldIncomeTax: toEuroAmount(5000.01) });
  assert.equal(result.withheldIncomeTax, 5000.01);
  assert.equal(result.creditedIncomeTax, 5001);
  assert.equal(result.creditRoundingAdjustment, 0.99);
  assert.equal(result.settlement, 441);
  assert.throws(() => computeAnnualTaxSettlement({ ...base,
    withheldIncomeTax: toEuroAmount(-1) }), TypeError);
});
