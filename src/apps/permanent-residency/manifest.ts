import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const permanentResidencyApp = {
  id: AppId.PermanentResidency,
  title: "Permanent Residency (Niederlassungserlaubnis) Planner",
  description: "Estimate earliest § 18c AufenthG application dates across EU Blue Card and skilled-worker routes, monitor permit expiries, absences and evidence readiness.",
  category: CalculatorCategory.Everyday,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "EU Blue Card (21 / 27 mo) and Skilled Worker (24 / 36 mo) § 18c routes",
    "Permit expiry alerts and >=180-day absence continuity checks",
    "Evidence checklist and full statutory explanation panel",
  ],
  keywords: [
    "Permanent Residency",
    "Niederlassungserlaubnis",
    "AufenthG",
    "18c",
    "Blue Card",
    "Visa",
    "Ausländerbehörde",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
