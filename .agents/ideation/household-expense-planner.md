# Household Expense Planner — standalone Rechner utility

Status: implemented as a standalone Draft (`Demo`) calculator utility at `/calculators/expense-planner/`.

- **Standalone boundary:** works completely offline without a Life Profile or timeline, backed by isolated storage (`browserAppStorage(AppId.ExpensePlanner)`) and versioned JSON export/import (`src/apps/expense-planner/expensePlannerStore.ts`).
- **Shared pure math:** reuses `closingCashBalance` from `src/engine/lifeProfile/cashFlowFormula.ts` without importing Life Profile state or other calculator stores (`src/apps/dependencyBoundaries.test.ts`).
- **Capabilities:** categorized and tagged monthly/quarterly/yearly expense line items, per-account funding & 12-month shortfall checks, category/tag breakdowns, and sustainability stress scenarios (reduced income, higher costs, combined shock, and essentials-only emergency mode).
