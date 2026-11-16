import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const kitaApp = {
  id: AppId.Kita,
  title: "Kita Fee & Tax Offset",
  description: "Estimate municipal Kita care fees, non-deductible meals, and your § 10 EStG tax refund.",
  category: CalculatorCategory.Family,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "Municipal table & custom fee modes",
    "2024 (2/3) vs. 2025+ (80%) § 10 EStG deduction",
    "Net monthly cost after tax refund",
  ],
  keywords: [
    "Kita",
    "Daycare",
    "Childcare",
    "Kinderbetreuung",
    "Elternbeitrag",
    "Verpflegungsgeld",
    "Sonderausgaben",
    "EStG",
    "Tagesmutter",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
