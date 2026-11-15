import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const visaApp = {
  id: AppId.Visa,
  title: "EU Blue Card & Visa Planner",
  description: "Check EU Blue Card salary limits, permanent residency timelines, and Opportunity Card points.",
  category: CalculatorCategory.Everyday,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "Blue Card salary eligibility",
    "Permanent residency timeline",
    "Opportunity Card points check",
  ],
  keywords: [
    "Visa",
    "Blue Card",
    "Blaue Karte",
    "AufenthG",
    "Niederlassungserlaubnis",
    "Chancenkarte",
    "Opportunity Card",
    "Settlement",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
