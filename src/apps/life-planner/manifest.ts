import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseBadge,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const lifePlannerApp: CalculatorAppDefinition = Object.freeze({
  id: AppId.LifePlanner,
  title: "Life Planner",
  description:
    "Simulate multi-year German life events, unified payroll & annual tax settlements, liquid cash runway, net worth, and life-disaster stress tests.",
  category: CalculatorCategory.Money,
  releaseStatus: CalculatorReleaseStatus.Published,
  releaseBadge: CalculatorReleaseBadge.Beta,
  features: [
    "Unified multi-domain event timeline: career, family/Elterngeld, Kita, housing/mortgage, solar PV, travel, and residency",
    "Automatic German tax collector reconciling monthly withholding, § 32b progression, §§ 9/10/35a deductions & annual settlements in the ledger",
    "Composable Life Disaster Simulator (fired/ALG I, resignation/Sperrzeit, illness/Krankengeld) with safe rent & mortgage ceiling solver",
  ],
  keywords: [
    "life planner",
    "lebensplanung",
    "tax ledger",
    "net worth",
    "cash runway",
    "disaster simulation",
    "kündigung",
    "sperrzeit",
    "krankengeld",
    "mortgage affordability",
    "rental ceiling",
    "stress test",
  ],
});
