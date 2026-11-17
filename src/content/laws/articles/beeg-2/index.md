---
{
  "order": 1,
  "citation": "§ 2 BEEG",
  "code": "BEEG",
  "section": "§ 2",
  "tags": [
    "parent",
    "child",
    "benefits"
  ],
  "externalSources": {
    "gesetze_im_internet": {
      "url": "https://www.gesetze-im-internet.de/beeg/__2.html",
      "label": "§ 2 BEEG Statutory Text",
      "description": "Replacement scale, €300–€1,800 bounds, and €2,770 assessable net cap."
    }
  },
  "group": "rechner://group/group-beeg-synthetic-net",
  "dependsOn": {
    "rechner://law/beeg-2b": {
      "description": "Assessment lookback selects the 12 eligible months feeding § 2."
    },
    "rechner://law/beeg-2c": {
      "description": "Standardized BEEG net from employment income is computed under § 2c."
    }
  },
  "modifies": {
    "rechner://law/beeg-4a": {
      "description": "ElterngeldPlus caps payments at 50% of the no-income Basis amount."
    }
  },
  "extends": {
    "rechner://law/beeg-2a": {
      "description": "Sibling bonus adds 10% (min €75 Basis / €37.50 Plus) on top of § 2."
    }
  }
}
---

# Amount of Elterngeld, Replacement Rate & Caps

Defines the sliding replacement rate (65%–100%), the €2,770 assessable net ceiling, the €300 floor, and the €1,800 Basiselterngeld maximum.

## Benefit

Boosts replacement up to 100% for lower incomes below €1,000 and guarantees a €300 Basis floor.

## Limitation

Caps assessable pre-birth net at €2,770 (max €1,800/month Basis) and reduces the rate from 67% down to 65% above €1,200.
