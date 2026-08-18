# Zero Redundant Type Casting on Branded Types

All TypeScript code in this repository must avoid unnecessary and redundant type assertions (`as number`, `as string`) on nominal branded types.

## 1. Branded Types are Native Subtypes of Their Base Primitives
Branded types in this project are defined as intersection types:
```typescript
export type Brand<K, T> = K & { readonly [_BRAND_TAG]: T };
export type EuroAmount = Brand<number, "EuroAmount">;
export type NetSalary = Brand<EuroAmount, "NetSalary">;
export type WorkingHours = Brand<number, "WorkingHours">;
export type SimulationMonth = Brand<number, "SimulationMonth">;
export type PercentageRate = Brand<number, "PercentageRate">;
```

Because `Brand<number, T>` is an intersection with `number`, TypeScript automatically recognizes all branded numeric types as valid `number` values:
- **Arithmetic Operations**: `preBirthNet - partTimeNet`, `loss * rate`, `a + b`
- **Relational Comparisons**: `weeklyHours <= 32`, `motherHours >= 24`, `month < 12`
- **Math Library Functions**: `Math.max(0, loss)`, `Math.min(900, val)`, `Math.round(benefit)`
- **Formatting APIs**: `new Intl.NumberFormat(...).format(amount)`

## 2. Redundant `as number` is Strictly Prohibited
- Never write `(amount as number)`, `(hours as number)`, `(month as number)`, or `(net as number)`.
- Downcasting a branded number to `number` using `as number` pollutes code readability, introduces noise, and defeats the purpose of strong typing.

```typescript
// ❌ BAD: Superfluous type assertions
const loss = Math.max(0, (preBirthNet as number) - (partTimeNet as number));
const rawBenefit = loss * (rate as number);
if ((weeklyHours as number) > 32) return false;

// ✅ GOOD: Clean, idiomatic native operations
const loss = Math.max(0, preBirthNet - partTimeNet);
const rawBenefit = loss * rate;
if (weeklyHours > 32) return false;
```

## 3. One-Way Constructor Pattern
- **Primitive -> Branded Type**: Always use constructor functions (`toEuroAmount(x)`, `toNetSalary(x)`, `toWorkingHours(x)`, `toPercentageRate(x)`).
- **Branded Type -> Computation / Primitive**: Use the branded variable directly without any type casting.
