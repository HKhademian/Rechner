# Const Enums and Prohibition of Raw String Unions

Raw string union types (e.g. `'husband' | 'wife'`, `'pregnancy' | 'tax_switch'`) are strictly prohibited in the codebase.

All categorical domains, modes, event types, and target identifiers must be defined using the TypeScript `const` object enum pattern:

```typescript
export const ActionCategory = {
  Pregnancy: 'PREGNANCY',
  TaxSwitch: 'TAX_SWITCH',
  SalaryRaise: 'SALARY_RAISE'
} as const;
export type ActionCategory = (typeof ActionCategory)[keyof typeof ActionCategory];
```

Each const enum must have a runtime type guard constructor (e.g. `toActionCategory(val: string): ActionCategory`) that validates values against `Object.values()` and throws a descriptive `TypeError` on invalid input.
