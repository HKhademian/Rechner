---
{
  "order": 27,
  "citation": "§ 32b EStG",
  "code": "EStG",
  "section": "§ 32b",
  "tags": [
    "tax",
    "parent",
    "benefits",
    "maternity"
  ],
  "externalSources": {
    "gesetze_im_internet": {
      "url": "https://www.gesetze-im-internet.de/estg/__32b.html",
      "label": "§ 32b EStG Statutory Text",
      "description": "List of progression-subject benefits and rate formula."
    }
  },
  "group": "rechner://group/group-estg-tax-splitting",
  "modifies": {
    "rechner://law/estg-32a": {
      "description": "Computes effective average rate at T(zvE + benefits) / (zvE + benefits)."
    }
  },
  "interactsWith": {
    "rechner://law/estg-26b": {
      "description": "Hits joint spousal income during parental-leave years."
    },
    "rechner://law/beeg-2": {
      "description": "Elterngeld payouts enter the § 32b progression base."
    }
  }
}
---

# Progression Clause (Progressionsvorbehalt)

Adds tax-free wage-replacement benefits (Elterngeld, Mutterschaftsgeld) to taxable income solely to determine a higher average tax rate on remaining taxable income.

## Benefit

Elterngeld and Mutterschutz stay tax-free themselves — only the rate on other taxable income is adjusted.

## Limitation

Frequently triggers unexpected year-end tax repayments when one spouse continues earning high salary while the other receives Elterngeld.
