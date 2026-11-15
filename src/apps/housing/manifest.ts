import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
} from "#/apps/appDefinition.ts";

export const housingApp = {
  id: AppId.Housing,
  title: "Home Purchase Planner",
  description: "Estimate buying costs by state, KfW 300 family loans, and renovation tax credits.",
  category: CalculatorCategory.Money,
  features: [
    "Transfer tax for all 16 states",
    "KfW 300 family loan eligibility",
    "Renovation labor tax credit",
  ],
  keywords: [
    "Housing",
    "Immobilien",
    "Hauskauf",
    "KfW 300",
    "Grunderwerbsteuer",
    "GrEStG",
    "Kaufnebenkosten",
    "Handwerkerleistungen",
    "Mortgage",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
