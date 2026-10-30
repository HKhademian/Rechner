---
name: Calculator UI follow-up candidates
status: complete
created: 2026-10-30
---

# Calculator UI follow-up candidates

The user asked what else could be improved after consolidating inputs into Live Calculation. The user approved these scopes, with the pregnancy-positive month picker fix first. Keep any selected work small, progressive and atomic. The completed inline-editing work is recorded in `editable-live-calculation.md`.

## Suggested order

1. **Clarify salary units and period.** Gross input rows currently say Gross Income or Partner Gross, while the input basis is a separate row and the result display has its own Monthly/Yearly buttons. Add the actual input basis and euro unit beside each column's salary control/value, including saved columns with a different basis. Label the result-period control explicitly. This scope must preserve salary values and calculation behavior.
2. **Make saved editing as robust as live editing.** Saved numeric editors currently coerce blank input to zero and call `updateScenarioInput`, which calculates the candidate without a UI error boundary. Preserve incomplete text, validate candidates, report field errors, retain the last valid draft and add accessible labels/focus states. Separately prevent save actions from silently capturing the last valid result while an intended live edit is invalid or incomplete.
3. **Shorten the path from inputs to results.** Parameter rows currently follow summary and deduction rows for each person. Place frequently edited inputs before detailed deductions, while keeping a compact result summary visible. Treat moving input rows and adding a persistent summary as separate scopes; do not recreate a duplicate input form.
4. **Improve narrow-screen editing.** The comparison uses a fixed 250px sticky label column and 300px live column inside horizontal overflow. Test representative narrow widths, then make the live editor usable without forcing horizontal scrolling between a field name and its control. Keep side-by-side comparison available for saved scenarios. Define the responsive behavior before implementation and verify keyboard access and visual layout.
5. **Clarify scenario lifecycle.** The mount effect automatically saves My First Scenario and opens its draft even when the user has not saved anything. Propose an explicit empty state with Save scenario, then separate scopes for an unsaved-changes indicator and undo after deletion. Preserve existing saved data and current/draft isolation.
6. **Make payroll details easier to find.** Your and Partner headings currently contain identically named Personal payroll details disclosures, nested inside Payroll details and official sources. Give each disclosure a clear person-specific name and improve access to the selected verified year and active default assumptions. Keep published values source-linked and personal inputs editable; preserve the distinction between modeled income after deductions and final assessed taxable income.

## Evidence and limits

Reviewed `ComparisonTable.tsx`, `LiveCalculatorInputs.tsx`, `LiveCalculatorSettings.tsx`, `Calculator.tsx`, `CalculatorTaxableIncome.tsx`, `PayrollPersonalInputs.tsx` and scenario mutation functions in `calculatorStore.ts`. The initial follow-up review used source inspection. The completed implementation and live verification below supersede its initial mobile-layout uncertainty.

For each selected implementation scope, run the formatter before staging, relevant behavior checks, the full quality audit and the consumer build. Keep financial engine changes separate from UI work and preserve unrelated `test-random/` files.


## Execution order

First fix the pregnancy-positive date setter so selecting October 2026 updates the first pregnancy action as well as the simulation baseline, with a regression check and an isolated commit. Then implement the numbered scopes above in their stated order, separating validation, save gating, row ordering, summary, responsive layout and scenario lifecycle changes into focused commits. Verify each code scope with formatter, full audit, consumer build and relevant UI/behavior checks.

## Selected responsive behavior

At 390px, the live salary field currently extends from about x298 to x566, outside the viewport, while its 250px sticky label column remains visible. Use a single-column live editor below 700px: keep the existing controls mounted, lay out each row as label plus live value, hide saved columns by default and expose them through an explicit Compare saved scenarios toggle. Expanded comparison retains horizontal scrolling. CSS grid handles section-heading spans in the compact view, without duplicating inputs or remounting drafts. Reflow the sticky summary into two columns with the modeled-income amount on its own full-width row. Verify at 390px and 700px plus desktop, including keyboard access, toggle behavior and invalid-edit state.


## Completed progressive commits

- First priority: `44abc52` synchronizes the first pregnancy action and simulation baseline in a batch. October 2026 remains selected and delivery updates to June 2027.
- Scope 1: `e32acdf` labels each salary input with its own unit and period, independently of the result-display buttons.
- Scope 2: `d24085b` validates saved edits; `54c2de8` gates scenario saves on valid visible edits; `f1725f1` extends validation and save gating to optional payroll details, distinguishing valid blank defaults from unfinished or invalid numeric text.
- Scope 3: `7ec6b34` places both partners' inputs before individual deduction rows; `5e80f62` adds a compact sticky summary with annual net, net divided by twelve calendar months and annual modeled income after deductions. Its offset follows the actual navigation height.
- Scope 4: `b4c387c` implements the selected compact mobile editor and explicit comparison toggle without remounting controls.
- Scope 5: `a2a7d62` removes automatic scenario creation and keeps editor activation local to the draft session; `cead3e5` tracks unsaved changes and immediate title/description edits; `a47a8fe` adds deletion undo; `1737eeb` corrects the undo regression test's stale TypeScript narrowing.
- Scope 6: `22aff34` gives personal settings distinct names and exposes current assumptions with the selected profile's official source.
- Additional issue found during verification: `2f9ca73` reveals partner rows immediately when a partner is enabled in a saved draft.

## Final verification

- Formatter ran before staging each commit. The completed source passed `npm run check` with zero errors/warnings and `npm run check:build` for both pages. An intermediate undo-test type error was corrected and the full audit rerun successfully before further implementation.
- Added store regressions for October 2026 and a cross-calendar-year pregnancy selection, unsaved-change detection/reversion, and deletion undo restoring position and the last valid draft.
- Headless rendering and real handler checks passed for zero saved scenarios, live/saved isolation, required and optional invalid/incomplete inputs, valid zero, typed choices, both partners' input ordering, draft partner visibility, unique payroll IDs and calculator/simulator annual-income parity.
- Browser verified October 2026 persists after reload, the displayed delivery is June 2027, result-display changes leave salary input units intact, invalid live/saved edits independently gate the correct Save button, and the first scenario is created only by an explicit action.
- Browser verified dirty indicators, saving and reload without phantom editing; deletion followed by undo; newly enabled saved-draft partner fields; distinct payroll disclosures; optional insurer/factor validation, error isolation across other fields, valid blank defaults and clearing a removed partner's errors.
- Measured the 390px live salary control entirely within the viewport after the compact layout. Verified 700px and desktop layouts, keyboard focus and comparison toggling without losing an invalid edit. Restored the normal browser viewport and test inputs.
- Saved visual evidence under `/tmp/calculator-pregnancy-october.png` and `/tmp/calculator-ui-mobile.png`. No exhaustive assistive-technology or browser-matrix audit was performed.
- Preserved published financial profiles/source links, taxable-income qualification, simulator/calculator input separation, ledger event ordering, existing saved scenarios and unrelated `test-random/` files.
