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
    status: completed
  - id: shared-payroll
    content: "Fix 8 - use one payroll engine across calculator, simulator, and CLI"
    status: in_progress
plans:
  requires: [engine-correctness-benefits.md]
  blocks: [engine-correctness-assessment.md]
  parallel: []
---

# Engine correctness: payroll foundation

## Done

- 2026-10-29: bonus contribution ceilings now accept actual assessed regular earnings and prior assessed bonuses, preserving monthly caps after pay changes. A changing-pay regression checks both health and pension room across successive bonuses; full quality check passes. This foundation is committed separately from simulator bonus wiring.

- 2026-10-29: gross-mode monthly simulator payroll now follows actual class/year, targeted raises and hours relative to each original contract. All six classes use PAP; post-birth salary uses the active class. Manual mode exposes missing withholding data and no longer fabricates class IV via percentage multipliers. Compact monthly audit records avoid repeating the statutory parameter catalog. Two integration tests, full quality check and production build pass. Bonus integration and adapter input-unit cleanup remain in Fix 8.

- 2026-10-29: calculator now uses shared period payroll, removes duplicate tax formulas and obsolete raw configuration, selects published profiles, and accepts personal insurer/age/child/ELStAM/factor inputs. Official-value links are visible. Saved inputs retain compatibility; cached comparison/edit results are recalculated. Four store boundary/reference/migration tests, full quality check, and production build pass. Fix 7 is complete; shared simulator parity remains in progress.

- 2026-10-29: period payroll now runs PAP only in active months, passes actual year-to-date earnings/caps and expected annual pay to bonus calculations, and preserves itemized bonus deductions. Personal insurer rates reach both PAP and contributions. Three payroll conservation/parity tests and the full quality check pass; calculator integration follows.

- 2026-10-29: employment-period normalization now preserves actual yearly totals, prorates monthly salary and contractual extras by active months, allocates residual cents, and accepts explicit bonus schedules. Five boundary tests and the full quality check pass. Caller integration remains in progress; changing the UI input does not yet invoke this helper.

- 2026-10-29: replaced withholding approximations with pinned offline PAP 1.0.7. Eighteen independent 2026 BMF API fixtures, six published annual examples across 2025/2026, and domain adapter/conservation cases pass (30 focused payroll tests). Bonus contributions respect YTD caps; care age/state inputs and church tax are modeled; factor uses PAP wage-tax bases. Full quality check and production build pass. Regular payroll net is no longer presented as BEEG synthetic net. User selected verified profiles plus editable personal inputs, not hypothetical tariffs; unsupported PAP overrides fail explicitly.

- 2026-10-29: factor constructors/guards accept zero and truncate to three decimals under EStG section 39f; focused constructor tests and the full working-tree quality check pass. PAP application is the following atomic change.

- 2026-10-29: tariff, solidarity and contribution calculations consume source-linked annual profiles; payroll results identify source/projection year. CLI/store payroll adapters forward their requested year. Annual allowance/rounding, cent-precise contributions, custom rates and projection regressions pass; full quality check/build pass. Withholding approximations and actual annual assessment remain assigned to subsequent fixes.

- 2026-10-29: added source-linked, validated annual parameter profiles for 2025/2026 and explicit future-projection metadata; focused profile tests and the full quality check pass. Calculator wiring and payroll formulas are still pending.

## Mission and done

Establish reliable payroll inputs for the later assessment and annual reconciliation fixes. The review confirmed stale simulator constants, separate formulas in `calculatorStore.ts`, and working-month inputs that do not change annual earnings. Annual profiles, PAP withholding, and working-period integration are complete; simulator parity remains in progress.

## Plan links and read first

- Orchestrator: [master plan](./engine-correctness-master.md), wave 2; shared constraints apply.
- Prerequisite: [benefits](./engine-correctness-benefits.md). Next: [assessment and reconciliation](./engine-correctness-assessment.md).
- Read `src/engine/tax/wageTax.ts`, `src/engine/types.ts`, `src/store/calculatorStore.ts`, `src/store/taxConfigStore.ts`, `src/store/elterngeldStore.ts`, `src/cli/runner.ts`, and `src/data/defaultTaxConfig.json`.

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
