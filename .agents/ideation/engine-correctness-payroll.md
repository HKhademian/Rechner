---
name: Engine correctness - payroll foundation
status: in_progress
created: 2026-10-29
todos:
  - id: annual-rules
    content: "Fix 5 - version tax and contribution rules by year"
    status: in_progress
  - id: payroll-calculation
    content: "Fix 6 - replace payroll approximations with verified calculations"
    status: pending
  - id: working-periods
    content: "Fix 7 - apply active working months and bonus schedules"
    status: pending
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

- 2026-10-29: added source-linked, validated annual parameter profiles for 2025/2026 and explicit future-projection metadata; focused profile tests and the full quality check pass. Calculator wiring and payroll formulas are still pending.

## Mission and done

Establish reliable payroll inputs for the later assessment and annual reconciliation fixes. The review confirmed stale simulator constants, separate formulas in `calculatorStore.ts`, and working-month inputs that do not change annual earnings. No payroll repairs are complete.

## Plan links and read first

- Orchestrator: [master plan](./engine-correctness-master.md), wave 2; shared constraints apply.
- Prerequisite: [benefits](./engine-correctness-benefits.md). Next: [assessment and reconciliation](./engine-correctness-assessment.md).
- Read `src/engine/tax/wageTax.ts`, `src/engine/types.ts`, `src/store/calculatorStore.ts`, `src/store/taxConfigStore.ts`, `src/store/elterngeldStore.ts`, `src/cli/runner.ts`, and `src/data/defaultTaxConfig.json`.

## Fix 5 - annual-rules

**Depends on:** wave 1 complete.
**Files:** create a focused year/rules module under `src/engine/tax/` with tests; modify `src/engine/types.ts`, `src/engine/tax/wageTax.ts`, `src/data/defaultTaxConfig.json`, and callers that must supply the calendar year.
**Actions:** pass validated `FullCalendarYear`/rules explicitly instead of applying one tariff to every year. Record official sources, effective dates, tariff coefficients, solidarity thresholds, contribution caps/rates, and child allowances for supported historical/current years. Keep user sandbox overrides separate from verified statutory profiles. Decide and document how unknown future years are projected: never silently call a frozen prior-year profile verified future law. Preserve that distinction in result metadata and eventual outputs.
**Acceptance:** verified 2026 constants include basic allowance 12348, monthly health cap 5812.50, and pension cap 8450. Income tax at taxable income 12000 is zero under 2026 rules. A year-boundary test selects the correct profile; explicit future assumptions remain usable in multi-year forecasts and identifiable in the result. Prior-year assessment lookbacks are covered or explicitly unavailable.
**Verify:** new rules tests plus wage-tax and duration tests, then the shared commit gate.

## Fix 6 - payroll-calculation

**Depends on:** annual-rules.
**Files:** modify `src/engine/tax/wageTax.ts` or extract a focused payroll implementation and tests; update `src/engine/types.ts` where new validated inputs are required. Change dependencies only when the selected implementation needs them.
**Actions:** validate or replace the class-V surcharge, class-VI allowance shortcut, deduction ratios, solidarity logic, contribution rates, and whole-euro rounding against the BMF PAP and separate official social-insurance rules. Choose a source-traceable PAP implementation or a verified maintained adapter before coding it. The locally installed `lohnsteuer` 1.0.0 exposes only 2014-2019 in `lib/years/yearInfo.js`; it is not a 2026 implementation. Keep wage withholding, annual income tax, and BEEG synthetic net as separate contracts. Add only inputs necessary for the supported payroll cases (state/Saxony, insurance surcharge, age/qualifying children, church tax/factor as applicable); explicitly identify cases still unsupported.
**Acceptance:** independent fixtures cover tax classes I-VI, IV factor, cap boundaries, solidarity mitigation, child contributions, church tax, and regular versus one-off pay. Record each source, year, input, output, and exact rounding/tolerance; no broad arbitrary tolerance. Net plus itemized deductions conserves gross at the defined currency precision. BMF fixtures validate withholding; social contributions have their own reference fixtures.
**Verify:** tax unit/granular/profile tests and targeted scenario checks, then the shared commit gate. Split source data, dependency changes, and algorithm work into prerequisite atomic commits if necessary.

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
