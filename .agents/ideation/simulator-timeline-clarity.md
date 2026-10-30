---
name: Simulator timeline clarity
status: complete
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

## Implementation and verification

- `d97b3f0`: ledger heading uses the actual result length; chart heading uses the number of displayed months.
- `400ef7e`: simulation-year options are generated from the ledger, with actual month endpoints for partial years. The selected year uses the existing branded constructor; removing a year resets the selection to all years. Whole-month filtering preserves action/event/base-row ordering. The control has an accessible name and enough width for its labels.
- `97fb39c`: the reference line uses initial Scenario B husband plus wife net salaries, with cents, calendar month, salary-only wording, and an inline source disclosure. The disclosure shows the exact salary sum, absolute ledger month, current tax-class label and the matching official payroll profile link when available. Supplied/provisional payroll is identified. The reference is included in Y-axis bounds.
- Ran `npm run fix`, `npm run check` and `npm run check:build` for each implementation commit. Final code audit: zero errors and warnings; unit and scenario tests passed; static site build passed.
- Before local browser access was disabled, verified the 72-month headings, year-six selection, resetting to all years when shrinking to 24 months, and all-years selection plus year ten after extending to 120 months. Used the separate localhost origin for interaction checks, preserving the original 127.0.0.1 preview inputs.
- Local browser access then reported that it was disabled in Work settings. Final visual inspection, a final screenshot and clicking the new source disclosure could not be completed. No workaround outside the documented browser controls was attempted.
- Continued with direct Preact server rendering of the actual table/chart components. The temporary check script `/tmp/calculator-timeline-render-check.mjs` verified year options and last-month endpoints at 12, 24, 72, 100 and 120 months, including Year 9 ending at month 100. It also verified the displayed chart-subset label at 52 months.
- Headless rendering verified the salary reference against actual baseline ledger sums at husband gross salaries of EUR 4,000, EUR 8,200 and EUR 15,000; the reference stayed within the SVG plot. Confirmed the source disclosure contains the exact salary components and correct profile URL, and manual-net mode displays its provisional notice. These are rendering/data checks, not a substitute for final interactive visual verification.
- Engine formulas, saved-input semantics, financial configuration, complete CSV export behavior and event-row contracts are unchanged. The unrelated `test-random/` directory was not staged or modified.

## Remaining separate UI work

Legacy navigation wording, detailed salary-explainer examples, broader chart scaling/series behavior and sandbox mobile layout remain separate scopes. This pass corrects timeline period context, year selection and the initial salary benchmark only.
