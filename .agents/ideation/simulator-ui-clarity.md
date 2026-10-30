---
name: Simulator UI clarity pass
status: complete
created: 2026-10-30
---

# Simulator UI clarity

The user selected the parental-leave simulator first. Preserve small, progressive atomic commits and source-linked financial configuration. This pass changes presentation and interaction, not engine formulas or saved input semantics.

The rendered baseline shows results before scenario controls, long promotional scenario cards with fixed payouts, and 60-month captions while the configured horizon is 72 months. The institutional light palette and existing semantic tokens remain the visual foundation.

## Sequential scope

1. Replace the fixed hero with a compact responsive planning header and actual period context.
2. Make scenario cards describe their actual strategy and current result, removing fixed financial examples and guaranteed-gain claims.
3. Make scenario selection compact, responsive and explicitly accessible.
4. Place scenario selection before the results it controls.
5. Make summary period labels follow the selected result's actual horizon.
6. Group calculation availability into a clear status summary with detailed evidence available on demand.

Each concern is committed separately, including only directly required files/lines. Run the formatter before staging; check quality and build for changed consumers. Inspect the rendered desktop/mobile view and verify scenario switching and disclosures. Preserve source links, incomplete-result notices, event-row contracts and the unrelated untracked test-random directory.

## Evidence and progress

- Baseline inspected in the local browser. The empty 72-month plan advertised fixed maternity/Plus payouts and a five-year total; scenario cards occupied more space than the KPI summary.
- `3a187c5`: compact responsive header, actual date range and duration, neutral page metadata.
- `23245ab`: scenario cards use current simulation totals and availability, with descriptions of the implemented strategies.
- `bff0e41`: compact responsive cards, explicit pressed state, keyboard focus and retained Export / Import action.
- `db6d5d7`: scenario controls precede the results they control.
- `05f209e`: KPI horizon captions, date range and monthly-average divisor use the actual result length. The empty 72-month plan shows an average of EUR 4,663 rather than the old EUR 5,596.
- `6629d99`: benefits, payroll and annual-tax availability are grouped with visible partial/provisional notices; reasons, assessment assumptions and signed annual-tax evidence remain accessible in disclosures. The selected summary is labeled A, B or C, including C in comparison mode.

## Verification

- Ran `npm run fix` before each implementation commit; each passed `npm run check` and `npm run check:build`. The final code audit reported zero errors and warnings, with unit and scenario tests passing.
- Inspected desktop layout at 1280px and mobile layout at 390px. Confirmed the new header, selector, cards and status panel remain within the content bounds at 320px.
- Used a separate localhost origin for preset interaction checks, preserving the original preview plan. A single-child preset showed distinct totals for A, B and C; switching scenarios updated the selected state and summary. Keyboard Enter activation also worked.
- Opened and closed assessment and annual-tax disclosures. Checked that negative settlements and settlements outside the forecast remain visible in the tax evidence, including on mobile.
- Saved a desktop preview to `/tmp/calculator-simulator-ui-desktop.jpg`; left the original-plan preview available and reset the temporary browser viewport override.
- No engine or saved-input semantics changed. Financial figures come from existing simulation results; statutory source and configuration controls remain intact. The unrelated untracked `test-random/` directory was untouched.

## Later UI scopes

These observations remain outside this completed overview pass: legacy five-year navigation/table/chart captions, fixed chart reference-line values, timeline year-filter options, sandbox terminology and its existing mobile overflow. Address each as a separate atomic change with its own verification. This pass does not claim that the whole simulator is fully redesigned.
