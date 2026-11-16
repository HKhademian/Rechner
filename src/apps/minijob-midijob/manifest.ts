import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const minijobMidijobApp = {
  id: AppId.MinijobMidijob,
  title: "Minijob & Midijob Calculator",
  description: "Compare Minijob limits, Midijob sliding social contributions (§ 20 SGB IV), and net pay.",
  category: CalculatorCategory.Money,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "Year-exact €538–€633 Minijob threshold",
    "Midijob reduced contributions, full pension credit",
    "Corridor milestone net comparison",
  ],
  keywords: [
    "Minijob",
    "Midijob",
    "Übergangsbereich",
    "Gleitzone",
    "SGB IV",
    "556",
    "603",
    "2000",
    "Part-time",
    "Teilzeit",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
