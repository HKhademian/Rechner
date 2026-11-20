import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const expensePlannerApp = {
  id: AppId.ExpensePlanner,
  title: "Household Expense Planner",
  description: "Organize categorized and tagged household expenses by funding account and stress-test income or cost shocks without needing a Life Profile.",
  category: CalculatorCategory.Money,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "Categorized & tagged monthly, quarterly and yearly expenses",
    "Per-account funding & 12-month shortfall checks",
    "Sustainability stress scenarios (income drop, cost inflation, essentials-only)",
  ],
  keywords: [
    "Household",
    "Expense",
    "Budget",
    "Haushaltsbuch",
    "Accounts",
    "Tags",
    "Sustainability",
    "Cashflow",
    "Runway",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
