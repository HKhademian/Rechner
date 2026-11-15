import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const companyCarApp = {
  id: AppId.CompanyCar,
  title: "Company Car Calculator",
  description: "Compare tax on electric, hybrid, and fuel company cars, including your commute.",
  category: CalculatorCategory.Money,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "Electric, hybrid, and fuel car tax",
    "Electric vehicle price-cap check",
    "Monthly vs. per-trip commute tax",
  ],
  keywords: [
    "Company Car",
    "Dienstwagen",
    "Firmenwagen",
    "EV",
    "Elektroauto",
    "0.25%",
    "geldwerter Vorteil",
    "Fahrtenbuch",
    "EStG",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
