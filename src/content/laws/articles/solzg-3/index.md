---
{
  "order": 39,
  "citation": "§ 3 SolzG",
  "code": "SolzG",
  "section": "§ 3",
  "tags": [
    "tax",
    "child"
  ],
  "externalSources": {
    "gesetze_im_internet": {
      "url": "https://www.gesetze-im-internet.de/solzg_1995/__3.html",
      "label": "§ 3 SolzG Statutory Text",
      "description": "Notional child-adjusted SolZ assessment base."
    }
  },
  "group": "rechner://group/group-estg-tax-splitting",
  "dependsOn": {
    "rechner://law/estg-32": {
      "description": "Always deducts Kinderfreibetrag when computing SolZ base."
    }
  },
  "implements": {
    "rechner://law/solzg-4": {
      "description": "Passes reduced tax base to § 4 SolzG rate and exemption."
    }
  }
}
---

# Solidarity Surcharge Assessment Base & Child Relief

Computes the Solidarity Surcharge tax base after always deducting child allowances (§ 32 Abs. 6 EStG) regardless of Kindergeld favorability.

## Benefit

Parents always get the Kinderfreibetrag reduction on Solidarity Surcharge even when Kindergeld beats income tax.

## Limitation

Increases complexity because SolZ uses a separate notional tax base from income tax when Kindergeld wins.
