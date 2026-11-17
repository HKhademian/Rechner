---
{
  "order": 24,
  "citation": "§ 31 EStG",
  "code": "EStG",
  "section": "§ 31",
  "tags": [
    "child",
    "tax",
    "benefits"
  ],
  "externalSources": {
    "gesetze_im_internet": {
      "url": "https://www.gesetze-im-internet.de/estg/__31.html",
      "label": "§ 31 EStG Statutory Text",
      "description": "Mandatory tax-office Günstigerprüfung rule."
    }
  },
  "group": "rechner://group/group-estg-kindergeld",
  "dependsOn": {
    "rechner://law/estg-32": {
      "description": "Tests the annual § 32 Abs. 6 Kinderfreibetrag amount."
    }
  },
  "contrastsWith": {
    "rechner://law/estg-66": {
      "description": "Compares tax relief against monthly § 66 Kindergeld payouts."
    }
  },
  "interactsWith": {
    "rechner://law/solzg-3": {
      "description": "Kinderfreibetrag always reduces the Solidarity Surcharge base even when Kindergeld wins."
    }
  },
  "relatedOrder": [
    "rechner://law/estg-32",
    "rechner://law/estg-66",
    "rechner://law/solzg-3"
  ]
}
---

# Family Equalization & Günstigerprüfung

Automatically compares Kindergeld received during the year against the tax savings from the Kinderfreibetrag and grants whichever is higher.

## Benefit

High-marginal-rate households automatically receive the extra tax relief above paid Kindergeld.

## Limitation

Middle- and lower-income households receive no extra tax deduction because Kindergeld already exceeds the tax relief.
