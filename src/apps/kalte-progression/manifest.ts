import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const kalteProgressionApp = {
  id: AppId.KalteProgression,
  title: "Kalte Progression & Purchasing Power Simulator",
  description: "Simulate multi-year real purchasing power under inflation and nominal wage growth, comparing frozen tax brackets (kalte Progression) against indexed brackets (Inflationsausgleich).",
  category: CalculatorCategory.Money,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "1–10 year nominal vs. real purchasing power projection",
    "Quantifies fiscal drag (kalte Progression) vs. indexed § 32a EStG brackets",
    "Reuses Rechner's verified Inflationsausgleich & CPI discounting formulas",
  ],
  keywords: [
    "Kalte Progression",
    "Inflation",
    "Purchasing Power",
    "Kaufkraft",
    "Inflationsausgleich",
    "Bracket Creep",
    "Fiscal Drag",
    "Wage Growth",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
