import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const commuterAllowanceApp = {
  id: AppId.CommuterAllowance,
  title: "Commuter & JobTicket",
  description: "Compare daily commuter allowances (§ 9 EStG), Homeoffice-Pauschale, and tax-free JobTickets.",
  category: CalculatorCategory.Money,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "2025 tiered vs. 2026 uniform €0.38/km from km 1",
    "€1,230 Arbeitnehmer-Pauschbetrag threshold test",
    "§ 3 Nr. 15 JobTicket vs. self-paid D-Ticket",
  ],
  keywords: [
    "Commuter",
    "Pendlerpauschale",
    "Entfernungspauschale",
    "JobTicket",
    "Deutschlandticket",
    "Homeoffice",
    "Werbungskosten",
    "Pauschbetrag",
    "EStG",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
