---
{
  "order": 3,
  "citation": "§ 2b BEEG",
  "code": "BEEG",
  "section": "§ 2b",
  "tags": [
    "parent",
    "child",
    "benefits",
    "maternity"
  ],
  "externalSources": {
    "gesetze_im_internet": {
      "url": "https://www.gesetze-im-internet.de/beeg/__2b.html",
      "label": "§ 2b BEEG Statutory Text",
      "description": "12-month assessment window and statutory exclusion rules."
    }
  },
  "group": "rechner://group/group-beeg-tax-swap",
  "interactsWith": {
    "rechner://law/beeg-2c": {
      "description": "Supplies the eligible months used to determine the frozen tax class."
    }
  },
  "dependsOn": {
    "rechner://law/muschg-3": {
      "description": "Maternity protection months trigger statutory lookback exclusions."
    }
  },
  "implements": {
    "rechner://law/beeg-2": {
      "description": "Feeds the 12-month average into the § 2 replacement calculation."
    }
  },
  "relatedOrder": [
    "rechner://law/beeg-2c",
    "rechner://law/muschg-3",
    "rechner://law/beeg-2"
  ]
}
---

# Assessment Period & Statutory Exclusion Months

Selects the 12 eligible calendar months prior to birth or maternity protection and replaces statutory exclusion months (maternity, prior Elterngeld up to 14 life-months) with earlier months.

## Benefit

Excludes maternity and earlier Elterngeld months so a closely spaced second birth can reach back to higher pre-birth earnings.

## Limitation

Denied prior Elterngeld claims or long unpaid gaps do not qualify as exclusion months and can dilute the 12-month average.
