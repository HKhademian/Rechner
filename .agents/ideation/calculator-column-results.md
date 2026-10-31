# Calculator results belong to their comparison column

Status: selected for implementation.

Requested: keep Household Summary together, move payroll details out of the column header, and make annual taxable income and Calculation Breakdown specific to each column.

Atomic scopes: parameterize the evidence/breakdown components with data and unique IDs; then place them within live/saved comparison cells using current draft calculations, move live payroll settings to their own row and remove the separate live-only page results and floating summary. Preserve calculation formulas and saved inputs. Validate distinct cases and draft changes, unique IDs, narrow layout, full audit and build.

## Completed

- `f680514`: Parameterize annual taxable income with unique section IDs and an edit-link policy; accept explicit household data in the independently controlled calculation breakdown.
- `2af88a0`: Place annual income and breakdown in separate expandable cells for every live/saved column. Saved cells recalculate from saved inputs or the active draft instead of stale cached data. Move live payroll settings out of the header into a dedicated row, with each saved column linking its own official payroll profile. Remove the shared live-only page details and floating summary; retain the existing contiguous Household Summary rows.

Verification: formatter, full quality audit (zero errors/warnings), and static build passed for both implementation scopes. Headless rendering verified different incomes, tax years and partner inclusion, stale cache avoidance, independent draft updates without mutating live/saved inputs, unique DOM IDs, one Household Summary and payroll settings outside the header. Browser verified 50,000 live versus 80,000 draft inputs, different annual-income and payroll breakdown values, and a 390px live detail cell fitting the viewport. Restored viewport and removed the temporary saved fixture. Proof: /tmp/calculator-column-results.png. No financial formulas or user saved scenarios were changed; unrelated test-random/ remains untouched.

## Follow-up: inputs first, all outputs together

Selected: group all input rows (including payroll settings) first, then a single results group containing Household Summary, person/partner summaries, annual taxable income, breakdown and payroll evidence. Keep the same scenario columns throughout. Move calculated payroll assumptions out of the settings disclosure into the results group. Preserve draft validation and values.
