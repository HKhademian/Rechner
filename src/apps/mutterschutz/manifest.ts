import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const mutterschutzApp = {
  id: AppId.Mutterschutz,
  title: "Mutterschutz & Mutterschaftsgeld Calculator",
  description: "Calculate exact 6-week pre-birth and 8/12-week post-birth maternity protection dates plus the GKV Mutterschaftsgeld (€13/day) and employer top-up split under §§ 3, 19, 20 MuSchG.",
  category: CalculatorCategory.Family,
  releaseStatus: CalculatorReleaseStatus.Draft,
  features: [
    "Exact pre-birth (6 weeks) and post-birth (8 or 12 weeks) protection dates",
    "Statutory GKV share (€13/day) vs. employer top-up (Arbeitgeberzuschuss)",
    "Full § 3 / § 19 / § 20 MuSchG statutory explanation panel",
  ],
  keywords: [
    "Mutterschutz",
    "Mutterschaftsgeld",
    "Arbeitgeberzuschuss",
    "MuSchG",
    "Maternity",
    "Protection",
    "Pregnancy",
    "Birth",
    "Rechner",
  ],
} satisfies CalculatorAppDefinition;
