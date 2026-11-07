# Project structure

Rechner keeps the public calculator experience, financial models and project documentation in separate areas.

```text
src/
├── apps/          Calculator registrations and independent app entry points
├── components/    Shared interface and calculator-specific views
├── data/          Source-linked statutory rates, limits and conventions
├── engine/        Calculation, timeline, storage and export logic
├── pages/         Astro routes for the catalog and each calculator
├── store/         Reactive UI state and calculator adapters
└── styles/        Shared visual system
test/              Cross-cutting scenario, combination and benchmark tests
docs/              Public project guides
.agents/docs/      Detailed architecture and model contracts
```

## Where to look

- [Calculator app contract](../.agents/docs/CALCULATOR_APPS.md) explains registration, isolated state and browser-storage ownership.
- [Technical architecture](../.agents/docs/ARCHITECTURE.md) describes how routes, interfaces, stores and engines fit together.
- [Statutory model and limits](../.agents/docs/GERMAN_TAX_AND_ELTERNGELD_SCHEMES.md) and [configuration](../.agents/docs/STATUTORY_CONFIGURATION.md) document sourced rules and supported cases.
- [Timeline model](../.agents/docs/TIMELINE_SIMULATION_MODEL.md) defines the planning horizon and cash-flow projection.
- [CSV format](../.agents/docs/CSV_LEDGER_EXPORT.md) documents exported data and migration behavior.
- [Contributing](../CONTRIBUTING.md) covers local setup and pull requests.
