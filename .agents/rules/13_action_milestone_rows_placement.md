# Action Milestone Rows Placement and Financial Values

Action events (Pregnancy Positive Tests, Child Deliveries, Tax Class Switches, Tax Reversions, and Salary Raises) are non-costing / non-financial life and career actions.

Rules for Action Milestone Rows:
1. **Zero / Dash Financial Values**: Action rows carry no monetary values in financial columns. They must display dashes (`—`) or empty values rather than 0 € or numerical totals.
2. **Placement Immediately Before Triggering Month**: Every action taking effect at simulation month $M$ must be rendered as a dedicated milestone row immediately *before* month $M$'s base ledger row (e.g. sequence: `M11`, `M12 [Action Row]`, `M12 [Monthly Cash Flow Row]`).
3. **Consistency Across Outputs**: This row ordering and presentation must be strictly maintained across the UI table (`TimelineTable.tsx`), the CLI scenario runner (`cli/runner.ts`), and CSV export streams.
