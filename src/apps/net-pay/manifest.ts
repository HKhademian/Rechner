import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
} from "#/apps/appDefinition.ts";

export const netPayApp = {
  id: AppId.NetPay,
  title: "Net Pay Calculator",
  description: "See what stays from your German salary, compare household scenarios and understand your deductions.",
  category: CalculatorCategory.Money,
  features: ["Monthly or yearly salary", "Partner and saved comparisons", "Taxable income and payroll details"],
  keywords: ["salary", "gross", "net", "Brutto", "Netto", "Gehalt", "Rechner", "tax", "insurance"],
} satisfies CalculatorAppDefinition;
