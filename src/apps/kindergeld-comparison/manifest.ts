import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const kindergeldComparisonApp = {
  id: AppId.KindergeldComparison,
  title: "Kindergeld vs. Kinderfreibetrag (Günstigerprüfung)",
  description: "Check whether monthly Kindergeld (§ 66 EStG) or the annual Kinderfreibetrag (§§ 31, 32 EStG) yields a higher benefit at your joint taxable income.",
  category: CalculatorCategory.Family,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "Exact statutory Günstigerprüfung across verified EStG tax years",
    "Supports 1–6 children and mid-year prorated newborn allowance",
    "Income sensitivity table showing where Kinderfreibetrag overtakes Kindergeld",
  ],
  keywords: [
    "Kindergeld",
    "Kinderfreibetrag",
    "Günstigerprüfung",
    "Child Benefit",
    "Child Allowance",
    "Familienleistungsausgleich",
    "EStG",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
