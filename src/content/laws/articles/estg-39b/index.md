---
{
  "order": 30,
  "citation": "§ 39b EStG",
  "code": "EStG",
  "section": "§ 39b",
  "tags": [
    "payroll",
    "tax"
  ],
  "externalSources": {
    "gesetze_im_internet": {
      "url": "https://www.gesetze-im-internet.de/estg/__39b.html",
      "label": "§ 39b EStG Statutory Text",
      "description": "Regular and Sonstige Bezüge withholding rules."
    }
  },
  "group": "rechner://group/group-estg-payroll-withholding",
  "implements": {
    "rechner://law/bmf-pap": {
      "description": "Implemented algorithmically via the official BMF PAP.",
      "order": 0
    }
  },
  "dependsOn": {
    "rechner://law/estg-19": {
      "description": "Withholds tax on § 19 employment earnings.",
      "order": 1
    }
  }
}
---

# Monthly Payroll & One-Off Bonus Withholding (Sonstige Bezüge)

Governs regular monthly wage-tax withholding and the differential annualization method for irregular bonuses (13th-month / vacation / Christmas bonuses).

## Benefit

Prevents over-withholding on regular monthly paychecks when bonuses occur.

## Limitation

Bonuses face differential annual marginal withholding and do not count as ongoing regular pay for BEEG Elterngeld.
