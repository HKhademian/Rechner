import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const familyMilestonesApp = {
  id: AppId.FamilyMilestones,
  title: "Family Milestones & Parental Leave Handoff",
  description: "Track household relationships, upcoming birthdays, pregnancy and birth milestones, and preview facts ready for the Parental Leave Planner.",
  category: CalculatorCategory.Family,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "Household roster with exact ages and upcoming birthday countdown",
    "Linked pregnancy, expected due date and actual birth milestone tracker",
    "Non-destructive handoff preview for Parental Leave (Elterngeld)",
  ],
  keywords: [
    "Family",
    "Birthdays",
    "Pregnancy",
    "Schwangerschaft",
    "Birth",
    "Geburt",
    "Elterngeld",
    "Parental Leave",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
