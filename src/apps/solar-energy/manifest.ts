import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
} from "#/apps/appDefinition.ts";

export const solarEnergyApp = {
  id: AppId.SolarEnergy,
  title: "Solar PV & EEG Feed-In Calculator",
  description: "Model rooftop solar PV electricity savings, capacity-tiered § 48 EEG feed-in revenue, 0% VAT relief, and 20-year payback.",
  category: CalculatorCategory.Everyday,
  features: [
    "Capacity-tiered § 48 EEG feed-in rates",
    "0% VAT purchase relief (§ 12 Abs. 3 UStG)",
    "Income tax exemption ≤ 30 kWp (§ 3 Nr. 72)",
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
