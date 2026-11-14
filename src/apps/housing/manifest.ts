import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
} from "#/apps/appDefinition.ts";

export const housingApp = {
  id: AppId.Housing,
  title: "Home Purchase & KfW 300 Planner",
  description: "Calculate closing costs across all 16 Bundesländer (§ 11 GrEStG), KfW 300 subsidized family loans, and § 35a EStG craftsmanship credits.",
  category: CalculatorCategory.Money,
  features: [
    "All 16 Bundesländer Grunderwerbsteuer",
    "KfW 300 family loan & income check",
    "§ 35a EStG 20% craftsmanship tax credit",
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
