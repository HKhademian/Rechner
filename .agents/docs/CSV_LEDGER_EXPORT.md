# Ledger CSV v2

The ledger CSV schema is version 2. Persisted scenario JSON and its import envelope remain version 1; this change does not migrate saved inputs.

The shared exporter is `src/engine/storage/ledgerCsv.ts`, re-exported by `exportImport.ts`. Each month contains nonfinancial action rows, financial-event rows in ledger order, then a base row for regular monthly inflows. The `Entry Type` and absolute `Row ID` columns identify each row. Action financial cells contain a dash; event rows contain only their own signed payment and progressive cumulative balance. The base row excludes payments already shown in event rows and ends at the complete month-end balance. Summing `Net Inflow (EUR)` across financial and base rows reproduces the scenario cash total.

Columns are semicolon-delimited with CRLF record separators, decimal points and two fractional digits for monetary values. Commas, semicolons, quotes and newlines in text are quoted; embedded quotes are doubled. Consumers must use a CSV reader rather than splitting on delimiters or newlines. Header names define columns; consumers of the previous flattened monthly schema must opt into v2.

`Scenario Audit (JSON)` is populated on the first data row and retains summary, availability, assumptions, annual tax/benefit audits and sourced configuration. `Month Audit (JSON)` is populated on base rows and retains monthly assumptions, availability and payroll/payment evidence. Source-year projections and unavailable settlements are metadata, not extra cash rows. Rows outside the modeled cash horizon are not fabricated for unpaid annual settlements.

Optional baseline comparisons use absolute month/event IDs, never event titles or types. An unmatched event carries the last matched baseline cumulative checkpoint; a base row compares complete month-end balances. Nonfinancial comparisons remain dashes. UI filtering or collapsing financial rows must not remove them from exported data.
