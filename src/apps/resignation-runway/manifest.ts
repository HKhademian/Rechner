import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const resignationRunwayApp = {
  id: AppId.ResignationRunway,
  title: "Resignation & Transition Runway",
  description: "Compare liquid savings runway across job changes, notice payouts, waiting periods (Sperrzeit) and estimated benefits without needing a Life Profile.",
  category: CalculatorCategory.Money,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "Final pay / severance, job-search length and benefit timing",
    "Side-by-side comparison of waiting periods and longer searches",
    "Month-by-month exact-cent cash balance carry and explanation",
  ],
  keywords: [
    "Resignation",
    "Kündigung",
    "Sperrzeit",
    "ALG I",
    "Runway",
    "Savings",
    "Job Change",
    "Sabbatical",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
