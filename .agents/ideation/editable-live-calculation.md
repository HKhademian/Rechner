---
name: Editable Live Calculation
status: complete
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

Run formatter before each staging operation, full audit and affected-consumer build for each code scope. Add useful numeric-boundary checks and headless rendering/event-handler checks for live updates, zero saved scenarios, partner access, and saved/draft isolation. Preserve saved-input semantics and the unrelated `test-random/` directory. Local browser use was initially disabled in Work settings. Access became available during final verification; the browser checks below were then performed.


## Completed atomic changes

- `91042da`: Keep Live Calculation available with zero saved scenarios; separate the mount wrapper from renderable content.
- `a72e4ab`: Add validated number, choice and toggle controls, including incomplete-number handling and numeric-boundary tests.
- `0e61c00`: Bind the existing parameter cells to current calculator signals; retain saved-scenario and draft independence.
- `031063f`: Move input period, partner switch, published payroll year/factor and per-person payroll details into the live column; remove the duplicate form mount.
- `b8cab1f`: Delete the unused standalone InputForm source after confirming no consumers remain.

## Verification

- Formatter ran before staging every scope. Full `npm run check` and `npm run check:build` passed for the code scopes; final audit reported zero errors and warnings.
- Headless rendering and actual event-handler checks verified 15 live controls with a partner, nine without one, zero saved scenarios, unique payroll IDs, conditional personal settings, valid updates, rejected invalid schedules, and unchanged saved scenarios/drafts.
- Existing headless annual-income checks passed for both pages, partner totals, equivalent calculator/simulator inputs, unavailable deductions and selected verified profiles.
- Interactive browser verification on an isolated localhost preview confirmed live gross edits update results while saved amounts stay unchanged; blank input retains the last valid result; invalid working months show feedback; enabling a partner reveals their controls; changing the published year updates live payroll and annual income; and the taxable-income rules link opens the moved settings.
- Visually inspected the desktop comparison and editable cells. Responsive device widths were not separately tested. Browser test inputs and the selected published year were restored after verification.
- Preserved the taxable-income section, detailed deduction results, financial engine, source-linked published profiles, simulator inputs and unrelated `test-random/` directory.
