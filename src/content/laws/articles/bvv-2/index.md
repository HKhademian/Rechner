---
{
  "order": 48,
  "citation": "§ 2 BVV",
  "code": "BVV",
  "section": "§ 2",
  "tags": [
    "payroll",
    "insurance"
  ],
  "externalSources": {
    "gesetze_im_internet": {
      "url": "https://www.gesetze-im-internet.de/beitrvv/BJNR113800006.html",
      "label": "§ 2 BVV Statutory Text",
      "description": "Official contribution procedure and rounding ordinance."
    }
  },
  "group": "rechner://group/group-sgb-social-security",
  "implements": {
    "rechner://law/sgb5-241": {
      "description": "Governs cent rounding for § 241 SGB V health contributions."
    },
    "rechner://law/sgb4-23a": {
      "description": "Applies to one-off bonus social contribution bases."
    }
  }
}
---

# Social Contribution Rounding Rules

Requires calculating and rounding general health contributions and the insurer Zusatzbeitrag separately to cents before summing.

## Benefit

Ensures payroll cent parity with certified German payroll engines.

## Limitation

Tiny 1-cent rounding differences can occur if rates are summed before multiplying the base.
