import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const salaryRaiseApp = {
  id: AppId.SalaryRaise,
  title: "Salary Raise & Marginal Take-Home Calculator",
  description: "See exactly how much of a percentage raise, fixed raise or one-off annual bonus lands in your net pay after German wage tax and social contributions.",
  category: CalculatorCategory.Money,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "Exact marginal net keep-rate (%) on any raise or salary negotiation",
    "Side-by-side wage tax, SolZ and social security deduction deltas",
    "One-off bonus (Sonstiger Bezug) net payout estimator",
  ],
  keywords: [
    "Salary Raise",
    "Gehaltserhöhung",
    "Bonus",
    "Marginal Tax",
    "Netto",
    "Brutto",
    "Negotiation",
    "Take-Home",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
