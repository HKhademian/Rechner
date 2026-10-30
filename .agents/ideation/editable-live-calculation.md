---
name: Editable Live Calculation
status: in_progress
created: 2026-10-30
---

# Editable Live Calculation

The user requested always-editable Live Calculation and removal of the separate Household & Salary Parameters inputs. Live Calculation is the current column in `ComparisonTable.tsx`, not the separate ResultsDisplay breakdown. Keep calculator/simulator input stores separate, financial rules source-linked and all changes small and atomic.

## Ordered scopes

1. Separate the comparison's client mount wrapper from its renderable content and keep the live column available with zero saved scenarios.
2. Add small accessible live number/choice/toggle controls. Preserve typed values, reject invalid numeric input, and retain last valid calculations while editing an incomplete number.
3. Replace current-column readouts for salary, state, class, church, children and payment schedule with live controls bound to existing signals. Saved columns and drafts stay independent. Input period must remain distinct from the table's monthly/yearly result display.
4. Add live input-period and partner controls plus published-year/factor and per-person payroll details to the live column. Remove the separate InputForm from the calculator in the same scope so every required input remains reachable without duplicate fields/IDs.
5. Remove the now-unused InputForm source as its own cleanup commit. Keep the taxable-income section and read-only detailed deduction breakdown.

Run formatter before each staging operation, full audit and affected-consumer build for each code scope. Add useful numeric-boundary checks and headless rendering/event-handler checks for live updates, zero saved scenarios, partner access, and saved/draft isolation. Preserve saved-input semantics and the unrelated `test-random/` directory. Local browser use was disabled in Work settings; do not claim interactive browser or visual verification without it.
