import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  ledgerRowsFixture,
} from "../../../test/fixture/ledgerRows.ts";
import {
  exportScenarioToCsv,
} from "#engine/storage/ledgerCsv";
import {
  LedgerRowKind,
  projectScenarioRows,
} from "#engine/ledger/rows";

/** Independent reader verifies quoted delimiters, escaped quotes and embedded newlines. */
function readCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"'; index++;
      }
      else {
        quoted = !quoted;
      }
    }
    else if (!quoted && (char === ";" || char === "\r")) {
      row.push(value); value = "";
      if (char === "\r") {
        assert.equal(text[++index], "\n"); rows.push(row); row = [];
      }
    }
    else {
      value += char;
    }
  }
  assert.equal(quoted, false);
  row.push(value); rows.push(row);
  return rows;
}

it("exports the shared five-event stream with exact balances, dashes, quoting and audit metadata", () => {
  const result = ledgerRowsFixture();
  const projected = projectScenarioRows(result, ledgerRowsFixture(90));
  const [headers, ...rows] = readCsv(exportScenarioToCsv(result, ledgerRowsFixture(90)));
  const at = (row: string[], title: string) => row[headers.indexOf(title)];
  assert.equal(rows.length, projected.length);
  rows.forEach((row, index) => {
    const expected = projected[index];
    assert.equal(at(row, "Row ID"), expected.rowId);
    assert.equal(at(row, "Entry Type"), expected.kind);
    assert.equal(at(row, "Net Inflow (EUR)"), expected.amount?.toFixed(2) ?? "—");
    assert.equal(at(row, "Cumulative Net Inflow (EUR)"), expected.cumulative?.toFixed(2) ?? "—");
    assert.equal(at(row, "Delta Cumulative vs B (EUR)"), expected.deltaCumulative?.toFixed(2) ?? "—");
    if (expected.kind !== LedgerRowKind.Month) {
      assert.equal(at(row, "Husband Salary (EUR)"), "—");
    }
    if (expected.kind === LedgerRowKind.FinancialEvent) {
      assert.equal(at(row, "Phase / Event Name"), expected.event.title);
    }
  });
  const metadata = JSON.parse(at(rows[0], "Scenario Audit (JSON)"));
  assert.equal(metadata.taxComplete, false);
  assert.ok(metadata.assumptions.some((note: string) => note.includes("Manual net")));
  assert.equal(metadata.configuration.benefitRules.basisMinimum.value, 300);
  assert.match(metadata.configuration.benefitRules.basisMinimum.source, /beeg/);
  assert.equal(rows.filter((row) => at(row, "Entry Type") === LedgerRowKind.FinancialEvent).length, 5);
  assert.equal(rows.reduce((sum, row) => sum + (at(row, "Net Inflow (EUR)") === "—" ? 0 : Number(at(row, "Net Inflow (EUR)"))), 0), 36060);
});
