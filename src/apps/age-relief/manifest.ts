import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const ageReliefApp = {
  id: AppId.AgeRelief,
  title: "Age Relief (Altersentlastungsbetrag) Estimator",
  description: "Compute your permanent § 24a EStG birth-cohort Altersentlastungsbetrag (age 64+ on January 1) and see its exact monthly and annual wage-tax savings.",
  category: CalculatorCategory.Money,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "Permanent birth-cohort percentage & euro cap lookup (§ 24a EStG)",
    "Exact monthly and annual net-pay difference vs. payroll without age relief",
    "Statutory explanation panel with cohort phase-out reference",
  ],
  keywords: [
    "Altersentlastungsbetrag",
    "Age Relief",
    "24a",
    "EStG",
    "Senior",
    "Age 64",
    "Retirement",
    "Cohort",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
