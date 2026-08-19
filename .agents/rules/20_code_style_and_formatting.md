# Code Style and Formatting Guidelines

All TypeScript, TSX, Astro, and JavaScript source and test files in this repository must adhere strictly to the following code style, formatting, and cleanliness standards, enforced automatically by ESLint and `@stylistic`:

## 1. Double Quotes for Strings and Imports
- Always use double quotes (`"`) for strings, ESM imports, and object property keys where quotes are required.
- Do not use single quotes (`'`) for string literals or ESM import specifiers.
- Template literals (`` `...` ``) are reserved for string interpolation or multiline text.

## 2. Trailing Commas Everywhere
- Include a trailing comma (`,`) at the end of every element in multiline:
  - Object literals and type/interface definitions
  - Array literals and tuple definitions
  - Function/method parameter lists and argument calls
  - Import and export specifier lists
  - Enum definitions

## 3. Unix Line Endings & 2-Space Indentation
- All files must use standard Unix line endings (`\n` / LF).
- Indentation must strictly use 2 spaces per indentation level. Tabs are disallowed.

## 4. Strict Mandatory Blocks for All Control Flow and Loops
- Zero blockless statements allowed across the codebase.
- All conditional statements (`if`, `else`, `else if`) and loops (`for`, `for...in`, `for...of`, `while`, `do...while`) MUST enclose their bodies within explicit `{ ... }` curly brace blocks.

## 5. Stroustrup Brace Style (Else on New Line)
- Closing curly braces must be followed by a newline before `else`, `else if`, `catch`, or `finally`:
```ts
if (condition) {
  // branch A
}
else if (otherCondition) {
  // branch B
}
else {
  // branch C
}
```

## 6. Inline Type Imports & Types on Top
- Type imports must use inline `type` specifiers within the named import list.
- **Types First / Types on Top**: Inside every named import (and export) specifier block `{ ... }`, all `type` specifiers MUST precede all value/runtime identifiers. Never interleave type imports with values or place types after values.
```ts
// Correct: Types at the top, values below
import {
  type StrategyId,
  type PregnancyAction,
  type TaxClassSwitchAction,
  type ScenarioActionBatches,
  type PreexistingConditions,
  SimulationStrategy,
  TaxClass,
  toSwitchId,
  toSimulationMonth,
  toCalendarMonth,
  toFullCalendarYear,
} from "#engine/types";

// Incorrect: Mixing types and values or values above types
import {
  SimulationStrategy,
  type StrategyId,
  TaxClass,
  type PregnancyAction,
} from "#engine/types";
```

## 7. Multiline Import & Export Formatting (One Item Per Line)
- Inside named import and export specifier blocks `{ ... }`, **every single identifier must occupy its own separate line** with 2-space indentation and a trailing comma.
- Never place multiple specifiers on the same line (e.g. `useState, useRef,`).
```ts
// Correct: Strictly one item per line
import {
  useState,
  useRef,
} from "preact/hooks";

// Incorrect: Multiple items on the same line
import {
  useState, useRef,
} from "preact/hooks";
```

## 8. No Unused Imports and Duplicate Imports
- Unused imports are strictly prohibited and auto-removed by `npm run fix` / `npm run lint:fix`.
- Duplicate import declarations from the same module must be merged.

## 9. Long Function Signatures and Parameter Wrapping
- Function signatures with multiple parameters or long signatures must wrap each parameter onto its own line with clear indentation and trailing commas.

## 10. Code Quality & Financial Precision Standards
- **Strict Equality**: Always use `===` and `!==` (`eqeqeq: always`).
- **Immutable Bindings**: Use `const` by default; `var` is disallowed.
- **Object Shorthand**: Use `{ key }` syntax instead of `{ key: key }`.
- **Template Literals**: Prefer template strings over concatenation with `+`.
