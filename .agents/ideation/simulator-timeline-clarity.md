---
name: Simulator timeline clarity
status: in_progress
created: 2026-10-30
---

# Simulator timeline clarity

Continue the user-approved simulator UI work in small atomic commits. Preserve the engine, saved inputs, linked statutory configuration, complete CSV exports, and action/event/base-row ordering. Leave the unrelated untracked `test-random/` directory untouched.

## Sequential scopes

1. Make ledger and chart period labels use the actual displayed simulation results.
2. Generate simulation-year choices from ledger months, including partial years and horizons beyond five years. When a horizon change removes the selected year, show all years rather than an empty stale selection. Keep existing row search and ordering.
3. Replace the fixed EUR 6,125 chart reference with the initial Scenario B household net salaries. Label the reference month and salary-only meaning, mark provisional payroll, include the reference in chart bounds, and link its source to the Scenario B ledger. This is an initial salary benchmark, not a constant prediction of future household cash flow.

Each scope is committed separately after formatter, quality checks and affected-consumer build. Verify period changes, year selection after horizon changes, and reference changes in the local UI. Use headless tests for meaningful filter edge cases where useful. Do not add arbitrary financial assumptions.

## Baseline observations

- Ledger heading and chart heading hardcode 60 months while current plans contain 72 months.
- Ledger filter lists only years 1 through 5; its filtering logic also contains an unused calendar-year branch.
- Chart salary reference hardcodes EUR 6,125; the actual empty-plan initial household take-home is derived from configured payroll and differs.
