---
{
  "order": 10,
  "citation": "§ 4a BEEG",
  "code": "BEEG",
  "section": "§ 4a",
  "tags": [
    "parent",
    "child",
    "benefits",
    "payroll"
  ],
  "externalSources": {
    "gesetze_im_internet": {
      "url": "https://www.gesetze-im-internet.de/beeg/__4a.html",
      "label": "§ 4a BEEG Statutory Text",
      "description": "ElterngeldPlus rate, cap, and conversion mechanics."
    }
  },
  "group": "rechner://group/group-beeg-synthetic-net",
  "dependsOn": {
    "rechner://law/beeg-2": {
      "description": "Uses the parent's § 2 no-income Basis amount to set the 50% Plus cap."
    }
  },
  "modifies": {
    "rechner://law/beeg-4": {
      "description": "Converts 1 Basis month into 2 ElterngeldPlus months."
    }
  },
  "interactsWith": {
    "rechner://law/beeg-4b": {
      "description": "Partnership bonus months are paid under ElterngeldPlus rules."
    }
  }
}
---

# ElterngeldPlus Calculation & Personal Ceiling

Doubles the payout duration at up to 50% of the no-income Basis entitlement (€150–€900/month), rewarding part-time post-birth work.

## Benefit

Stretches budget months 2-for-1 and softens part-time income offsets compared to Basiselterngeld.

## Limitation

Strictly capped at half of the parent's no-income Basis entitlement (ceiling €900/month before sibling bonus).
