---
name: Engine correctness - assessment and reconciliation
status: in_progress
created: 2026-10-29
todos:
  - id: assessment-history
    content: "Fix 9 - derive and freeze each parent's assessment from actual history"
    status: completed
  - id: annual-reconciliation
    content: "Fix 10 - reconcile actual tax and enforce income eligibility"
    status: completed
  - id: export-parity
    content: "Fix 11 - share ledger event rows across UI, CLI, and CSV"
    status: completed
  - id: end-to-end-gate
    content: "Gate - verify independent household cases and document remaining limits"
    status: in_progress
plans:
  requires: [engine-correctness-payroll.md]
  blocks: []
  parallel: []
---

# Engine correctness: assessment and reconciliation

## Done

- 2026-10-30: final export audit reopens the verification gate for the older text/print report: it still assumes a fixed horizon, positive gains and complete results. The eleven calculation/row fixes remain complete; report-boundary corrections and final rechecks follow as separate small commits.

- 2026-10-30: final gate completed. Independent payroll/benefit/tax, no-income, part-time/sibling, father-hours, partial-employment, signed-repayment and later-child regressions pass. Follow-up commits corrected configured Kindergeld explanations, birthday/YTD/March-allocation support flags, signed scenario summaries and each reference-card topic separately. Configured values retain primary links; the care-rate source points directly to the published employee share. Obsolete formula/timeline walkthroughs are explicitly archived, current docs/README describe the integrated model, and retained limits are documented in STATUTORY_CONFIGURATION.md. Full quality/build checks pass. A 72-month CLI JSON run conserves decimal cash and event totals across all three scenarios, exposes source2026 projections and leaves the last tax balance outside cash. This integration evidence does not establish comprehensive statutory correctness. All eleven planned fixes are complete within the documented supported model.

- 2026-10-30: Fix 11 completed in separate commits for pure row projection, sourced result configuration, CSVv2 and migration docs, table CSV connection, CLI rendering, table rendering, and event drilldown. The 36-month/five-event reproducer retains all events; exact balances1100/1050/1075/1065/1060 precede2060 regular month-end. Summed row cash36060 matches the scenario total. Action values are dashes, duplicate titles compare by absolute IDs, and repayments keep their sign. CSV reader regressions preserve quotes/delimiters/newlines and calculation metadata. Full quality checks and consumer builds pass. Final supported-model/claim audit remains.

- 2026-10-30: Fix 10 completed progressively: legacy helper removal, structured tax explanations, signed UI/CLI balances and outside-horizon timing; zero-factor imports; bonus cutoff invariance; sourced dated couple-income limits; validated personal annual evidence; child-adjusted eligibility income despite unavailable progression; cohort gating before exclusion history; public simulator, CLI, persistence and UI integration; inconsistent supplied/model income blocks false-precision tax settlements. Boundary175000/175000.01, missing evidence, known exclusion, modeled high income and later-child denied-history regressions pass. Full quality checks pass at each commit and final build passes. Export parity remains the next fix.

- 2026-10-30: actual annual accounting now replaces the simulator's variance/refund estimate. Separate prerequisite commits added source-linked deduction/precision rules, actual employment tax bases, progression tax, year-aware ESt-only child favorability, annual credit/liability settlement, complete-year record collection and signed ledger posting. Independently worked integration references give4569 refund and4820 repayment, posted once in the configured following-year month. Full quality/build pass; missing/manual/unsupported tax data remains unavailable, and final-year unreceived balances are separate metadata. Current presentation/legacy helper cleanup, income eligibility and export parity still follow; Fix10 is not complete.

- 2026-10-30: payroll prerequisites for annual accounting were split progressively into sourced transition configuration, pure bases, actual employee deductions, calculator expected-pay forwarding, simulator expected-pay forwarding, unsupported-regime metadata, and output propagation. DRV references (800: total base624.88/employee282.03; 1800:1770.81/1713.67) and GKV 2025 care8.46 pass. Predictable extras determine eligibility; marginal-job and transition-zone one-off calculations are explicitly provisional. Full quality checks pass after each step; final output propagation build passes. Annual tax accounting remains in progress.

- 2026-10-30: annual-accounting prerequisite: general health and insurer supplementary contributions round separately before summation. Independent 4166.67 gross example yields 304.17 + 60.42 = 364.59. Full quality check passes. GKV guidance permits either combined or separately rounded standard care adjustments; the existing combined standard-care method is valid and retained. Midijob care uses its distinct mandatory bases in the next correction.

- 2026-10-30: removed invented 850 deduction refunds and opening-year refunds without prior-year records. A zero-income/zero-withholding household receives zero tax cash/events over 36 months. The compatibility helper defaults to zero adjustment; descriptions no longer invent 850. Full quality check passes. Remaining variance-based/child-relief estimates are replaced by actual annual accounting next.

- 2026-10-30: Fix 9 integrated the calendar income/cohort projectors into the public simulator, removing scenario-class entitlement selection and the later-child blend. Early/tie/late independent references yield 724.48/724.48/531.43 Plus; pre-birth net remains frozen after a later raise. Per-parent audits, missing-history repetitions and unavailable snapshots reach JSON/UI/CLI. Manual cash-net estimates require a persisted, validated opt-in. Claim budgets/minimums and protected overlap minimums replace invented additional father payments. Calendar conventions and fixed maternity references are consumed. Full quality check/build and CLI JSON inspection pass. Annual reconciliation and its legacy assumptions remain Fix 10 work.

- 2026-10-30: pure birth-cohort projection freezes each parent's assessment, averages positive post-birth Plus/partnership income, applies claim budgets, household siblings and overlap credits, and reports unavailable inputs. Manual cash net requires an explicit labeled BEEG-net assumption. Nine independently specified cohort/history cases and full quality/build pass. Main timeline integration remains pending.

- 2026-10-30: pure calendar income schedule resolves chronological switch/revert events (including same-month reversion/new-switch order), targeted raises, hours, personal/year-aware payroll, and frozen three-month maternity references. It supports internal forecasting beyond the public 120-month ledger limit without weakening branded SimulationMonth validation. Five reference/boundary/history tests and full quality check pass. Existing timeline consumption and cohort averaging follow.

- 2026-10-30: household sibling eligibility accepts any other qualifying child (including a younger newborn) and the statutory two-other-children-under-six case. Added source-linked age/count rules; focused multi-sibling/birth cases and full quality check pass. Cohort projection will use all known household births instead of only child one.

- 2026-10-30: timeline maternity/ordinary-Plus/partnership schedules now have validated configuration, explicitly classified as planning assumptions with statutory-context links. The actual three-calendar-month maternity-pay reference is a separately sourced rule. Full quality check passes; existing timeline is wired in the following integration change.

- 2026-10-30: standardized pre-birth net prorates income-side work expenses to earning months; PAP still applies its own tax-side allowance. A six-work/six-zero-month reference (3000 average gross, 51.25 average expenses) gives 2280.42 net with independent 38.33 PAP tax. Full quality check passes.

- 2026-10-30: standardized BEEG net is separate from payroll cash net. It locks deduction characteristics independently, applies configured work/social/church deductions, ignores ordinary SV ceilings, supports the BEEG transition-zone base, and checks January PAP provenance. Three new independent BMF fixtures and the official transition-zone example pass; full quality check/build pass. The required original 2025 January PAP is unavailable in the pinned provider, so positive-income 2026-birth gross assessments will be explicitly unavailable until that snapshot is added. This is a provider support limit, not a finding of statutory ineligibility. Wiring remains pending.

- 2026-10-29: marginal/transition thresholds now have independent effective-year profiles (2024-2027) sourced to the current official BEEG guidelines. This uses the already published 2027 marginal limit 633 without inventing a complete 2027 PAP profile. Projection behavior and source-year selection pass their focused test; full quality check passes.

- 2026-10-29: annual profiles record PAP publication dates/source URLs separately from payroll effective dates. BEEG must use the snapshot available on January 1 of the year before birth; the installed 2025 PAP is the January 22 revision and cannot silently stand in for the earlier snapshot. Source-linked marginal/transition thresholds and BEEG transition flat-rate input are configured. Full quality check passes. Snapshot availability checks and standardized net application follow.

- 2026-10-29: pure calendar-based assessment history selects twelve eligible months, replaces statutory exclusions with earlier months, reports incomplete history, and labels repeated initial-baseline records as assumed. Frozen records preserve gross/payroll characteristics against later edits. Three boundary/history/provenance tests and full quality check pass. Simulator application remains pending.

- 2026-10-29: tax-class selection counts ordinary earned-income months and resolves equal durations using the most recent class, under BEEG section 2c(3). The six/six regression verifies both chronological directions; full quality check passes. User selected repeating initial salary/class for missing prehistory, visibly labeled as an assumption. Simulator wiring remains pending.

- 2026-10-29: assessment deduction rates and older-child excluded-month window now have configurable, source-linked defaults. Full quality check passes. Application and history construction remain pending.

## Mission and done

Use the repaired benefit and payroll primitives to make simulation outcomes follow the household's actual history. The review reproduced equal benefits for early/late switches, fictitious 850 annual refunds, and flattened shared CSV exports. History-driven assessment and supported annual reconciliation/income eligibility are integrated; the final supported-model verification gate is complete.

## Plan links and read first

- Orchestrator: [master plan](./engine-correctness-master.md), wave 3; shared constraints apply.
- Prerequisite: [payroll](./engine-correctness-payroll.md), after [benefits](./engine-correctness-benefits.md).
- Read `src/engine/benefits/elterngeldAssessment.ts`, `src/engine/simulator/timelineGenerator.ts`, `src/engine/simulator/strategySynthesizer.ts`, `src/engine/tax/jointAssessment.ts`, `src/engine/storage/persistence.ts`, and `src/engine/storage/exportImport.ts`.

## Fix 10 - annual-reconciliation

**Depends on:** assessment-history and verified year-aware payroll.
**Files:** modify `src/engine/tax/jointAssessment.ts`, its tests, `src/engine/simulator/timelineGenerator.ts`, ledger/types, and necessary boundary adapters; add focused annual-accounting tests.
**Actions:** first remove the assumed 850 refund in its own regression-tested commit. Then aggregate actual annual gross, deductible contributions, withheld taxes, bonuses, raises, changing hours, benefits subject to progression, and child presence. Compute supported annual joint liability, child-allowance comparison, and relevant surcharges from the calendar year; reconcile paid tax minus liability with signed outcomes. Allow repayments, not just positive refunds. Pay the result in the configured following-year month; never invent a prior-year refund at simulation start without explicit prior-year data. Apply the BEEG household taxable-income eligibility threshold using the legally relevant prior year; add this as a separate atomic eligibility correction. Preserve incomplete/manual-net tax data explicitly rather than assigning a precise refund.
**Acceptance:** zero earnings/withholding yields zero refund, including the first simulation year. Independent fixtures cover refund, repayment, no balance, progression income, tax-class changes with the same underlying annual tax basis, partial years, child birth, bonuses, and raises. Income-eligibility boundary cases are covered. Taxes paid minus final liability equal the reconciled amount; the signed refund/repayment reaches the ledger once. Final-year liability outside the cash-flow horizon is disclosed separately from cash already received.
**Verify:** joint-assessment/child-allowance tests, ledger tests and multi-year scenarios, then the shared commit gate.

## Fix 11 - export-parity

**Depends on:** annual-reconciliation.
**Files:** modify `src/engine/storage/exportImport.ts`, its tests, `src/components/elterngeld/TimelineTable.tsx`, and `src/cli/runner.ts`; extract a small pure ledger-row projection under `src/engine/ledger/` if needed.
**Actions:** use one projection for ordered action, financial-event, and base-month rows. Keep absolute month IDs, non-financial dashes, progressive event balances, and CSV quoting consistent. Preserve signed tax repayments and calculation/assumption metadata. Keep migration of any public CSV schema deliberate and documented.
**Acceptance:** the same input produces the same row order and amounts in UI projection, CLI, and both CSV paths. The review's 36-month case with five events retains those five event rows. Cumulative event/month balances reconcile to the final summary with no double counting; exports identify projected future-year assumptions and unavailable tax results accurately.
**Verify:** projection/export tests, CLI tests and ledger tests, then the shared commit gate.

## Gate - end-to-end-gate

**Depends on:** all eleven fixes complete.
**Files:** add source-backed cases under `test/fixture/` and `test/scenario/`; update the affected `.agents/docs/` files, statutory explainers and README claims to match the implemented contracts.
**Actions:** run independently worked household cases for no children, one child/no post-birth income, part-time with a sibling, early versus late switches, father over 32 hours, partial-year employment, no-tax household, tax repayment, and a later pregnancy. Keep reference fixtures distinct from property/conservation tests. Inventory remaining approximations such as calendar-month versus life-month/day-level maternity timing and unsupported household/insurance cases. Do not equate passing tests with comprehensive statutory correctness.
**Acceptance:** every review reproducer has a meaningful regression; official reference values match; adapters preserve results; ledger conservation holds; assumptions/unsupported cases are visible. Current-state docs describe completed behavior only. No improvement to UI styling is required for this gate.
**Verify:** `npm run check`, `npm run check:build`, and representative `npm run sim -- --format json` output inspection. Use browser verification only for any output rendering actually changed.

## References and constraints

- [Federal assessment tax-class rule](https://familienportal.de/familienportal/familienleistungen/elterngeld/arbeitssituation/auf-welche-steuerklasse-kommt-es-fuer-die-berechnung-meines-elterngelds-an-wenn-ich-die-steuerklasse-gewechselt-habe--124670).
- [BEEG statutory text](https://www.gesetze-im-internet.de/beeg/BJNR274810006.html), especially sections 1, 2b-2f, 3, 4a and 4b; verify effective versions before implementing.
- [Federal Elterngeld FAQ](https://familienportal.de/familienportal/familienleistungen/elterngeld/faq), including progression and income eligibility.
- Key fact: pure calculations and CLI are preferred for verification; both cash-flow timing and entitlement totals must be tested. This wave is a bounded supported-household model, not a general tax-return application.
