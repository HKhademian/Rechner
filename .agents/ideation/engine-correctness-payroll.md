---
name: Engine correctness - payroll foundation
status: in_progress
created: 2026-10-29
todos:
  - id: annual-rules
    content: "Fix 5 - version tax and contribution rules by year"
    status: completed
  - id: payroll-calculation
    content: "Fix 6 - replace payroll approximations with verified calculations"
    status: completed
  - id: working-periods
    content: "Fix 7 - apply active working months and bonus schedules"
    status: in_progress
  - id: shared-payroll
    content: "Fix 8 - use one payroll engine across calculator, simulator, and CLI"
    status: pending
plans:
  requires: [engine-correctness-benefits.md]
  blocks: [engine-correctness-assessment.md]
  parallel: []
---

# Engine correctness: payroll foundation

## Done

- 2026-10-29: period payroll now runs PAP only in active months, passes actual year-to-date earnings/caps and expected annual pay to bonus calculations, and preserves itemized bonus deductions. Personal insurer rates reach both PAP and contributions. Three payroll conservation/parity tests and the full quality check pass; calculator integration follows.

- 2026-10-29: employment-period normalization now preserves actual yearly totals, prorates monthly salary and contractual extras by active months, allocates residual cents, and accepts explicit bonus schedules. Five boundary tests and the full quality check pass. Caller integration remains in progress; changing the UI input does not yet invoke this helper.

- 2026-10-29: replaced withholding approximations with pinned offline PAP 1.0.7. Eighteen independent 2026 BMF API fixtures, six published annual examples across 2025/2026, and domain adapter/conservation cases pass (30 focused payroll tests). Bonus contributions respect YTD caps; care age/state inputs and church tax are modeled; factor uses PAP wage-tax bases. Full quality check and production build pass. Regular payroll net is no longer presented as BEEG synthetic net. User selected verified profiles plus editable personal inputs, not hypothetical tariffs; unsupported PAP overrides fail explicitly.

- 2026-10-29: factor constructors/guards accept zero and truncate to three decimals under EStG section 39f; focused constructor tests and the full working-tree quality check pass. PAP application is the following atomic change.

- 2026-10-29: tariff, solidarity and contribution calculations consume source-linked annual profiles; payroll results identify source/projection year. CLI/store payroll adapters forward their requested year. Annual allowance/rounding, cent-precise contributions, custom rates and projection regressions pass; full quality check/build pass. Withholding approximations and actual annual assessment remain assigned to subsequent fixes.

- 2026-10-29: added source-linked, validated annual parameter profiles for 2025/2026 and explicit future-projection metadata; focused profile tests and the full quality check pass. Calculator wiring and payroll formulas are still pending.

## Mission and done

Establish reliable payroll inputs for the later assessment and annual reconciliation fixes. The review confirmed stale simulator constants, separate formulas in `calculatorStore.ts`, and working-month inputs that do not change annual earnings. No payroll repairs are complete.

## Plan links and read first

- Orchestrator: [master plan](./engine-correctness-master.md), wave 2; shared constraints apply.
- Prerequisite: [benefits](./engine-correctness-benefits.md). Next: [assessment and reconciliation](./engine-correctness-assessment.md).
- Read `src/engine/tax/wageTax.ts`, `src/engine/types.ts`, `src/store/calculatorStore.ts`, `src/store/taxConfigStore.ts`, `src/store/elterngeldStore.ts`, `src/cli/runner.ts`, and `src/data/defaultTaxConfig.json`.

## Fix 7 - working-periods

**Depends on:** payroll-calculation.
**Files:** create a pure employment-period normalization helper under `src/engine/tax/` with tests; modify `src/store/calculatorStore.ts` and its caller contract as needed.
**Actions:** define monthly versus yearly income, active months, salary-payment counts, bonus timing, and period-specific contribution ceilings before changing annualization. Compute regular pay only in active periods; allocate bonus payments explicitly. Preserve the meaning of existing yearly gross inputs or migrate it explicitly. Do not apply a blanket half-year factor to yearly inputs or assume contribution ceilings apply to a full inactive year.
**Acceptance:** monthly gross 4000 with six active months and no bonus produces regular annual gross 24000; twelve produces 48000. Cover monthly/yearly equivalents, partial years near contribution caps, zero-work cases where supported, and fractional/extra salary payments. Changing working months must change the underlying cash flows rather than just display divisors.
**Verify:** focused period-normalization tests and calculator boundary tests, then the shared commit gate.

## Fix 8 - shared-payroll

**Depends on:** working-periods.
**Files:** modify `src/store/calculatorStore.ts`, `src/store/taxConfigStore.ts`, `src/store/elterngeldStore.ts`, `src/cli/runner.ts`, `src/engine/simulator/timelineGenerator.ts`, and the affected tests and persistence adapters.
**Actions:** make stores/adapters call the verified payroll engine; remove duplicate tax formulas from `calculatorStore.ts`. Pass matching year, state, insurance, children, hours, factor, and bonus settings. Recompute gross-mode raises/hours changes through payroll instead of scaling net salaries by percentages. Preserve explicit manual-net mode as a distinct input contract; never infer actual tax withheld from a manual net value without sufficient data.
**Acceptance:** equivalent inputs in the calculator, simulator, and CLI yield matching itemized payroll results. Config overrides flow consistently and remain marked as assumptions. A raise crossing a tax band is recalculated; manual-net mode is still usable without silently pretending that all tax inputs are known. Existing saved state has a tested migration where needed.
**Verify:** new store/adapter parity tests, existing CLI tests and scenario tests, then the shared commit gate.

## References and constraints

- [BMF PAP 2026](https://www.bundesfinanzministerium.de/Datenportal/Daten/frei-nutzbare-produkte/Anwendungen/Programmablaufplan-2026/Programmablaufplan-2026.html).
- [BMF developer calculation interface](https://www.bmf-steuerrechner.de/interface/programmablauf.xhtml).
- [Official 2026 contribution ceilings](https://www.bundesregierung.de/breg-de/aktuelles/beitragsgemessungsgrenzen-2386514).
- Stack: Astro/Preact with strict TypeScript and signal stores. All computation stays local; external reference APIs are development-time verification only. No opportunistic component splitting or design changes.
