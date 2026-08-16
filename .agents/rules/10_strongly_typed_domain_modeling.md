# Strongly Typed Domain Modeling & Branded Types

All mathematical models, domain calculations, financial ledgers, and simulation engines must use strict TypeScript with branded / nominal types.

- **Branded Types Required**: Primitives like `number` and `string` must not be used loosely for domain-critical values. Use nominal branded types:
  - `SimulationMonth` (1–60) vs `CalendarYear` (1–5) vs `CalendarMonth` (1–12)
  - `GrossSalary` vs `NetSalary` vs `EuroAmount` vs `EuroCents`
  - `WorkingHours` (e.g. 24h, 32h, 40h)
  - `StatutoryCitation` (e.g. `'EStG § 26b'`, `'BEEG § 2b'`)
- **Const Enums for Categorical Domains (No Raw String Unions)**:
  - Raw string union types (e.g. `'I' | 'II' | 'III'`) are strictly prohibited.
  - All categorical domains must be defined as `const` enums with matching types and explicit member access:
    ```typescript
    export const TaxClass = { I: 'I', II: 'II', III: 'III', IV: 'IV', V: 'V', VI: 'VI' } as const;
    export type TaxClass = (typeof TaxClass)[keyof typeof TaxClass];

    export const ScenarioId = { A: 'A', B: 'B', C: 'C' } as const;
    export type ScenarioId = (typeof ScenarioId)[keyof typeof ScenarioId];

    export const TransactionType = { SalaryBase: 'SALARY_BASE', ... } as const;
    export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];
    ```
- **Strict Compile-Time Safety**: Type checking must be configured with `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`, preventing unit confusion, rounding discrepancies, and logical errors at compile time.
- **Pure Functional Core**: Domain calculation primitives must be pure, immutable, and fully testable in isolation.
