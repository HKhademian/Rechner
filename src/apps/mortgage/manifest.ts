import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const mortgageApp = {
  id: AppId.Mortgage,
  title: "Mortgage Simulator",
  description: "Explore bank and KfW repayments, loan-to-value and household affordability.",
  category: CalculatorCategory.Money,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: ["Bank and KfW payments", "Loan-to-value and balances", "Affordability estimate"],
  keywords: ["Mortgage", "Darlehen", "Baufinanzierung", "Tilgung"],
} satisfies CalculatorAppDefinition;
