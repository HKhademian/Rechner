---
{
  "order": 31,
  "citation": "§ 39f EStG",
  "code": "EStG",
  "section": "§ 39f",
  "tags": [
    "payroll",
    "tax",
    "marriage"
  ],
  "externalSources": {
    "gesetze_im_internet": {
      "url": "https://www.gesetze-im-internet.de/estg/__39f.html",
      "label": "§ 39f EStG Statutory Text",
      "description": "Formula and 3-decimal truncation for Class IV factor."
    }
  },
  "group": "rechner://group/group-estg-payroll-withholding",
  "modifies": {
    "rechner://law/estg-38b": {
      "description": "Modifies Tax Class IV monthly payroll withholding.",
      "order": 0
    }
  },
  "dependsOn": {
    "rechner://law/bmf-pap": {
      "description": "Factor calculation uses the published BMF PAP tax tables.",
      "order": 1
    }
  }
}
---

# Class IV Factor Method (Faktorverfahren)

Applies a 3-decimal-truncated splitting factor to Class IV withholding so spouses pay near-exact proportional annual tax every month.

## Benefit

Avoids large year-end tax repayments common with III/V while reflecting splitting gains immediately.

## Limitation

Reduces the higher-earning or leave-planning spouse's BEEG net compared to strategically switching into Class III.
