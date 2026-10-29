---
name: Engine correctness - sequential repair plan
status: in_progress
created: 2026-10-29
todos:
  - id: wave-1-benefits
    content: "Complete benefit formula and father-allocation fixes"
    status: in_progress
  - id: wave-2-payroll
    content: "Complete year-aware payroll, periods, and shared adapters"
    status: pending
  - id: wave-3-assessment
    content: "Complete assessment, reconciliation, export parity, and final verification"
    status: pending
plans:
  requires: []
  blocks: []
  parallel: []
  children:
    - wave: 1
      sequential: true
      plans: [engine-correctness-benefits.md]
    - wave: 2
      sequential: true
      plans: [engine-correctness-payroll.md]
    - wave: 3
      sequential: true
      plans: [engine-correctness-assessment.md]
---

# Engine correctness: sequential repair plan

## Mission

Repair the financial engine one independently verified change at a time before feature development. Cover all eight findings from the 2026-10-29 review, including shared payroll and output contracts that affect the engine's visible results. This file defines order only; concrete edits and acceptance criteria live in the child plans. Implementation is authorized and proceeds sequentially in atomic commits.

## Done

- Read all project rules and reviewed the engine, stores, CLI, tests and export paths.
- `npm run check` and `npm run check:build` passed during the review; that establishes the existing baseline, not statutory accuracy.
- Direct probes reproduced: Plus 900 instead of 650 for 2000/0 net; no 2770 assessment cap; incorrect sibling minimum/maximum; father 40h and zero requested months still receives four payments; a zero-income household receives 2550 assumed refunds over 36 months; early and late class switches yield the same entitlement; six versus twelve working months leaves earnings unchanged; shared CSV folds five events into 36 monthly rows.
- Simulator tax parameters are stale, and the general calculator duplicates payroll formulas. No production or test code has been changed by this planning task.

## Execution order

### Wave 1 - benefits (sequential; start here)

- Child: [benefit repairs](./engine-correctness-benefits.md), highest priority, no parallel work.
- Fixes: `plus-personal-ceiling` -> `capped-assessable-net` -> `sibling-bonus` -> `father-allocation`.
- Command when implementation is requested: `/xplan @.agents/ideation/engine-correctness-benefits.md`.
- Gate: all four fixes have source-backed regressions and the ordinary father-payment defect is removed. Complete own-parent assessment wiring in wave 3 before claiming full father entitlement correctness.

### Wave 2 - payroll (after wave 1)

- Child: [payroll foundation](./engine-correctness-payroll.md), prerequisite for reliable assessment/reconciliation, no parallel work.
- Fixes: `annual-rules` -> `payroll-calculation` -> `working-periods` -> `shared-payroll`.
- Command: `/xplan @.agents/ideation/engine-correctness-payroll.md`.
- Gate: verified year-specific payroll, meaningful active working periods, and shared computation across consumers. Updating constants alone does not satisfy the payroll gate.

### Wave 3 - assessment and reconciliation (after wave 2)

- Child: [assessment and reconciliation](./engine-correctness-assessment.md), final correctness and integration gate, no parallel work.
- Fixes: `assessment-history` -> `annual-reconciliation` -> `export-parity` -> `end-to-end-gate`.
- Command: `/xplan @.agents/ideation/engine-correctness-assessment.md`.
- Gate: history-driven frozen benefits, signed actual tax reconciliation, consistent outputs, and independently worked end-to-end cases pass.

## Additional user constraint (2026-10-29)

Statutory numeric values must be configurable, validated, and accompanied by a direct official source URL. Keep default values and source metadata out of calculation bodies; propagate configuration through callers and explanations. Independently specified regression expectations remain literal reference values, not a second copy of production configuration.

## Per-fix workflow

1. Read the relevant official rule and record the effective year and supported assumptions. Resolve any material input-contract or rounding ambiguity before coding that fix.
2. Add the smallest regression that fails for the reviewed defect, with an independently established expected result. For monetary fixes, combine exact reference cases with boundary and conservation checks; do not derive expected values from the function being tested.
3. Implement only that correction. Update directly related incorrect tests and statutory explanations; do not mechanically bless changed totals or reduce assertions to get green tests.
4. Run focused tests, then `npm run fix` before staging as required by project rules. Inspect the diff for unrelated formatting changes. Run `npm run check`; run `npm run check:build` when imports, interfaces or consumers change, and at each wave's final gate.
5. Commit only that logical fix plus its tests and necessary documentation. Split prerequisite configuration/dependency/data work into earlier atomic commits. Record the reference result, observed result and verification outcome before advancing to the next todo. A phase is an execution boundary, not permission to batch unrelated fixes into one commit.

## Constraints and shared key facts

- Follow [all project rules](../rules/). Plans live in `.agents/ideation/` because the project's user-supplied rule 09 overrides the plan skill's default folder.
- Execute sequentially; no parallel agents are requested. These plans share `types.ts`, `timelineGenerator.ts`, stores and CLI, so concurrent edits would conflict. The active wave owns those files.
- Strict TypeScript, validated branded domain primitives, const-object enums, immutable pure calculation functions. Respect the established style and telemetry opt-outs.
- Astro 7/Preact UI, Preact signals, Node native tests, package import aliases. Discover exact installed/runtime versions again at implementation time if needed.
- Keep payroll take-home, BEEG synthetic net, annual tax liability, and cash received in different result fields/contracts. Preserve manual-net input mode with honest limits on what can be inferred.
- Use source-specific decimal/rounding rules and currency conservation. Do not replace every existing number with a new money framework as an unrelated refactor.
- Keep existing saved-state formats compatible or supply a tested versioned migration. Preserve absolute calendar month IDs and action-before-event-before-month ordering.
- No UI redesign, optimizer expansion, extra product features, or arbitrary architecture cleanup. Change presentation only to show corrected results and necessary assumptions consistently.
- Verified historical/current rules and projected future assumptions must remain distinguishable. Refresh official effective versions before implementation; no source establishes future law merely because a forecast reaches that year.

## Overall acceptance

- All eight review findings have regressions and corrected behavior; the first two benefit errors remain separate fixes.
- Payroll, each parent's benefit assessment, annual taxation, and cash-flow timing are validated independently before relying on the combined scenario total.
- Equivalent supported inputs agree across calculator, simulator, CLI and exports. Entitlements cannot be selected by a scenario label, generated from ineligible hours, or inflated by assumed tax refunds.
- Full checks/build pass, meaningful reference cases pass, and remaining approximations are recorded without claiming complete statutory coverage.

## Plan lifecycle

Update todo and wave status as work completes. These files are the permanent investigation/repair record under project rule 09: retain the completed plan or move its completed decision/evidence summary into `.agents/ideation/` before removing execution scaffolding. Do not delete the only recorded rationale when finishing the work.
