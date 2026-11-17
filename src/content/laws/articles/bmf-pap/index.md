---
{
  "order": 62,
  "citation": "BMF PAP",
  "code": "BMF",
  "section": "PAP",
  "tags": [
    "payroll",
    "tax"
  ],
  "externalSources": {
    "bmf_steuerrechner": {
      "url": "https://www.bmf-steuerrechner.de/interface/programmablauf.xhtml",
      "label": "BMF Programmablaufplan (PAP)",
      "description": "Official BMF wage-tax algorithm and publication history."
    }
  },
  "group": "rechner://group/group-estg-payroll-withholding",
  "implements": {
    "rechner://law/estg-39b": {
      "description": "Executes statutory § 39b EStG monthly and bonus withholding."
    },
    "rechner://law/estg-39f": {
      "description": "Computes Class IV factor parameters."
    }
  },
  "interactsWith": {
    "rechner://law/beeg-2e": {
      "description": "January PAP snapshot before birth determines BEEG § 2e tax deductions."
    }
  },
  "relatedOrder": [
    "rechner://law/estg-39b",
    "rechner://law/estg-39f",
    "rechner://law/beeg-2e"
  ]
}
---

# Federal Ministry of Finance Payroll Tax Algorithm (PAP)

Official annual flowchart algorithm published by BMF governing monthly wage tax and solidarity withholding across Germany.

## Benefit

Guarantees exact statutory payroll withholding parity with official BMF tax tables.

## Limitation

Only verified published years exist; BEEG standardized net specifically requires the January snapshot of the year prior to birth.
