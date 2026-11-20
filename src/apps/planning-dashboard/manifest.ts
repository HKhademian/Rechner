import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const planningDashboardApp = {
  id: AppId.PlanningDashboard,
  title: "Life Planning Priorities & Next-Steps Dashboard",
  description: "Choose your active life situations and top priority to get ranked calculators, preparation checklists and trade-off comparisons across all standalone Rechner tools.",
  category: CalculatorCategory.Everyday,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "Priority switcher (Cash Runway, Residency, Family, Tax, Major Purchases)",
    "Ranked checklists and 5-way trade-off matrix driven by planningAssistant",
    "Intent-based quick launcher into all 10 standalone planning tools",
  ],
  keywords: [
    "Dashboard",
    "Planning",
    "Priorities",
    "Checklist",
    "Trade-offs",
    "Next Steps",
    "Life Planner",
    "Assistant",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
