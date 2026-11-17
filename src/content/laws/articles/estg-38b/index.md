---
{
  "order": 29,
  "citation": "§ 38b EStG",
  "code": "EStG",
  "section": "§ 38b",
  "tags": [
    "payroll",
    "tax",
    "marriage"
  ],
  "externalSources": {
    "gesetze_im_internet": {
      "url": "https://www.gesetze-im-internet.de/estg/__38b.html",
      "label": "§ 38b EStG Statutory Text",
      "description": "Classification rules for wage tax classes I–VI."
    }
  },
  "group": "rechner://group/group-estg-payroll-withholding",
  "extends": {
    "rechner://law/estg-39f": {
      "description": "Class IV + Factor spreads joint tax liability proportionally."
    }
  },
  "interactsWith": {
    "rechner://law/beeg-2c": {
      "description": "Payroll tax class determines BEEG standardized tax deductions."
    },
    "rechner://law/estg-36": {
      "description": "Monthly differences are settled at year-end under § 36."
    }
  }
}
---

# Wage Tax Classes (Lohnsteuerklassen I–VI)

Assigns monthly payroll tax classes: I (single), II (single parent), III/V (spousal split), IV/IV (equal split), VI (secondary job).

## Benefit

Lets couples shape monthly net cash flow and legally optimize Elterngeld assessment under § 2c BEEG.

## Limitation

Does not reduce total annual income tax; Class III/V or V/III only shifts timing between monthly payroll and § 36 settlement.
