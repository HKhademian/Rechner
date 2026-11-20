import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  ExpenseCadence,
  ExpenseCategory,
  toExpenseItemId,
  toFundingAccountId,
} from "#/apps/expense-planner/expensePlannerEngine.ts";
import {
  addExpenseItem,
  addFundingAccount,
  expensePlanEvaluation,
  expensePlannerState,
  exportExpensePlannerJson,
  importExpensePlannerJson,
  removeExpenseItem,
  removeFundingAccount,
  resetExpensePlanner,
  updateStressControls,
} from "#/apps/expense-planner/expensePlannerStore.ts";
import {
  toEuroCents,
} from "#engine/types";

describe("expensePlannerStore", () => {
  it("adds/removes accounts and items, updates stress controls, and round-trips versioned JSON", () => {
    resetExpensePlanner();
    const initialCount = expensePlannerState.value.items.length;
    const newAccId = toFundingAccountId("acc-savings");
    addFundingAccount({
      id: newAccId,
      name: "Holiday Buffer",
      monthlyInflowCents: toEuroCents(20000),
      openingBalanceCents: toEuroCents(100000),
    });
    const newItemId = toExpenseItemId("item-streaming");
    addExpenseItem({
      id: newItemId,
      title: "Streaming bundle",
      category: ExpenseCategory.Discretionary,
      tags: ["subscription", "media"],
      accountId: newAccId,
      amountCents: toEuroCents(3500),
      cadence: ExpenseCadence.Monthly,
      essential: false,
    });
    updateStressControls({
      customIncomePercent: 60,
      customCostPercent: 120,
      customHorizonMonths: 18,
    });

    assert.equal(expensePlannerState.value.items.length, initialCount + 1);
    assert.ok(expensePlanEvaluation.value.tagTotals.some((t) => t.tag === "subscription"));

    const exported = exportExpensePlannerJson();
    resetExpensePlanner();
    assert.equal(expensePlannerState.value.items.length, initialCount);

    assert.equal(importExpensePlannerJson(exported), true);
    assert.equal(expensePlannerState.value.items.length, initialCount + 1);
    assert.equal(expensePlannerState.value.customIncomePercent, 60);

    // Reject malformed or foreign-app import without overwriting state
    assert.equal(importExpensePlannerJson('{"app":"net-pay","version":1,"state":{}}'), false);
    assert.equal(expensePlannerState.value.items.length, initialCount + 1);

    removeFundingAccount(newAccId);
    assert.equal(expensePlannerState.value.accounts.some((a) => a.id === newAccId), false);
    removeExpenseItem(newItemId);
    assert.equal(expensePlannerState.value.items.length, initialCount);
    resetExpensePlanner();
  });
});
