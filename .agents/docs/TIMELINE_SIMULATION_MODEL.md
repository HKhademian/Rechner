# Calendar timeline and cash-flow contract

The deterministic simulator consumes baseline conditions, pregnancies, tax switches/reversions, salary and hours changes, and scoped financial events. Gross salaries are recalculated for the actual calendar year and personal payroll settings. Manual net inputs retain their disclosed limitations.

Automatic start calibration subtracts the planning buffer before the first positive pregnancy test and snaps to January of that year. Direct engine inputs can supply another start; missing calendar tax months then remain unavailable. The displayed pregnancy counter starts at `M1` for the first positive test; the ordinary planned birth is eight months later at `M9`. Absolute calendar month/entity IDs remain stable when this relative counter changes.

`incomeSchedule.ts` evaluates chronological classes, raises, hours, maternity reference wages and gross payroll. Internal forecasting completes known calendar-year earnings and benefit averaging beyond the visible horizon, without adding unseen cash months. `allowanceSchedule.ts` freezes each birth/parent's eligible assessment history and processes cohorts in birth order. It does not choose an entitlement from the scenario label or a fixed later-child blend.

Maternity and claim windows are configurable calendar planning conventions. They approximate statutory life-month/day periods. Actual eligibility, overlapping credits and supported-data availability still control payment. Sources and assumptions are retained with the result; see [statutory configuration](./STATUTORY_CONFIGURATION.md).

## Ordered cash rows

For each visible month, `ledger/rows.ts` projects action rows, financial-event rows, then the regular base-month row. Actions carry dashes in financial cells. An event carries its signed amount and the balance after all preceding events in that month. The base row carries regular pay/benefits and the final month-end balance; it does not pay events again.

`monthlyTotal = regularMonthlyTotal + sum(specialEvents.amount)`

`eventBalance = previousMonthFinalBalance + currentMonthEventPrefix`

`monthEndBalance = previousMonthFinalBalance + monthlyTotal`

Summing projected financial-event and regular-row inflows reproduces `summary.grandTotal`. UI, CLI and CSV consume the same projection. An explicitly collapsed UI combines event cash into its visible monthly row; exports always retain the complete stream. Baseline event comparisons use stable IDs, not titles or types. The [CSV v2 contract](./CSV_LEDGER_EXPORT.md) describes ordering, quoting and metadata.

Annual tax balances are assessed only from supported complete calendar records. Signed settlements are scheduled once in the configured following-year month. Missing prior-year data creates no opening refund. Final-year balances outside the visible cash period are disclosed separately and do not inflate cash totals.

The previous fixed monetary matrix is [archived as superseded evidence](../ideation/archive/legacy-timeline-example.md). Use independently worked regression cases and actual audit records for financial expectations.
