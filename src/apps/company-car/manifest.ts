import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
} from "#/apps/appDefinition.ts";

export const companyCarApp = {
  id: AppId.CompanyCar,
  title: "Company Car & EV Benefit Calculator",
  description: "Compare 1.0% ICE, 0.5% PHEV, and 0.25% EV benefit-in-kind valuations alongside 0.03% flat vs 0.002% per-trip commuting rules.",
  category: CalculatorCategory.Money,
  features: [
    "0.25% EV vs 0.5% PHEV vs 1% ICE (§ 6 EStG)",
    "BLP €100k / €70k EV cap check",
    "0.03% flat vs 0.002% commute comparison",
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
