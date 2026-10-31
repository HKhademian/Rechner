---
name: Input-first parental leave planner
status: complete
created: 2026-10-31
---

# Input-first parental leave planner

The user understands Your plan inputs but finds Scenario and the annual taxable-income output above it confusing. They asked to continue improving this flow. The page should introduce editable inputs before comparison choices or calculated evidence.

## Atomic scopes

1. Move SandboxControls directly after the planner introduction, before comparison and result sections. Explain the input-to-results sequence in the introduction. Keep all existing input values, disclosure state and calculation behavior.
2. Replace Choose a scenario with Compare versions of your plan. Explain that these are alternative calculations from the same inputs, and selecting a view changes the displayed results rather than the inputs. Use meaningful labels for planned tax-class changes, original classes and no planned births; keep A/B/C internal engine IDs intact. Carry the labels into calculation status, yearly income context and the tax-switch difference summary.
3. Present the detailed annual breakdown as a closed-by-default Yearly income and deductions disclosure after the main summary. Explain that it is a calculated yearly result from salaries and modeled deductions. Keep partner amounts, year selection, unavailable evidence, final-zvE qualification and official source links reachable. The salary-calculator display remains independent.

Run the formatter before staging every commit. Run the full audit and consumer build for each code scope. Verify source order and selection handlers headlessly, then inspect the beginning of the planner and optional tax disclosure in the browser. Preserve existing scenarios, ledger row ordering, financial rules and unrelated test-random files.


## Completed atomic changes

- `6afceba`: Place Your plan inputs directly below the introduction and explain that setup comes before calculated results.
- `ae24760`: Name the three calculations by their behavior, explain view selection, and use the same names in calculation status and yearly-income context. Clarify the baseline for the tax-class-change difference.
- `d841928`: Convert the planner's annual breakdown to a closed native disclosure titled Yearly income and deductions, with an explanation of how it relates to salary inputs and cash-flow results.
- Additional wording clarification: rename Scenario Presets to Example plans and the empty sandbox entry to Empty plan, preserving the catalog and preset behavior.

## Verification

- Ran the formatter before staging each commit. Full `npm run check` and `npm run check:build` passed for each code scope; the completed audit reports zero errors and warnings.
- Headless rendering confirms inputs precede comparison choices and annual evidence; all four selection handlers preserve persisted plan inputs apart from the selected view. The yearly disclosure starts closed while retaining partner amounts, tax-year choices, unavailable evidence, source links and final-zvE qualification.
- Existing calculator/simulator annual-income parity and unavailable-year checks remain green. The separate German Net Pay Calculator presentation is unchanged.
- Browser verification on an isolated local preview confirms the page starts with Your plan inputs, meaningful comparison names appear after it, and selecting original tax classes updates the summary label. The yearly detail is initially hidden, opens through its summary and supports selecting another year with projected-profile disclosure. Restored the original comparison, year and expanded input state afterward.
- Visually inspected the desktop starting view and saved `/tmp/planner-input-first.png`. No broad responsive or assistive-technology audit was added for these focused layout/copy changes.
- Financial rules, input values, saved data, A/B/C engine identifiers, ledger event ordering and unrelated `test-random/` files were preserved.
