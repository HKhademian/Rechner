---
{
  "order": 4,
  "citation": "§ 2c BEEG",
  "code": "BEEG",
  "section": "§ 2c",
  "tags": [
    "parent",
    "payroll",
    "tax",
    "benefits"
  ],
  "externalSources": {
    "gesetze_im_internet": {
      "url": "https://www.gesetze-im-internet.de/beeg/__2c.html",
      "label": "§ 2c BEEG Statutory Text",
      "description": "Deduction characteristic selection and employment income rules."
    },
    "familienportal": {
      "url": "https://familienportal.de/familienportal/familienleistungen/elterngeld/arbeitssituation/auf-welche-steuerklasse-kommt-es-fuer-die-berechnung-meines-elterngelds-an-wenn-ich-die-steuerklasse-gewechselt-habe--124670",
      "label": "Familienportal Tax-Class Guidance",
      "description": "Official federal guidance on tax-class switches and equal-duration ties."
    }
  },
  "group": "rechner://group/group-beeg-tax-swap",
  "dependsOn": {
    "rechner://law/beeg-2b": {
      "description": "Uses the eligible assessment months defined in § 2b BEEG.",
      "order": 0
    },
    "rechner://law/estg-38b": {
      "description": "Wage tax classes I–VI originate from § 38b EStG.",
      "order": 2
    }
  },
  "interactsWith": {
    "rechner://law/beeg-2e": {
      "description": "Standardized tax deductions are computed using the selected class under § 2e.",
      "order": 1
    }
  },
  "contrastsWith": {
    "rechner://law/estg-26b": {
      "description": "Temporary class swaps do not change final annual liability under joint assessment.",
      "order": 3
    }
  }
}
---

# Employment Income & Tax-Class Tie-Breaking

Establishes how ongoing employment wages enter standardized Elterngeld net and selects the tax class that prevailed in the majority of eligible months (latest on a tie).

## Benefit

A timely switch into a more favorable tax class (e.g. V→III) across the majority or tie-break of assessment months raises standardized net.

## Limitation

A late tax-class switch cannot rewrite the majority/tie rule, and higher monthly withholding reduces the other spouse's cash flow until annual reconciliation.
