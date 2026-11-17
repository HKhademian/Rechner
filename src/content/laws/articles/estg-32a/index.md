---
{
  "order": 26,
  "citation": "§ 32a EStG",
  "code": "EStG",
  "section": "§ 32a",
  "tags": [
    "tax",
    "marriage"
  ],
  "externalSources": {
    "gesetze_im_internet": {
      "url": "https://www.gesetze-im-internet.de/estg/__32a.html",
      "label": "§ 32a EStG Statutory Text",
      "description": "Piecewise progressive tariff coefficients and splitting formula."
    },
    "bundesgesetzblatt": {
      "url": "https://www.recht.bund.de/bgbl/1/2024/449/regelungstext.pdf?__blob=publicationFile&v=3",
      "label": "Federal Law Gazette (Steuerfortentwicklungsgesetz)",
      "description": "Official published 2025/2026 Grundfreibetrag and tariff coefficients."
    }
  },
  "group": "rechner://group/group-estg-tax-splitting",
  "implements": {
    "rechner://law/estg-26b": {
      "description": "Applies Abs. 5 splitting formula for joint assessment."
    }
  },
  "modifies": {
    "rechner://law/estg-32b": {
      "description": "Progression clause modifies the average rate applied to § 32a."
    }
  },
  "dependsOn": {
    "rechner://law/estg-2": {
      "description": "Takes annual zvE from § 2 EStG as input."
    }
  },
  "relatedOrder": [
    "rechner://law/estg-26b",
    "rechner://law/estg-32b",
    "rechner://law/estg-2"
  ]
}
---

# Income Tax Tariff & Splitting Formula

Defines the piecewise progressive German income tax formula (basic allowance, two quadratic zones, 42% top zone, 45% highest zone) and the Abs. 5 splitting tariff.

## Benefit

Exempts income up to the Grundfreibetrag and halves progression for joint spouses via the splitting factor 2 × T(zvE / 2).

## Limitation

Steep marginal progression in Zones 2–3 means extra income or progression benefits increase effective tax rates quickly.
