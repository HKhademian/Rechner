---
{
  "order": 31,
  "source": {
    "label": "European Payments Council · About SEPA",
    "url": "https://www.europeanpaymentscouncil.eu/about-sepa"
  },
  "explainedBy": [],
  "usedBy": [
    "rechner://app/girocode"
  ]
}
---

# Payment code character encoding

Character encoding determines how text is represented in the payment symbol. UTF-8 supports a broad range of characters; the ASCII option converts text to a narrower character set.

## Potential benefit

The ASCII option can improve compatibility with systems that cannot handle all characters in the original text.

## Conditions and limitations

Conversion can change names and references. Verify the generated payment details and the recipient's requirements.

## In the calculators

Choose whether the generator retains supported text as UTF-8 or uses its ASCII transliteration when building the payment code.
