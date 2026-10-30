import {
  ledgerRowsFixture,
} from "../../../test/fixture/ledgerRows.ts";
import assert from "node:assert/strict";
import {
  it,
} from "node:test";




import {
  toCalendarMonth,
  toFullCalendarYear,
  toEuroAmount,
} from "#engine/types";
import {
  LedgerRowKind,
  projectLedgerMonth,
  projectScenarioRows,
  toLedgerRowKind,
} from "#engine/ledger/rows";
import {
  applyAnnualTaxSettlements,
} from "#engine/ledger/taxSettlements";


it("retains all five financial events and progressive balances in a 36-month ledger", () => {
  const result = ledgerRowsFixture();
  const rows = projectScenarioRows(result);
  assert.equal(rows.filter((row) => row.kind === LedgerRowKind.FinancialEvent).length, 5);
  const february = projectLedgerMonth(result.months[1]);
  assert.deepEqual(february.map((row) => row.kind), [LedgerRowKind.Action, ...Array(5).fill(LedgerRowKind.FinancialEvent), LedgerRowKind.Month]);
  assert.equal(february[0].amount, null);
  assert.equal(february[0].cumulative, null);
  assert.deepEqual(february.slice(1).map((row) => row.cumulative), [1100, 1050, 1075, 1065, 1060, 2060]);
  assert.equal(rows.reduce((sum, row) => sum + (row.amount ?? 0), 0), 36060);
  assert.equal(rows.at(-1)?.cumulative, result.summary.grandTotal);
  assert.equal(toLedgerRowKind(LedgerRowKind.Action), LedgerRowKind.Action);
  assert.throws(() => toLedgerRowKind("ROW"), TypeError);
});

it("matches stable IDs instead of duplicate titles and preserves signed tax events", () => {
  const result = ledgerRowsFixture();
  const baseline = ledgerRowsFixture(90);
  const rows = projectLedgerMonth(result.months[1], baseline.months[1]);
  assert.deepEqual(rows.slice(1, 6).map((row) => row.deltaAmount), [10, 0, 0, 0, 0]);
  assert.deepEqual(rows.slice(1).map((row) => row.deltaCumulative), [10, 10, 10, 10, 10, 10]);
  const months = applyAnnualTaxSettlements(result.months, [{ calendarYear: toFullCalendarYear(2026),
    settlement: toEuroAmount(-560),
    creditedIncomeTax: toEuroAmount(4000),
    creditedSolidarity: toEuroAmount(0),
    totalLiability: toEuroAmount(4560) }], toCalendarMonth(3));
  const taxRows = projectLedgerMonth(months[14]);
  assert.equal(taxRows[0].amount, -560);
  assert.equal(taxRows[0].cumulative, 13500);
  assert.equal(taxRows[1].amount, 1000);
  assert.equal(taxRows[1].cumulative, 14500);
  assert.throws(() => projectLedgerMonth({ ...result.months[1],
    specialEvents: [] }), /reconcile/);
  assert.throws(() => projectLedgerMonth(result.months[1], baseline.months[0]), /absolute/);
});
