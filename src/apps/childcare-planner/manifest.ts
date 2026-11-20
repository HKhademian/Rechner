import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const childcarePlannerApp = {
  id: AppId.ChildcarePlanner,
  title: "Kita, Krippe & School Applications Planner",
  description: "Track shortlisted Krippe, Kita, Tagespflege and school options, monitor upcoming application and enrollment deadlines, and compare monthly fees standalone.",
  category: CalculatorCategory.Family,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "Shortlist & status tracking (Shortlisted, Applied, Waitlisted, Offered, Enrolled)",
    "Chronological application, enrollment and desired-start deadline radar",
    "Enrolled vs. shortlisted monthly and annual childcare cost totals",
  ],
  keywords: [
    "Kita",
    "Krippe",
    "Tagespflege",
    "School",
    "Grundschule",
    "Hort",
    "Childcare",
    "Enrollment",
    "Deadlines",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
