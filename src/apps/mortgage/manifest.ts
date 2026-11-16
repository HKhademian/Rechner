import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const mortgageApp = {
  id: AppId.Mortgage,
  title: "Mortgage Calculator",
  description: "Estimate monthly payments, interest and the remaining balance on a fixed-rate mortgage.",
  category: CalculatorCategory.Money,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: ["Monthly bank payment", "Remaining balance", "Interest paid"],
  keywords: ["Mortgage", "Darlehen", "Baufinanzierung", "Tilgung"],
} satisfies CalculatorAppDefinition;
