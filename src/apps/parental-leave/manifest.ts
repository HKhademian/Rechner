import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
} from "#/apps/appDefinition.ts";

export const parentalLeaveApp = {
  id: AppId.ParentalLeave,
  title: "Parental Leave Planner",
  description: "Plan parental leave, benefits, work hours and household income over time.",
  category: CalculatorCategory.Family,
  features: ["Maternity and parental benefits", "Work and salary changes", "Monthly income comparison"],
  keywords: ["Elterngeld", "Elternzeit", "Rechner", "pregnancy", "birth", "family", "benefits", "parental"],
} satisfies CalculatorAppDefinition;
