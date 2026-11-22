import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  LoanRepaymentMethod,
  projectKfwLoan,
  toGraceYears,
} from "#/apps/mortgage/financingProjection.ts";
import {
  projectMortgage,
  toMortgageYears,
} from "#/apps/mortgage/mortgageCalculation.ts";
import {
  DEFAULT_KFW_300_PRESET,
  KFW_300_PRESETS,
  KfwLoanPhase,
  buildCombinedMortgageSchedule,
  buildTermSensitivityPoints,
  estimateIllustrativeKfw300Monthly,
} from "#/apps/mortgage/mortgageSchedule.ts";
import {
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";

describe("mortgageSchedule combined Bank + KfW monthly/annual ledger engine", () => {
  it("matches projectMortgage and projectKfwLoan balances and interest to the exact cent", () => {
    const bankPrincipal = toEuroAmount(250000);
    const bankRate = toPercentageRate(0.036);
    const bankRepay = toPercentageRate(0.02);
    const kfwTerms = {
      principal: toEuroAmount(170000),
      annualInterest: toPercentageRate(0.015),
      term: toMortgageYears(35),
      grace: toGraceYears(5),
      method: LoanRepaymentMethod.Annuity,
    };
    const horizon = toMortgageYears(10);

    const bankRef = projectMortgage(bankPrincipal, bankRate, bankRepay, horizon);
    const kfwRef = projectKfwLoan(kfwTerms, horizon);
    const schedule = buildCombinedMortgageSchedule(
      {
        principal: bankPrincipal,
        annualInterest: bankRate,
        initialRepayment: bankRepay,
      },
      kfwTerms,
      horizon,
    );

    assert.equal(schedule.years.length, 10);
    assert.equal(schedule.months.length, 120);

    const lastYear = schedule.years[9];
    assert.equal(lastYear.bankEndBalance, bankRef.balance);
    assert.equal(lastYear.kfwEndBalance, kfwRef.balance);
    assert.equal(lastYear.totalEndBalance, Math.round((bankRef.balance + kfwRef.balance) * 100) / 100);
    assert.equal(
      lastYear.cumulativeInterest,
      Math.round((bankRef.interestPaid + kfwRef.interestPaid) * 100) / 100,
    );

    // Years 1–5 are KfW interest-only, Year 6 jumps to amortizing repayment
    assert.equal(schedule.years[0].kfwPhase, KfwLoanPhase.InterestOnly);
    assert.equal(schedule.years[0].kfwMonthlyPayment, kfwRef.initialMonthlyPayment);
    assert.equal(schedule.years[4].milestones.some((m) => m.includes("interest-only period ends")), true);
    assert.equal(schedule.years[5].kfwPhase, KfwLoanPhase.Repaying);
    assert.equal(schedule.years[5].kfwMonthlyPayment, kfwRef.laterMonthlyPayment);
    assert.ok(schedule.years[5].totalMonthlyPayment > schedule.years[0].totalMonthlyPayment);
  });

  it("tracks balloon maturity and payoff milestones cleanly", () => {
    const kfwTerms = {
      principal: toEuroAmount(100000),
      annualInterest: toPercentageRate(0.012),
      term: toMortgageYears(2),
      grace: toGraceYears(0),
      method: LoanRepaymentMethod.Balloon,
    };

    const schedule = buildCombinedMortgageSchedule(
      {
        principal: toEuroAmount(0),
        annualInterest: toPercentageRate(0),
        initialRepayment: toPercentageRate(0),
      },
      kfwTerms,
      toMortgageYears(2),
    );

    assert.equal(schedule.years[0].kfwMonthlyPayment, 100);
    assert.equal(schedule.years[0].kfwEndBalance, 100000);
    assert.equal(schedule.years[1].kfwPhase, KfwLoanPhase.BalloonDue);
    assert.equal(schedule.years[1].kfwEndBalance, 0);
    assert.equal(schedule.years[1].milestones.some((m) => m.includes("balloon")), true);
    assert.equal(schedule.years[1].months[11].kfwPayment, 100100);
  });

  it("generates monotonic term sensitivity curves, blended rates, and Munich regional presets", async () => {
    const {
      MUNICH_SCENARIO_PRESETS,
      calculateBlendedAnnualRate,
    } = await import("#/apps/mortgage/mortgageSchedule.ts");
    const points = buildTermSensitivityPoints(toEuroAmount(300000), toPercentageRate(0.036), 10, 35, 5);
    assert.equal(points.length, 6);
    assert.ok(points[0].monthlyPayment > points[5].monthlyPayment);
    assert.ok(points[0].totalInterest < points[5].totalInterest);

    const preview = estimateIllustrativeKfw300Monthly(toEuroAmount(170000), DEFAULT_KFW_300_PRESET);
    assert.ok(preview.initialMonthly > 0);
    assert.ok(preview.laterMonthly > preview.initialMonthly);
    assert.equal(KFW_300_PRESETS.length, 5);
    assert.equal(MUNICH_SCENARIO_PRESETS.length, 4);

    // Munich worked example: €430k @ 3.60% + €170k @ 0.01% => ~2.58% blended
    const blended = calculateBlendedAnnualRate(
      toEuroAmount(430000),
      toPercentageRate(0.036),
      toEuroAmount(170000),
      toPercentageRate(0.0001),
    );
    assert.ok(blended !== null && Math.abs(blended - 0.025828) < 0.0002);
  });
});
