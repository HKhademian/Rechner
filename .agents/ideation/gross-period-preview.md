---
name: Gross input month-year preview
status: complete
created: 2026-10-31
---

# Gross input month-year preview

The user requested a small year/month conversion near salary inputs: a yearly sum when gross input is monthly, or a monthly average when gross input is yearly.

Use the existing calculated annual gross from each person's payroll schedule. Monthly ordinary pay is not always received for twelve months and extra contractual payments may apply, so its preview must use actual configured working months and salary payments. For yearly input show annual gross divided by twelve calendar months, labeled Monthly avg. This is a read-only aid and must not change the input period or financial calculations.

## Atomic scopes

1. Add a small reusable gross-period preview using existing annual gross, clear labels, two-decimal currency formatting, zero handling and a last-valid-input qualifier.
2. Place it below both live gross fields; preserve input units and validation.
3. Place it below saved/read-only and active-draft gross values, using each column's own input period and freshly calculated or draft payroll data. Show excluded partners as not included rather than inventing a conversion.

Run formatter before staging, full audit and build for code scopes. Verify ordinary monthly pay, extra salary payments, partial-year schedules, annual inputs, partner values, mixed-period saved scenarios, incomplete edits and narrow layouts. Preserve unrelated test-random files. The separate investigation into partner presence versus joint assessment remains proposed; this display change does not implement that model correction.


## Completed atomic changes

- `311ecfd`: Add the shared preview and semantic styling. Annual totals come from payroll schedule output; yearly-mode averages divide that total across twelve calendar months. Preserve zero and distinguish excluded partners.
- `2b242e4`: Add previews below both live gross inputs and connect them through accessible descriptions. Invalid edits explicitly identify previews based on last valid inputs.
- `9179f0f`: Add saved/read-only and draft previews using each column's input period and recalculated or current draft data. Associate draft fields with the corresponding preview and validation error descriptions.

## Verification

- Formatter ran before staging each scope. Full `npm run check` and `npm run check:build` passed for each code scope, with zero errors/warnings in the final audit.
- Headless engine-to-render checks verified ordinary monthly salaries, partial-year employment with additional salary payments, yearly inputs, both partners, zero income, excluded partners, distinct saved input periods, stale cached data and active draft updates without changing saved/live inputs.
- Existing live validation, partner-opening, calculator/simulator annual-income parity and planner-flow checks remain green.
- Browser verified monthly live gross beside a yearly saved case, partner conversion and excluded saved partners, immediate draft updates, cancel restoring saved previews, and blank draft input retaining a labeled previous value with Save disabled. A full-year monthly example and yearly monthly average are visible in `/tmp/calculator-gross-conversion.png`.
- At 390px the preview remained within the viewport, with readable label and amount; restored normal viewport afterward. No exhaustive browser or assistive-technology matrix was run.
- Browser interaction tests used the separate localhost origin. Existing inputs on the user's numeric loopback origin were untouched. Restored the isolated test origin's initial inputs and removed its demonstration saved scenario.
- No salary inputs were converted or overwritten by rendering. Existing financial formulas, published profiles, simulator inputs and unrelated `test-random/` files were preserved. Partner/assessment separation remains a proposed correction in `partner-status-and-assessment.md`.
