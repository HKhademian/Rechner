import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const netPayApp = {
  id: AppId.NetPay,
  title: "Net Pay Calculator",
  description: "Estimate take-home pay and see how tax and social contributions affect your salary.",
  category: CalculatorCategory.Money,
  releaseStatus: CalculatorReleaseStatus.Published,
  features: ["Monthly or yearly pay", "Household comparisons", "Tax and contribution breakdown"],
  keywords: ["salary", "gross", "net", "Brutto", "Netto", "Gehalt", "Rechner", "tax", "insurance"],
} satisfies CalculatorAppDefinition;
