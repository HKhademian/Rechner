import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const citizenshipApp = {
  id: AppId.Citizenship,
  title: "German Citizenship (Einbürgerung) Preparation",
  description: "Track StAG § 10 / § 9 naturalization eligibility dates, 6-month absence continuity checks and the 6-item document checklist standalone.",
  category: CalculatorCategory.Everyday,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "Standard 5-year (§ 10 StAG) and Spousal 3-year (§ 9 StAG) pathways",
    "§ 12b StAG absence continuity risk check",
    "6-document naturalization readiness tracker with statutory explanation",
  ],
  keywords: [
    "Citizenship",
    "Einbürgerung",
    "StAG",
    "Naturalization",
    "German Passport",
    "B1",
    "Einbürgerungstest",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
