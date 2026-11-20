import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const taxClassSwitchApp = {
  id: AppId.TaxClassSwitch,
  title: "Tax Class Switch (Steuerklassenwechsel) Comparator",
  description: "Compare IV/IV, III/V and IV/IV-factor switch dates across the year with separate views for monthly payroll withholding and final annual joint tax.",
  category: CalculatorCategory.Money,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "View 1: Monthly payroll withholding (Lohnsteuer) before & after switch",
    "View 2: Invariant annual joint income tax (§ 26b / § 32a EStG) & settlement",
    "Switch-date table (Jan, Apr, Jul, Oct, Keep) with mandatory-filing alert",
  ],
  keywords: [
    "Tax Class",
    "Steuerklasse",
    "Steuerklassenwechsel",
    "III/V",
    "IV/IV",
    "Faktorverfahren",
    "Nachzahlung",
    "Joint Tax",
    "EStG",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
