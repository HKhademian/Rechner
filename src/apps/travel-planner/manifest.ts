import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const travelPlannerApp = {
  id: AppId.TravelPlanner,
  title: "Travel Readiness & Transport Comparator",
  description: "Verify passport and German residence permit validity against trip return dates, review region entry guidance, and compare offline Car, Bus, Train and Flight estimates.",
  category: CalculatorCategory.Everyday,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "Passport 90/180-day and residence permit (eAT) return-date checks",
    "Offline Haversine Car, Bus, Train and Flight time & cost comparison",
    "Trip budget totals and destination region entry checklists",
  ],
  keywords: [
    "Travel",
    "Reise",
    "Trip",
    "Passport",
    "Visa",
    "Schengen",
    "Flight",
    "Train",
    "Transport",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
