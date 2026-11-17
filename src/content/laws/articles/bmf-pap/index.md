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
  "groupId": "group-estg-payroll-withholding",
  "relatedLaws": {
    "estg-39b": {
      "relationType": "implements",
      "description": "Executes statutory § 39b EStG monthly and bonus withholding."
    },
    "estg-39f": {
      "relationType": "implements",
      "description": "Computes Class IV factor parameters."
    },
    "beeg-2e": {
      "relationType": "interacts_with",
      "description": "January PAP snapshot before birth determines BEEG § 2e tax deductions."
    }
  },
  "externalSources": {
    "bmf_steuerrechner": {
      "url": "https://www.bmf-steuerrechner.de/interface/programmablauf.xhtml",
      "label": "BMF Programmablaufplan (PAP)",
      "description": "Official BMF wage-tax algorithm and publication history."
    }
  }
}
---

# Federal Ministry of Finance Payroll Tax Algorithm (PAP)

Official annual flowchart algorithm published by BMF governing monthly wage tax and solidarity withholding across Germany.

## Benefit

Guarantees exact statutory payroll withholding parity with official BMF tax tables.

## Limitation

Only verified published years exist; BEEG standardized net specifically requires the January snapshot of the year prior to birth.
