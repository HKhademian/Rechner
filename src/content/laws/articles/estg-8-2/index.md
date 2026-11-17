---
{
  "order": 53,
  "citation": "§ 8 Abs. 2 S. 3 EStG",
  "code": "EStG",
  "section": "8 Abs. 2",
  "tags": [
    "car",
    "tax",
    "payroll"
  ],
  "externalSources": {
    "gesetze_im_internet": {
      "url": "https://www.gesetze-im-internet.de/estg/__8.html",
      "label": "§ 8 EStG Benefit-in-Kind Text",
      "description": "Official valuation rules for commuting benefits in kind."
    }
  },
  "group": "rechner://group/group-estg-company-car",
  "dependsOn": {
    "rechner://law/estg-6-1-4": {
      "description": "Applies 0.03% or 0.002% to the quartered/halved EV/PHEV or full ICE list-price basis."
    }
  },
  "interactsWith": {
    "rechner://law/estg-9a": {
      "description": "Offset partially by commuter distance allowance (Entfernungspauschale) in annual tax filing."
    }
  }
}
---

# Company Car Commute Valuation (0.03% / 0.002%)

Values regular home-to-work commutes with a company car at 0.03% of effective list price per one-way km monthly (or 0.002% per actual office trip).

## Benefit

Employees frequently working remotely can switch to 0.002% actual-trip valuation if commuting under ~15 days/month.

## Limitation

Long one-way commutes compound monthly taxable benefit rapidly under the standard 0.03% flat rule.
