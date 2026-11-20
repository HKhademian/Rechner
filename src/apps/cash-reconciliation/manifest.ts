import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const cashReconciliationApp = {
  id: AppId.CashReconciliation,
  title: "Planned vs. Actual Cash Reconciliation",
  description: "Link planned budget entries to actual receipts or transactions, inspect exact-cent variance and date shifts, and ensure settled items are counted once.",
  category: CalculatorCategory.Everyday,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "1-to-1 planned-to-actual linking prevents double-counting settled cash items",
    "Exact-cent euro variance, date-shift and direction-change comparison",
    "Reconciled net cashflow vs. naive raw total audit",
  ],
  keywords: [
    "Cash Reconciliation",
    "Planned vs Actual",
    "Budget Variance",
    "Soll Ist",
    "Receipts",
    "Double Counting",
    "Abgleich",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
