---
{
  "order": 44,
  "citation": "§ 241 SGB V",
  "code": "SGB V",
  "section": "§ 241",
  "tags": [
    "insurance",
    "payroll"
  ],
  "externalSources": {
    "gesetze_im_internet": {
      "url": "https://www.gesetze-im-internet.de/sgb_5/__241.html",
      "label": "§ 241 SGB V Statutory Text",
      "description": "General 14.6% statutory health contribution rate."
    }
  },
  "group": "rechner://group/group-sgb-social-security",
  "dependsOn": {
    "rechner://law/bvv-2": {
      "description": "General rate and Zusatzbeitrag are rounded separately before addition."
    }
  },
  "interactsWith": {
    "rechner://law/estg-10": {
      "description": "Basic health share (96% of general contribution) is tax-deductible."
    }
  },
  "modifies": {
    "rechner://law/sgb4-20": {
      "description": "Reduced inside the Midijob transition zone."
    }
  },
  "relatedOrder": [
    "rechner://law/bvv-2",
    "rechner://law/estg-10",
    "rechner://law/sgb4-20"
  ]
}
---

# Statutory Health Insurance Rate (GKV)

Sets the general statutory health contribution rate (14.6%, shared 7.3% employee / 7.3% employer) plus the insurer-specific Zusatzbeitrag (also shared 50/50).

## Benefit

Covers family members including children at no extra premium and is fully tax-deductible for basic coverage.

## Limitation

Insurer Zusatzbeitrag varies by provider and increases deductions proportionally up to the annual health ceiling.
