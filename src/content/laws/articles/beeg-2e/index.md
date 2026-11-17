---
{
  "order": 6,
  "citation": "§ 2e BEEG",
  "code": "BEEG",
  "section": "§ 2e",
  "tags": [
    "parent",
    "tax",
    "benefits"
  ],
  "externalSources": {
    "gesetze_im_internet": {
      "url": "https://www.gesetze-im-internet.de/beeg/__2e.html",
      "label": "§ 2e BEEG Statutory Text",
      "description": "Standardized BEEG tax deduction rules."
    }
  },
  "group": "rechner://group/group-beeg-synthetic-net",
  "dependsOn": {
    "rechner://law/bmf-pap": {
      "description": "Uses the January BMF PAP table of the calendar year before birth."
    },
    "rechner://law/beeg-2c": {
      "description": "Receives the frozen tax class and church tax flag from § 2c."
    }
  },
  "interactsWith": {
    "rechner://law/beeg-2f": {
      "description": "Combined with § 2f flat social deductions to form BEEG standardized net."
    }
  },
  "relatedOrder": [
    "rechner://law/bmf-pap",
    "rechner://law/beeg-2f",
    "rechner://law/beeg-2c"
  ]
}
---

# Standardized BEEG Tax Deductions

Applies standardized income tax, solidarity surcharge, and flat church tax (8%) using the January PAP of the calendar year before birth.

## Benefit

Creates a predictable standardized net separate from individual payroll quirks like mid-year allowances.

## Limitation

Ignores personal payroll allowances and depends on the January PAP snapshot from the year prior to birth.
