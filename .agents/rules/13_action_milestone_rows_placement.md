# Event Rows Placement and Financial Values

All events (both user actions and fiscal/special events) that occur in a month must have a separate row placed immediately **before** the actual base monthly row:

1. **User Actions as Events**: User actions (Pregnancy Positive Tests, Child Deliveries, Tax Class Switches, Reversions, and Salary Raises) are non-financial events without net inflow. They must render dashes (`—`) across all financial columns (including cumulative total).
2. **Fiscal Special & Financial Events as Pre-Month Rows**: Fiscal events (13th Month Vacation Bonus, Christmas Bonus, Annual Tax Return Refund, One-Off Costs, Grants) carry valid net inflows.
3. **Cumulative Total on Valid Net Inflow Rows**: Whenever a row has a valid net inflow (monetary event rows), it is meaningful and mandatory to display the resulting progressive **Cumulative Total** (and its differential vs Scenario B) on that row.
4. **No Unrelated Regular Values on Event Rows**: All regular baseline payroll/benefit columns on an event row must display dashes (`—`).
5. **Row Sequence for Month $M$**:
   - `M{M} [Action Event Rows]` (if any)
   - `M{M} [Fiscal Special / Financial Event Rows]` (with valid net inflow and progressive cumulative total)
   - `M{M} [Base Monthly Cash Flow Row]` (with regular inflows and final monthly cumulative total)
6. **Consistency Across Outputs**: This row ordering and presentation must be strictly maintained across the UI table (`TimelineTable.tsx`), the CLI runner (`cli/runner.ts`), and CSV export streams.
