# Agent Guidelines for lucid-hertz

This document contains strict rules and guidelines for any AI agents working on this codebase. All rules are formally managed as individual guidelines in the [`.agents/rules/`](file:///Users/ho/Projects/calculator/.agents/rules/) directory.

---

## 1. Strict Git Commits & Logical Ordering ([`06_atomic_commits.md`](file:///Users/ho/Projects/calculator/.agents/rules/06_atomic_commits.md), [`08_git_commit_order.md`](file:///Users/ho/Projects/calculator/.agents/rules/08_git_commit_order.md))

**CRITICAL RULE:** No mixture of intent is ever allowed in a single git commit. 
You must commit each feature, each step, and each group of logical changes separately.

- **Do NOT** lump unrelated features into a single "WIP" or "Update" commit.
- **Do NOT** commit refactoring along with new feature additions. 
- **Do NOT** commit bug fixes in the same commit as a new feature.
- Follow logical commit order: Configs/ignore $\rightarrow$ Dependencies $\rightarrow$ Documentation $\rightarrow$ Core Logic $\rightarrow$ UI/High-level features.

---

## 2. Strongly-Typed Domain Modeling & Const Enums ([`10_strongly_typed_domain_modeling.md`](file:///Users/ho/Projects/calculator/.agents/rules/10_strongly_typed_domain_modeling.md), [`11_const_enums_and_no_raw_strings.md`](file:///Users/ho/Projects/calculator/.agents/rules/11_const_enums_and_no_raw_strings.md), [`12_branded_types_and_constructors.md`](file:///Users/ho/Projects/calculator/.agents/rules/12_branded_types_and_constructors.md))

- **Zero Raw String Unions**: Never use `'a' | 'b'`. Always use TypeScript `const` object enums (e.g. `ActionCategory`, `ActionType`, `TargetPerson`, `TaxClass`, `ScenarioId`).
- **Nominal Branded Primitives & IDs**: Use `Brand<string, '...'>` / `Brand<number, '...'>` for all domain entities (`ActionId`, `PregnancyId`, `SwitchId`, `RaiseId`, `SimulationMonth`, `NetSalary`, `EuroAmount`, etc.).
- **Validating Constructors**: All branded types and const enums must be instantiated through exported validating constructor functions (`toActionId`, `toTargetPerson`, etc.) that throw `TypeError` on invalid inputs.

---

## 3. Event Rows Placement & Presentation ([`13_action_milestone_rows_placement.md`](file:///Users/ho/Projects/calculator/.agents/rules/13_action_milestone_rows_placement.md))

- **All Events Placed Pre-Month**: All events occurring in a month (both User Action Events and Fiscal Special Events like 13th salary bonuses and tax return refunds) must have their separate row placed **immediately before** the actual monthly cash flow row (`M(M-1) -> M(M) [Action Events] -> M(M) [Fiscal Events] -> M(M) [Base Monthly Row]`).
- **Zero / Dash Non-Event Values**: No other regular values are required for event rows. All non-applicable regular financial columns must show dashes (`—`). Only the event's special columns carry values (if applicable).

---

## 4. Statutory Simulation Start Auto-Calibration ([`14_statutory_simulation_start_calculation.md`](file:///Users/ho/Projects/calculator/.agents/rules/14_statutory_simulation_start_calculation.md))

- Simulation start date must be at least **3 months before the positive pregnancy test** and snap to the **first month (January / 01) of the resulting calendar year**.

---

## 5. Timeline Notation & Relative Pregnancy Counter ([`15_timeline_notation_and_pregnancy_counter.md`](file:///Users/ho/Projects/calculator/.agents/rules/15_timeline_notation_and_pregnancy_counter.md))

- Relative month counter (`Mx`) starts from the **first positive pregnancy test** (`M0 (Pregnancy Positive)`), NOT child delivery.
- Pre-pregnancy months are labeled with negative offsets (`M-1`, `M-2`, ..., `M-8`).
- Child delivery milestone occurs at `M+8 (Birth 1)`.

---

## 6. Discrete 4-Batch Lifecycle Architecture ([`16_batch_action_architecture.md`](file:///Users/ho/Projects/calculator/.agents/rules/16_batch_action_architecture.md))

The simulator processes state transitions in 4 modular batches:
1. **Batch 0**: Preexisting conditions (Initial salaries, tax classes, Kindergeld, duration).
2. **Batch 1**: Pregnancy actions (Positive test date, delivery date, part-time net, partner months).
3. **Batch 2**: Tax class switch actions (Effective month, target classes, statutory reason, revert month).
4. **Batch 3**: Salary raise actions (Effective month, percentage, target person, reason).

---

## 7. Headless CLI Runner Preference ([`17_headless_cli_runner_preference.md`](file:///Users/ho/Projects/calculator/.agents/rules/17_headless_cli_runner_preference.md))

- Prefer running and testing simulations headlessly via `npm run sim -- [options]`.
- Minimize web browser captures and DOM recordings to essential UI/CSS styling validations only.

---

## 8. Code Style & Automated Quality Checks ([`20_code_style_and_formatting.md`](file:///Users/ho/Projects/calculator/.agents/rules/20_code_style_and_formatting.md), [`21_automated_quality_checks.md`](file:///Users/ho/Projects/calculator/.agents/rules/21_automated_quality_checks.md))

- **Automated Linting & Formatting**: Enforce strict ESLint 9 + `@stylistic` rules:
  - Unix `\n` line endings, 2-space indentation (no tabs)
  - Double quotes `"` for strings and imports, trailing commas everywhere
  - Mandatory `{ ... }` blocks for all conditionals and loops (zero blockless code)
  - Stroustrup brace style (`}\nelse {`, `}\ncatch {`)
  - Inline type imports with types on top (`import {\n  type X,\n  valueY,\n} from "..."`)
  - Multiline import specifiers (one item per line)
  - Zero unused imports and no duplicate imports
- **Mandatory Formatter Workflow**: Agents and developers MUST run `npm run fix` before staging any git commit. Git pre-commit hooks and `npm run check` automatically block and reject unformatted code.
- **Verification Matrix**: Run `npm run check` / `npm run check:audit` before committing.

---

## 9. Zero Redundant Downcasting on Branded Types ([`23_no_redundant_type_casting.md`](file:///Users/ho/Projects/calculator/.agents/rules/23_no_redundant_type_casting.md))

- Nominal branded types (`Brand<number, Tag>`) are intersection types with `number` and natively support all arithmetic (`+`, `-`, `*`, `/`), comparisons (`<`, `>`, `<=`, `>=`), and math utilities.
- **Strictly Prohibited**: Never cast branded types to primitives (`as number`, `as string`). Use variables directly in calculations without casting noise.
- **No Loose Fallback Union Signatures**: Never type domain parameters as `Type | number` or `Type | string`. Domain functions must strictly require the branded type (`WorkingHours`, `NetSalary`, `ChildIndex`, etc.). Raw primitives may only be passed to designated constructor functions (`toWorkingHours`, `toNetSalary`, `toChildIndex`) at system boundaries.
- Only cast/validate when constructing branded types from raw inputs via runtime constructors (`toEuroAmount`, `toNetSalary`, `toWorkingHours`, etc.).
