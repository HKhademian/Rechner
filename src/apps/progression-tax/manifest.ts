import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const progressionTaxApp = {
  id: AppId.ProgressionTax,
  title: "Progressionsvorbehalt (Nachzahlung) Estimator",
  description: "Calculate the extra annual income tax and estimated Nachzahlung caused by tax-free wage replacement benefits (Elterngeld, ALG I, Kurzarbeitergeld) under § 32b EStG.",
  category: CalculatorCategory.Money,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "Exact § 32b EStG special tax rate (Besonderer Steuersatz) calculation",
    "Isolates extra tax caused strictly by Elterngeld, ALG I or Mutterschaftsgeld",
    "Estimates annual refund vs. Nachzahlung against withheld Lohnsteuer",
  ],
  keywords: [
    "Progressionsvorbehalt",
    "Nachzahlung",
    "Elterngeld",
    "ALG I",
    "Kurzarbeitergeld",
    "32b",
    "EStG",
    "Steuererklärung",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
