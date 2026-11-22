import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  toEuroAmount,
  toPercentageRate,
  toSimulationMonth,
} from "#engine/types";
import {
  simulateLifePlan,
} from "#engine/lifeSimulator/lifeSimulator";
import {
  LifePlannerPresetId,
  buildLifePlannerPreset,
} from "#engine/lifeSimulator/lifePlannerPresets";
import {
  LifeEventDomain,
  LifeEventKind,
  LifeScenarioKey,
  ResidencyPermitBaseline,
  TaxBucket,
  toLifeEventId,
} from "#engine/lifeSimulator/types";

describe("lifeSimulator/lifeSimulator", () => {
  it("preserves exact cashflow and net-worth accounting invariants across a 5-year multi-domain plan", () => {
    const plan = buildLifePlannerPreset(LifePlannerPresetId.GrowingFamilyHomePurchase);
    const result = simulateLifePlan(plan, LifeScenarioKey.Planned);

    assert.equal(result.months.length, 60);
    assert.equal(result.annualTaxRecords.length, 5);

    // Cash conservation invariant: opening + sum(monthlyNetCashflow) === endingLiquidCash.
    const sumNet = Math.round(
      result.months.reduce((acc, row) => acc + row.monthlyNetCashflow, 0) * 100,
    ) / 100;
    const expectedEndingCash = Math.round(
      (plan.baseline.openingLiquidCash + sumNet) * 100,
    ) / 100;
    assert.ok(
      Math.abs(result.summary.endingLiquidCash - expectedEndingCash) < 0.05,
      `Expected ending cash ${expectedEndingCash}, got ${result.summary.endingLiquidCash}`,
    );

    // Balance-sheet invariant in every single month: netWorth === liquidCash + assets - debt.
    for (const row of result.months) {
      const expectedNw = Math.round(
        (row.liquidCashBalance + row.totalAssetsValue - row.totalDebtBalance) * 100,
      ) / 100;
      assert.ok(
        Math.abs(row.netWorth - expectedNw) < 0.05,
        `Month ${row.month}: netWorth ${row.netWorth} != ${expectedNw}`,
      );
    }

    // Annual tax settlements must be posted in May (taxReturnMonth=5) of year+1 for years 1..4.
    const postedRecords = result.annualTaxRecords.filter((r) => r.postedInMonth !== undefined);
    assert.ok(postedRecords.length >= 4, "Expected at least 4 annual tax settlements posted within 5y horizon");
    for (const rec of postedRecords) {
      const postedRow = result.months.find((m) => m.month === rec.postedInMonth);
      assert.ok(postedRow);
      assert.equal(postedRow.calendarYear, rec.calendarYear + 1);
      assert.equal(postedRow.calendarMonth, plan.baseline.taxReturnMonth);
      assert.equal(postedRow.taxRefundOrRepayment, rec.settlementEur);
    }
  });

  it("amortizes mortgage debt and appreciates property after HomePurchase while replacing rent", () => {
    const plan = buildLifePlannerPreset(LifePlannerPresetId.GrowingFamilyHomePurchase);
    const result = simulateLifePlan(plan, LifeScenarioKey.Planned);

    const beforePurchase = result.months[28]; // month 29
    const atPurchase = result.months[29]; // month 30
    const atEnd = result.months[59]; // month 60

    assert.equal(beforePurchase.totalDebtBalance, 0);
    assert.ok(atPurchase.totalDebtBalance > 400000, "Mortgage debt must appear at purchase month");
    assert.ok(atEnd.totalDebtBalance < atPurchase.totalDebtBalance, "Mortgage principal must amortize over time");
    assert.ok(atEnd.totalAssetsValue > atPurchase.totalAssetsValue, "Property value must appreciate over time");
  });

  it("models Solar PV savings as tax-exempt (§ 3 Nr. 72 EStG) and increases liquid cash", () => {
    const basePlan = buildLifePlannerPreset(LifePlannerPresetId.YoungProfessional);
    const withSolar = Object.freeze({
      ...basePlan,
      events: Object.freeze([
        ...basePlan.events,
        {
          id: toLifeEventId("TEST-SOLAR"),
          domain: LifeEventDomain.HousingAsset,
          kind: LifeEventKind.SolarPvInstallation,
          effectiveMonth: toSimulationMonth(6),
          title: "10 kWp Solar PV",
          upfrontCapex: toEuroAmount(14000),
          monthlyElectricitySavings: toEuroAmount(180),
          monthlyFeedInRevenue: toEuroAmount(70),
          durationMonths: 240,
        },
      ]),
    });

    const baseRes = simulateLifePlan(basePlan, LifeScenarioKey.Planned);
    const solarRes = simulateLifePlan(withSolar, LifeScenarioKey.Planned);

    // Total tax paid must remain identical because Solar PV income is tax-exempt (§ 3 Nr. 72 EStG).
    assert.equal(solarRes.summary.totalNetTaxPaid, baseRes.summary.totalNetTaxPaid);
    // Ending net worth improves because 55 months * €250 = €13,750 cash + €14,000 asset > €14,000 capex.
    assert.ok(solarRes.summary.endingNetWorth > baseRes.summary.endingNetWorth);

    const month7 = solarRes.months[6];
    const solarTx = month7.transactions.find((t) => t.bucket === TaxBucket.TaxExemptInflow);
    assert.ok(solarTx);
    assert.equal(solarTx.signedCashAmount, 250);
  });

  it("models 13th salary cadence, compounding investments, opening debt amortization, and residency clock deadlines", () => {
    const basePlan = buildLifePlannerPreset(LifePlannerPresetId.YoungProfessional);
    const enrichedPlan = Object.freeze({
      ...basePlan,
      baseline: Object.freeze({
        ...basePlan.baseline,
        openingInvestmentsValue: toEuroAmount(30000),
        annualInvestmentReturnRate: toPercentageRate(0.06),
        openingDebtBalance: toEuroAmount(12000),
        openingDebtMonthlyPayment: toEuroAmount(400),
        openingDebtInterestRate: toPercentageRate(0.05),
        residencyPermit: ResidencyPermitBaseline.EuBlueCard,
        yearsInGermany: 1,
        permitExpiryMonth: toSimulationMonth(20),
        primary: Object.freeze({
          ...basePlan.baseline.primary,
          annualSalariesCount: 13,
        }),
      }),
    });

    const baseRes = simulateLifePlan(basePlan, LifeScenarioKey.Planned);
    const res = simulateLifePlan(enrichedPlan, LifeScenarioKey.Planned);

    // November (month 11, index 10) must pay strictly higher net salary due to 13th salary cadence.
    assert.ok(res.months[10].primaryNetSalary > baseRes.months[10].primaryNetSalary);

    // Opening debt (€12k at €400/mo) must amortize down to €0 before month 60 (zero double-counting).
    assert.ok(res.months[0].totalDebtBalance < 12000);
    assert.equal(res.months[59].totalDebtBalance, 0);

    // Investments (€30k at 6%/yr over 5y) must grow assets strictly above opening €10k + €30k = €40k.
    assert.ok(res.months[59].totalAssetsValue > 48000);

    // Residency clock (Blue Card, 1y in DE) must auto-generate § 18c PR (M15), Permit Expiry (M20), and § 10 StAG (M48).
    assert.ok(res.deadlines.some((d) => d.id === "DL-BASELINE-PR-18C" && d.month === 15));
    assert.ok(res.deadlines.some((d) => d.id === "DL-BASELINE-PERMIT-EXPIRY" && d.month === 20));
    assert.ok(res.deadlines.some((d) => d.id === "DL-BASELINE-CITIZEN-10STAG" && d.month === 48));
  });
});
