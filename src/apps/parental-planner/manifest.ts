import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseBadge,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const parentalPlannerApp: CalculatorAppDefinition = Object.freeze({
  id: AppId.ParentalPlanner,
  title: "Parental Planner",
  description:
    "Plan Elterngeld, Mutterschutz, tax-class switches, childcare, and multi-year family cashflow with steady-salary defaults and inline statutory cross-links.",
  category: CalculatorCategory.Family,
  releaseStatus: CalculatorReleaseStatus.Published,
  releaseBadge: CalculatorReleaseBadge.New,
  features: [
    "Steady-salary baseline by default with per-section granular drill-downs",
    "Inline hover/click statutory wiki cross-links across laws, topics, constants, and formulas",
    "Full 3-scenario (C / B / A) tax class switch, § 17 BEEG vacation, Kita & annual tax settlement engine",
  ],
  keywords: [
    "elterngeld",
    "elterngeldplus",
    "parental planner",
    "elternzeit",
    "mutterschutz",
    "beeg",
    "kindergeld",
    "familiengeld",
    "kita",
  ],
});
