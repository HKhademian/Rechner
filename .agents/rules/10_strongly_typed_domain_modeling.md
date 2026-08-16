# Strongly Typed Domain Modeling & Branded Types

All mathematical models, domain calculations, financial ledgers, and simulation engines must use strict TypeScript with branded / nominal types.

- **Branded Types Required**: Primitives like `number` and `string` must not be used loosely for domain-critical values. Use nominal types:
  - `SimulationMonth` (1–60) vs `CalendarYear` (1–5) vs `CalendarMonth` (1–12)
  - `GrossSalary` vs `NetSalary` vs `EuroAmount` vs `EuroCents`
  - `WorkingHours` (e.g. 24h, 32h, 40h)
  - `TaxClass` (`'I' | 'II' | 'III' | 'IV' | 'V' | 'VI'`)
  - `StatutoryCitation` (e.g. `'EStG § 26b'`, `'BEEG § 2b'`)
  - `ScenarioId` (`'A' | 'B' | 'C'`)
- **Strict Compile-Time Safety**: Type checking must be configured with `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`, preventing unit confusion, rounding discrepancies, and logical errors at compile time.
- **Pure Functional Core**: Domain calculation primitives must be pure, immutable, and fully testable in isolation.
