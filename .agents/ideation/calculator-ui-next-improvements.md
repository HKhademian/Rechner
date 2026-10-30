---
name: Calculator UI follow-up candidates
status: proposed
created: 2026-10-30
---

# Calculator UI follow-up candidates

The user asked what else could be improved after consolidating inputs into Live Calculation. These are proposed scopes based on the current source, not approved implementation work. Keep any selected work small, progressive and atomic. The completed inline-editing work is recorded in `editable-live-calculation.md`.

## Suggested order

1. **Clarify salary units and period.** Gross input rows currently say Gross Income or Partner Gross, while the input basis is a separate row and the result display has its own Monthly/Yearly buttons. Add the actual input basis and euro unit beside each column's salary control/value, including saved columns with a different basis. Label the result-period control explicitly. This scope must preserve salary values and calculation behavior.
2. **Make saved editing as robust as live editing.** Saved numeric editors currently coerce blank input to zero and call `updateScenarioInput`, which calculates the candidate without a UI error boundary. Preserve incomplete text, validate candidates, report field errors, retain the last valid draft and add accessible labels/focus states. Separately prevent save actions from silently capturing the last valid result while an intended live edit is invalid or incomplete.
3. **Shorten the path from inputs to results.** Parameter rows currently follow summary and deduction rows for each person. Place frequently edited inputs before detailed deductions, while keeping a compact result summary visible. Treat moving input rows and adding a persistent summary as separate scopes; do not recreate a duplicate input form.
4. **Improve narrow-screen editing.** The comparison uses a fixed 250px sticky label column and 300px live column inside horizontal overflow. Test representative narrow widths, then make the live editor usable without forcing horizontal scrolling between a field name and its control. Keep side-by-side comparison available for saved scenarios. Define the responsive behavior before implementation and verify keyboard access and visual layout.
5. **Clarify scenario lifecycle.** The mount effect automatically saves My First Scenario and opens its draft even when the user has not saved anything. Propose an explicit empty state with Save scenario, then separate scopes for an unsaved-changes indicator and undo after deletion. Preserve existing saved data and current/draft isolation.
6. **Make payroll details easier to find.** Your and Partner headings currently contain identically named Personal payroll details disclosures, nested inside Payroll details and official sources. Give each disclosure a clear person-specific name and improve access to the selected verified year and active default assumptions. Keep published values source-linked and personal inputs editable; preserve the distinction between modeled income after deductions and final assessed taxable income.

## Evidence and limits

Reviewed `ComparisonTable.tsx`, `LiveCalculatorInputs.tsx`, `LiveCalculatorSettings.tsx`, `Calculator.tsx`, `CalculatorTaxableIncome.tsx`, `PayrollPersonalInputs.tsx` and scenario mutation functions in `calculatorStore.ts`. This follow-up review used current source inspection; it did not add browser measurements or new test results. Mobile concerns are inferred from fixed column sizes and require device-width verification before choosing a layout.

For each selected implementation scope, run the formatter before staging, relevant behavior checks, the full quality audit and the consumer build. Keep financial engine changes separate from UI work and preserve unrelated `test-random/` files.
