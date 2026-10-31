# Compact calculator summaries with full detail dialogs

Selected: annual taxable income, Calculation Breakdown and payroll assumptions/sources show compact per-column fields and View details buttons. Full evidence opens in a native modal dialog with named scenario context, Escape/Close support, focus containment and focus return. Keep details synchronized with the respective live/saved/draft calculation; unavailable income stays unavailable. Use explicit annual labels for compact figures. Payroll settings remain in Inputs. Dialogs show read-only evidence, with no link attempting to edit inert background inputs.

Atomic scopes: reusable native dialog and summary components; wire the three result rows; verify distinct columns, modal lifecycle, responsive layout and existing checks. Preserve inputs, calculations and scenario ordering.

## Completed

- `cc4d53c`: Shared compact summary styling and native modal dialog, with portal rendering outside comparison-table constraints, scenario context, Escape/Close and focus return.
- Summary integration: annual modeled income/year/assessment, annual net/deductions/rate, and payroll profile/assumption count now appear per column. View details opens the existing full annual-income and breakdown evidence or the corresponding payroll assumptions and official source. Saved drafts remain explicitly identified; no background-edit link is exposed within a modal.

Validation: formatter, full audit with zero errors/warnings and build passed for each code scope. Headless render checks verified distinct years, partner inclusion, current saved/draft inputs instead of stale cached results, unavailable income and zero gross, and absence of full detail content before opening.

Browser verified all three dialogs, live and saved-draft context, period controls within the breakdown, correct official payroll source, Close and Escape, focus containment and return. At 390px, annual and breakdown dialogs fit without horizontal overflow; adjusted breakdown header and deduction spacing. Restored viewport and removed the temporary saved scenario. Proof: /tmp/calculator-compact-summaries.png and /tmp/calculator-result-dialog.png; mobile capture: /tmp/calculator-breakdown-mobile.png. Inputs, formulas and unrelated test-random/ remain unchanged. No exhaustive assistive-technology/browser matrix was run.
