# Event Rows Placement and Financial Values

All events (both user actions and fiscal/special events) that occur in a month must have a separate row placed immediately **before** the actual base monthly row:

1. **User Actions as Events**: User actions (Pregnancy Positive Tests, Child Deliveries, Tax Class Switches, Reversions, and Salary Raises) are non-financial events. They must render dashes (`—`) across all financial columns.
2. **Fiscal Special Events as Pre-Month Rows**: Fiscal events (13th Month Vacation Bonus, Christmas Bonus, Annual Tax Return Refund) must also be rendered as separate event rows **before** the actual month row.
3. **No Unrelated Values on Event Rows**: No other values are required for the event row except the event's special columns (e.g. the bonus/refund amount). All regular payroll/benefit columns on an event row must display dashes (`—`).
4. **Row Sequence for Month $M$**:
   - `M{M} [Action Event Rows]` (if any)
   - `M{M} [Fiscal Special Event Rows]` (if any)
   - `M{M} [Base Monthly Cash Flow Row]`
5. **Consistency Across Outputs**: This row ordering and presentation must be strictly maintained across the UI table (`TimelineTable.tsx`), the CLI runner (`cli/runner.ts`), and CSV export streams.
