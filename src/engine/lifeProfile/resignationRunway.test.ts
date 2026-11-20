import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  toEuroCents,
} from "#engine/types";
import {
  TransitionMonthPhase,
  compareResignationScenarios,
  simulateResignationRunway,
} from "#engine/lifeProfile/resignationRunway";

it("computes savings runway with final pay, waiting period, benefit and new job", () => {
  const result = simulateResignationRunway({
    label: "Resignation with 3-month waiting period",
    openingSavingsCents: toEuroCents(1000000),
    finalPayCents: toEuroCents(200000),
    monthlyExpensesCents: toEuroCents(300000),
    jobSearchMonths: 5,
    waitingPeriodMonths: 3,
    monthlyBenefitCents: toEuroCents(180000),
    newJobMonthlyNetCents: toEuroCents(350000),
    horizonMonths: 6,
  });

  assert.equal(result.months.length, 6);
  // Month 1: 10000 + 2000 - 3000 = 9000 EUR
  assert.equal(result.months[0].phase, TransitionMonthPhase.WaitingPeriod);
  assert.equal(result.months[0].closingBalanceCents, 900000);
  // Month 2: 9000 - 3000 = 6000 EUR
  assert.equal(result.months[1].closingBalanceCents, 600000);
  // Month 3: 6000 - 3000 = 3000 EUR
  assert.equal(result.months[2].closingBalanceCents, 300000);
  // Month 4: benefit starts -> 3000 + 1800 - 3000 = 1800 EUR
  assert.equal(result.months[3].phase, TransitionMonthPhase.BenefitPeriod);
  assert.equal(result.months[3].closingBalanceCents, 180000);
  // Month 5: 1800 + 1800 - 3000 = 600 EUR
  assert.equal(result.months[4].closingBalanceCents, 60000);
  // Month 6: new job starts -> 600 + 3500 - 3000 = 1100 EUR
  assert.equal(result.months[5].phase, TransitionMonthPhase.NewJob);
  assert.equal(result.months[5].closingBalanceCents, 110000);

  assert.equal(result.minimumBalanceCents, 60000);
  assert.equal(result.endingBalanceCents, 110000);
  assert.equal(result.shortfallMonthIndex, undefined);
  assert.equal(result.solventMonths, 6);
  assert.equal(result.explanation.inputs.length, 7);
});

it("detects shortfall month and compares resignation scenarios accurately", () => {
  const results = compareResignationScenarios([
    {
      label: "No waiting period",
      openingSavingsCents: toEuroCents(500000),
      finalPayCents: toEuroCents(0),
      monthlyExpensesCents: toEuroCents(250000),
      jobSearchMonths: 4,
      waitingPeriodMonths: 0,
      monthlyBenefitCents: toEuroCents(150000),
      newJobMonthlyNetCents: toEuroCents(320000),
      horizonMonths: 6,
    },
    {
      label: "3-month waiting period",
      openingSavingsCents: toEuroCents(500000),
      finalPayCents: toEuroCents(0),
      monthlyExpensesCents: toEuroCents(250000),
      jobSearchMonths: 4,
      waitingPeriodMonths: 3,
      monthlyBenefitCents: toEuroCents(150000),
      newJobMonthlyNetCents: toEuroCents(320000),
      horizonMonths: 6,
    },
  ]);

  assert.equal(results[0].shortfallMonthIndex, undefined);
  assert.equal(results[0].solventMonths, 6);
  // Month 1: 2500, Month 2: 0, Month 3: -2500 -> shortfall in month 3
  assert.equal(results[1].shortfallMonthIndex, 3);
  assert.equal(results[1].solventMonths, 2);
  assert.equal(results[1].minimumBalanceCents, -350000);
});
