import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
} from "#/apps/appDefinition.ts";

export const visaApp = {
  id: AppId.Visa,
  title: "EU Blue Card & Visa Planner",
  description: "Check EU Blue Card salary thresholds, permanent residency timelines, age-45 gates, and Opportunity Card points.",
  category: CalculatorCategory.Everyday,
  features: [
    "EU Blue Card standard vs shortage (§ 18g)",
    "21 vs 27 mo settlement tracker (§ 18c)",
    "Opportunity Card points & funds (§ 20a)",
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
