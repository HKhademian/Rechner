---
{
  "order": 12,
  "citation": "§ 2 EStG",
  "code": "EStG",
  "section": "§ 2",
  "tags": [
    "tax",
    "payroll",
    "benefits"
  ],
  "externalSources": {
    "gesetze_im_internet": {
      "url": "https://www.gesetze-im-internet.de/estg/__2.html",
      "label": "§ 2 EStG Statutory Text",
      "description": "Scope of income and taxable income derivation."
    }
  },
  "group": "rechner://group/group-estg-tax-splitting",
  "dependsOn": {
    "rechner://law/estg-9a": {
      "description": "Subtracts work-expense lump sum before arriving at employment income.",
      "order": 0
    }
  },
  "implements": {
    "rechner://law/estg-32a": {
      "description": "zvE from § 2 feeds the statutory § 32a income tax tariff.",
      "order": 1
    }
  },
  "interactsWith": {
    "rechner://law/beeg-1": {
      "description": "Determines couple taxable income tested against the BEEG limit.",
      "order": 2
    }
  }
}
---

# Income Categories & Taxable Income (zvE)

Defines total income, adjusted gross income, and taxable income (zu versteuerndes Einkommen), including § 2 Abs. 5a modifications for benefit eligibility.

## Benefit

Provides the structured deduction chain from gross wages down to taxable income.

## Limitation

For Elterngeld income limits (§ 1 Abs. 8 BEEG), § 2 Abs. 5a adds back certain capital income and deductions.
