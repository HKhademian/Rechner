---
{
  "order": 15,
  "citation": "§ 10 EStG",
  "code": "EStG",
  "section": "§ 10",
  "tags": [
    "tax",
    "insurance",
    "payroll"
  ],
  "externalSources": {
    "gesetze_im_internet": {
      "url": "https://www.gesetze-im-internet.de/estg/__10.html",
      "label": "§ 10 EStG Statutory Text",
      "description": "Special-expense deductions for pension and health/care contributions."
    }
  },
  "group": "rechner://group/group-estg-tax-splitting",
  "interactsWith": {
    "rechner://law/estg-10c": {
      "description": "Works alongside the general special-expense lump sum.",
      "order": 0
    }
  },
  "dependsOn": {
    "rechner://law/sgb5-241": {
      "description": "Deducts employee health share contributions.",
      "order": 1
    },
    "rechner://law/sgb6-158": {
      "description": "Deducts employee pension contributions.",
      "order": 2
    }
  }
}
---

# Deductible Provident & Insurance Contributions (Vorsorgeaufwendungen)

Governs deductibility of statutory pension contributions, basic health/long-term care insurance, and other insurance caps.

## Benefit

Allows full deduction of basic health/care contributions and statutory pension shares.

## Limitation

Other insurance premiums (like unemployment) are capped and crowded out once basic health/care exceeds €1,900 (€3,800 joint).
