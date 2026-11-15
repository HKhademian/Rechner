import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const parentalLeaveApp = {
  id: AppId.ParentalLeave,
  title: "Parental Leave Planner",
  description: "Plan parental leave, benefits, work hours and household income over time.",
  category: CalculatorCategory.Family,
  releaseStatus: CalculatorReleaseStatus.Published,
  features: ["Maternity and parental benefits", "Work and salary changes", "Monthly income comparison"],
  keywords: ["Elterngeld", "Elternzeit", "Rechner", "pregnancy", "birth", "family", "benefits", "parental"],
} satisfies CalculatorAppDefinition;
