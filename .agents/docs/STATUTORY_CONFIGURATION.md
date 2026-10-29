# Statutory configuration

Benefit defaults live in `src/data/benefitRules.json`. Each numeric parameter has a descriptive label and a direct link to the statutory provision defining it. The checked-in defaults were reviewed on 2026-10-29 against current BEEG rules; they are not a guarantee of future law.

`createBenefitRules(overrides)` in `src/engine/config/benefitRules.ts` validates monetary values, fractional rates, hours, whole-month limits, and relationships between thresholds. It returns deeply frozen, branded parameter values. Invalid or unknown overrides throw `TypeError`.

Callers may override named values through the factory. Each parameter retains its official reference URL and records `overridden: true` when its value differs from the referenced default. An override is a modeling assumption, not a statement that the official source prescribes that value. The factory has no shared mutable state. Calculation APIs are being migrated to accept this configuration during the sequential repair plan.

Monetary constructors preserve cents and use decimal exponent shifting to round half cents away from zero. This preserves statutory fractional amounts and avoids binary midpoint errors. The rounding source for benefit calculations is the [BEEG guidelines, section 2.0.3.3.1](https://www.bmbfsfj.bund.de/resource/blob/243236/6d06137220a52d1a18905493c3ab6199/richtlinien-zum-beeg-data.pdf). Numeric constants defining currency units or indexing are distinct from configurable statutory parameters.

Regression fixtures retain independently sourced expected values; they must not derive their expected results from the production configuration or calculation under test.
