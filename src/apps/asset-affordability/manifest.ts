import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const assetAffordabilityApp = {
  id: AppId.AssetAffordability,
  title: "Purchases, Housing, Cars & Solar Affordability",
  description: "Compare upfront costs, sale proceeds, ongoing monthly expenses and solar savings across major purchases with single-counted cash tracking.",
  category: CalculatorCategory.Money,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "Upfront liquidity gap vs. available savings across housing, cars and solar",
    "Ongoing monthly burden minus solar/efficiency savings as % of net income",
    "Single-counting link check and direct links to Mortgage, Car & Solar tools",
  ],
  keywords: [
    "Purchases",
    "Housing",
    "Car",
    "Solar",
    "PV",
    "Affordability",
    "Ownership",
    "Upfront",
    "Budget",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
