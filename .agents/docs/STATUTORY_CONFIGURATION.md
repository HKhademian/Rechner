# Statutory configuration

Benefit defaults live in `src/data/benefitRules.json`. Each numeric parameter has a descriptive label and a direct link to the statutory provision defining it. The checked-in defaults were reviewed on 2026-10-29 against current BEEG rules; they are not a guarantee of future law.

`createBenefitRules(overrides)` in `src/engine/config/benefitRules.ts` validates monetary values, fractional rates, hours, whole-month limits, and relationships between thresholds. It returns deeply frozen, branded parameter values. Invalid or unknown overrides throw `TypeError`.

Callers may override named values through the factory. Each parameter retains its official reference URL and records `overridden: true` when its value differs from the referenced default. An override is a modeling assumption, not a statement that the official source prescribes that value. The factory has no shared mutable state. Calculation APIs are being migrated to accept this configuration during the sequential repair plan.

Monetary constructors preserve cents and use decimal exponent shifting to round half cents away from zero. This preserves statutory fractional amounts and avoids binary midpoint errors. The rounding source for benefit calculations is the [BEEG guidelines, section 2.0.3.3.1](https://www.bmbfsfj.bund.de/resource/blob/243236/6d06137220a52d1a18905493c3ab6199/richtlinien-zum-beeg-data.pdf). Numeric constants defining currency units or indexing are distinct from configurable statutory parameters.

Regression fixtures retain independently sourced expected values; they must not derive their expected results from the production configuration or calculation under test.

## Annual tax profiles

`src/data/taxRules.json` holds source-linked 2025 and 2026 tax and social-insurance defaults, including tariff coefficients. `createTaxRules(calendarYear, overrides)` validates and freezes them. An unavailable historical year is rejected; a future year carries the latest verified profile with distinct `calendarYear`, `sourceYear`, and `projected: true` metadata. Per-parameter overrides remain marked as assumptions. This is an explicit latest-known-law projection, not a claim that later laws are known.

The health supplement defaults are officially announced averages. The actual insurer supplement may differ and is configurable. Employee pension, unemployment, and general health shares are derived from the statutory total rates and equal employer/employee division. State/age/child eligibility must still be supplied to payroll.
