# Financial model contracts

Payroll withholding, standardized BEEG net, annual tax liability and cash received are separate calculations. Current contracts and support limits are documented in [Statutory configuration](./STATUTORY_CONFIGURATION.md).

- Payroll uses verified year profiles and the offline BMF PAP, with validated personal inputs and explicit limitations for unsupported contribution regimes.
- Benefits use each parent's frozen eligible history, personal Plus ceiling, household sibling eligibility, claim budgets and prior-year taxable-income eligibility. Missing prehistory is a labeled initial-baseline assumption; it is not annual tax evidence.
- Annual joint assessment aggregates supported complete-year earnings, contributions, withholding and progression income. Signed credits minus liability can yield a refund or repayment; no fixed deduction refund is added.
- Cash receipts follow configured timing. Unavailable payments are omitted visibly, and unsettled balances outside the horizon remain audit metadata.

Values, effective profiles and primary source links live in the configuration data and are retained in simulation results. Independent monetary references live under `test/fixture/` and co-located engine tests. [CSV v2](./CSV_LEDGER_EXPORT.md) preserves the shared action/event/base-month row stream and audit metadata.

The former illustrative formulas are [archived as superseded review evidence](../ideation/archive/legacy-financial-formulas.md); their fixed values and guarantees do not describe current behavior.
