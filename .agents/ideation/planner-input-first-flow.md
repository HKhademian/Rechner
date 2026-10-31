---
name: Input-first parental leave planner
status: in_progress
created: 2026-10-31
---

# Input-first parental leave planner

The user understands Your plan inputs but finds Scenario and the annual taxable-income output above it confusing. They asked to continue improving this flow. The page should introduce editable inputs before comparison choices or calculated evidence.

## Atomic scopes

1. Move SandboxControls directly after the planner introduction, before comparison and result sections. Explain the input-to-results sequence in the introduction. Keep all existing input values, disclosure state and calculation behavior.
2. Replace Choose a scenario with Compare versions of your plan. Explain that these are alternative calculations from the same inputs, and selecting a view changes the displayed results rather than the inputs. Use meaningful labels for planned tax-class changes, original classes and no planned births; keep A/B/C internal engine IDs intact. Carry the labels into calculation status, yearly income context and the tax-switch difference summary.
3. Present the detailed annual breakdown as a closed-by-default Yearly income and deductions disclosure after the main summary. Explain that it is a calculated yearly result from salaries and modeled deductions. Keep partner amounts, year selection, unavailable evidence, final-zvE qualification and official source links reachable. The salary-calculator display remains independent.

Run the formatter before staging every commit. Run the full audit and consumer build for each code scope. Verify source order and selection handlers headlessly, then inspect the beginning of the planner and optional tax disclosure in the browser. Preserve existing scenarios, ledger row ordering, financial rules and unrelated test-random files.
