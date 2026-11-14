import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
} from "#/apps/appDefinition.ts";

export const giroCodeApp = {
  id: AppId.GiroCode,
  title: "SEPA GiroCode Generator",
  description: "Generate EPC069-12 V002 compliant SEPA QR payment codes locally in your browser.",
  category: CalculatorCategory.Everyday,
  features: [
    "EPC069-12 V002 & Level M QR",
    "IBAN MOD-97 & BIC validation",
    "PNG payment slip & payload export",
  ],
  keywords: [
    "GiroCode",
    "SEPA",
    "QR",
    "IBAN",
    "BIC",
    "Überweisung",
    "Zahlung",
    "EPC069-12",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
