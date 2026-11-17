---
{
  "order": 23,
  "citation": "§ 26b EStG",
  "code": "EStG",
  "section": "§ 26b",
  "tags": [
    "marriage",
    "tax",
    "parent"
  ],
  "externalSources": {
    "gesetze_im_internet": {
      "url": "https://www.gesetze-im-internet.de/estg/__26b.html",
      "label": "§ 26b EStG Statutory Text",
      "description": "Pooling of spousal income under joint assessment."
    }
  },
  "group": "rechner://group/group-estg-tax-splitting",
  "dependsOn": {
    "rechner://law/estg-26": {
      "description": "Requires an eligible joint-assessment election under § 26.",
      "order": 0
    }
  },
  "implements": {
    "rechner://law/estg-32a": {
      "description": "Applies the § 32a Abs. 5 splitting formula to pooled zvE.",
      "order": 1
    },
    "rechner://law/estg-36": {
      "description": "Reconciles assessed liability against monthly withheld tax credits.",
      "order": 3
    }
  },
  "interactsWith": {
    "rechner://law/estg-32b": {
      "description": "Elterngeld/Mutterschutz progression raises the effective tax rate on joint income.",
      "order": 2
    }
  }
}
---

# Joint Spousal Assessment (Zusammenveranlagung)

Pools both spouses' taxable income and reconciles withheld payroll taxes against the joint splitting tariff.

## Benefit

Equalizes asymmetric earnings (e.g. during parental leave) and often generates refunds when one partner stops working.

## Limitation

A III/V or IV-factor setup can still trigger a tax repayment at year-end when combined with § 32b progression income.
