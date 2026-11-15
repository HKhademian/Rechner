import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
} from "#/apps/appDefinition.ts";

export const solarEnergyApp = {
  id: AppId.SolarEnergy,
  title: "Solar Savings Calculator",
  description: "Estimate rooftop solar electricity savings, feed-in income, tax relief, and payback time.",
  category: CalculatorCategory.Everyday,
  features: [
    "Self-use savings and feed-in income",
    "Zero-VAT and tax-exemption checks",
    "20-year payback estimate",
  ],
  keywords: [
    "Solar",
    "PV",
    "Photovoltaik",
    "EEG",
    "Einspeisevergütung",
    "UStG",
    "Zero VAT",
    "Payback",
    "Clean Energy",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
