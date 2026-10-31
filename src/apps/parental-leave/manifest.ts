import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
} from "#/apps/appDefinition.ts";

export const parentalLeaveApp = {
  id: AppId.ParentalLeave,
  title: "Parental Leave Planner",
  description: "Plan births, parental leave, working hours and salary changes across your household timeline.",
  category: CalculatorCategory.Family,
  features: ["Maternity and parental benefits", "Working hours and career changes", "Monthly cash flow comparisons"],
  keywords: ["Elterngeld", "Elternzeit", "Rechner", "pregnancy", "birth", "family", "benefits", "parental"],
} satisfies CalculatorAppDefinition;
