import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
} from "#/apps/appDefinition.ts";

export const giroCodeApp = {
  id: AppId.GiroCode,
  title: "GiroCode Generator",
  description: "Create scannable SEPA transfer QR codes for invoices and payments.",
  category: CalculatorCategory.Everyday,
  features: [
    "Instant IBAN and BIC check",
    "Ready for German banking apps",
    "Downloadable PNG payment slip",
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
