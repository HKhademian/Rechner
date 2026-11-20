import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  toEuroCents,
} from "#engine/types";
import {
  ExpenseCadence,
  ExpenseCategory,
  evaluateExpensePlan,
  monthlyEquivalentCents,
  toExpenseItemId,
  toFundingAccountId,
} from "#/apps/expense-planner/expensePlannerEngine.ts";

it("converts cadences, aggregates categories and tags, checks per-account funding and stress scenarios", () => {
  assert.equal(monthlyEquivalentCents(toEuroCents(120000), ExpenseCadence.Yearly), 10000);
  assert.equal(monthlyEquivalentCents(toEuroCents(30000), ExpenseCadence.Quarterly), 10000);

  const jointId = toFundingAccountId("acc-joint");
  const personalId = toFundingAccountId("acc-personal");

  const result = evaluateExpensePlan({
    accounts: [
      {
        id: jointId,
        name: "Joint Household Account",
        monthlyInflowCents: toEuroCents(350000),
        openingBalanceCents: toEuroCents(500000),
      },
      {
        id: personalId,
        name: "Personal Spending Account",
        monthlyInflowCents: toEuroCents(50000),
        openingBalanceCents: toEuroCents(100000),
      },
    ],
    items: [
      {
        id: toExpenseItemId("i1"),
        title: "Warm rent",
        category: ExpenseCategory.Housing,
        tags: ["fixed", "housing"],
        accountId: jointId,
        amountCents: toEuroCents(160000),
        cadence: ExpenseCadence.Monthly,
        essential: true,
      },
      {
        id: toExpenseItemId("i2"),
        title: "Car insurance",
        category: ExpenseCategory.Insurance,
        tags: ["fixed", "car"],
        accountId: jointId,
        amountCents: toEuroCents(120000),
        cadence: ExpenseCadence.Yearly,
        essential: true,
      },
      {
        id: toExpenseItemId("i3"),
        title: "Dining & hobbies",
        category: ExpenseCategory.Discretionary,
        tags: ["flexible"],
        accountId: personalId,
        amountCents: toEuroCents(75000),
        cadence: ExpenseCadence.Monthly,
        essential: false,
      },
    ],
    scenarios: [
      {
        label: "Baseline",
        incomePercent: 100,
        costPercent: 100,
        essentialOnly: false,
        horizonMonths: 12,
      },
      {
        label: "Income -35% shock",
        incomePercent: 65,
        costPercent: 100,
        essentialOnly: false,
        horizonMonths: 12,
      },
      {
        label: "Income -35% + essentials only",
        incomePercent: 65,
        costPercent: 100,
        essentialOnly: true,
        horizonMonths: 12,
      },
    ],
  });

  // Total inflow: 4000 EUR, total expenses: 1600 + 100 + 750 = 2450 EUR
  assert.equal(result.totalMonthlyInflowCents, 400000);
  assert.equal(result.totalMonthlyExpensesCents, 245000);
  assert.equal(result.essentialMonthlyCents, 170000);
  assert.equal(result.discretionaryMonthlyCents, 75000);
  assert.equal(result.monthlyNetSurplusCents, 155000);

  // Personal account has 500 inflow vs 750 expense -> shortfall after opening 1000 is depleted (month 5)
  const personalStatus = result.accountStatuses.find((acc) => acc.accountId === personalId);
  assert.ok(personalStatus);
  assert.equal(personalStatus.fundedByInflow, false);
  assert.equal(personalStatus.firstShortfallMonth, 5);

  // Tag aggregation
  const fixedTag = result.tagTotals.find((t) => t.tag === "fixed");
  assert.equal(fixedTag?.monthlyCents, 170000);
  assert.equal(fixedTag?.itemCount, 2);

  // Stress scenarios
  assert.equal(result.scenarios[0].sustainable, true);
  assert.equal(result.scenarios[1].monthlyInflowCents, 260000);
  assert.equal(result.scenarios[1].sustainable, true);
  assert.equal(result.scenarios[2].monthlyExpenseCents, 170000);
});
