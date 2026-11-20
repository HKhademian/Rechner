import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const elterngeldQuickApp = {
  id: AppId.ElterngeldQuick,
  title: "Elterngeld Quick Estimator & Income-Cap Check",
  description: "Check the €175k / €200k BEEG couple income cap and estimate monthly Basiselterngeld, ElterngeldPlus and Geschwisterbonus without setting up a multi-year timeline.",
  category: CalculatorCategory.Family,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "Date-aware BEEG couple taxable-income cap check (§ 1 Abs. 8 BEEG)",
    "Sliding-scale wage replacement rate (65%–100%), Basiselterngeld & ElterngeldPlus",
    "Part-time hours (<=32h/w) & Geschwisterbonus (§ 2a BEEG) quick calculation",
  ],
  keywords: [
    "Elterngeld",
    "Basiselterngeld",
    "ElterngeldPlus",
    "Geschwisterbonus",
    "Einkommensgrenze",
    "175000",
    "BEEG",
    "Parental Allowance",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
