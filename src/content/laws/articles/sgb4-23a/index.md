---
{
  "order": 43,
  "citation": "§ 23a SGB IV",
  "code": "SGB IV",
  "section": "§ 23a",
  "tags": [
    "payroll",
    "insurance"
  ],
  "externalSources": {
    "gesetze_im_internet": {
      "url": "https://www.gesetze-im-internet.de/sgb_4/__23a.html",
      "label": "§ 23a SGB IV Statutory Text",
      "description": "Annual YTD contribution assessment for one-off payments."
    }
  },
  "group": "rechner://group/group-sgb-social-security",
  "interactsWith": {
    "rechner://law/estg-39b": {
      "description": "Coordinates social contribution caps with Sonstige Bezüge wage tax.",
      "order": 0
    }
  },
  "dependsOn": {
    "rechner://law/bvv-2": {
      "description": "Applies statutory cent-rounding to one-off contribution bases.",
      "order": 1
    }
  }
}
---

# One-Off Bonus Contributions & March Clause

Uses year-to-date social-security assessment ceilings to determine how much of a bonus (e.g. vacation or Christmas bonus) is subject to social contributions.

## Benefit

Above annual contribution ceilings, extra bonus payments avoid further health, pension, and unemployment deductions.

## Limitation

Bonuses paid between January and March can be attributed to the prior calendar year (Märzklausel) if YTD limits are exceeded.
