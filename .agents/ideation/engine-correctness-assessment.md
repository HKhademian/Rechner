---
name: Engine correctness - assessment and reconciliation
status: in_progress
created: 2026-10-29
todos:
  - id: assessment-history
    content: "Fix 9 - derive and freeze each parent's assessment from actual history"
    status: in_progress
  - id: annual-reconciliation
    content: "Fix 10 - reconcile actual tax and enforce income eligibility"
    status: pending
  - id: export-parity
    content: "Fix 11 - share ledger event rows across UI, CLI, and CSV"
    status: pending
  - id: end-to-end-gate
    content: "Gate - verify independent household cases and document remaining limits"
    status: pending
plans:
  requires: [engine-correctness-payroll.md]
  blocks: []
  parallel: []
---

# Engine correctness: assessment and reconciliation

## Done

- 2026-10-30: standardized BEEG net is separate from payroll cash net. It locks deduction characteristics independently, applies configured work/social/church deductions, ignores ordinary SV ceilings, supports the BEEG transition-zone base, and checks January PAP provenance. Three new independent BMF fixtures and the official transition-zone example pass; full quality check/build pass. The required original 2025 January PAP is unavailable in the pinned provider, so positive-income 2026-birth gross assessments will be explicitly unavailable until that snapshot is added. This is a provider support limit, not a finding of statutory ineligibility. Wiring remains pending.

- 2026-10-29: marginal/transition thresholds now have independent effective-year profiles (2024-2027) sourced to the current official BEEG guidelines. This uses the already published 2027 marginal limit 633 without inventing a complete 2027 PAP profile. Projection behavior and source-year selection pass their focused test; full quality check passes.

- 2026-10-29: annual profiles record PAP publication dates/source URLs separately from payroll effective dates. BEEG must use the snapshot available on January 1 of the year before birth; the installed 2025 PAP is the January 22 revision and cannot silently stand in for the earlier snapshot. Source-linked marginal/transition thresholds and BEEG transition flat-rate input are configured. Full quality check passes. Snapshot availability checks and standardized net application follow.

- 2026-10-29: pure calendar-based assessment history selects twelve eligible months, replaces statutory exclusions with earlier months, reports incomplete history, and labels repeated initial-baseline records as assumed. Frozen records preserve gross/payroll characteristics against later edits. Three boundary/history/provenance tests and full quality check pass. Simulator application remains pending.

- 2026-10-29: tax-class selection counts ordinary earned-income months and resolves equal durations using the most recent class, under BEEG section 2c(3). The six/six regression verifies both chronological directions; full quality check passes. User selected repeating initial salary/class for missing prehistory, visibly labeled as an assumption. Simulator wiring remains pending.

- 2026-10-29: assessment deduction rates and older-child excluded-month window now have configurable, source-linked defaults. Full quality check passes. Application and history construction remain pending.

## Mission and done

Use the repaired benefit and payroll primitives to make simulation outcomes follow the household's actual history. The review reproduced equal benefits for early/late switches, fictitious 850 annual refunds, and flattened shared CSV exports. No repairs in this wave are complete.

## Plan links and read first

- Orchestrator: [master plan](./engine-correctness-master.md), wave 3; shared constraints apply.
- Prerequisite: [payroll](./engine-correctness-payroll.md), after [benefits](./engine-correctness-benefits.md).
- Read `src/engine/benefits/elterngeldAssessment.ts`, `src/engine/simulator/timelineGenerator.ts`, `src/engine/simulator/strategySynthesizer.ts`, `src/engine/tax/jointAssessment.ts`, `src/engine/storage/persistence.ts`, and `src/engine/storage/exportImport.ts`.

## Fix 9 - assessment-history

**Depends on:** wave 2 complete.
**Files:** modify the assessment module/tests, timeline generator/action tests, types, and necessary persistence/store/CLI adapters; introduce a focused immutable assessment result if useful.
**Actions:** build the actual eligible assessment window for each recipient and birth, including prior-year lookback and statutory excluded-month handling. Resolve effective tax classes from action history, with the most recent class winning a tie; remove the scenario-label-based class selection and hardcoded later-child 10-PT/2-FT blend. Compute BEEG synthetic net using its statutory standardized deductions, separately from payroll take-home. Freeze the pre-birth assessment; use the appropriate same assessment deduction characteristics for post-birth income calculations. Wire the father's own assessment into Fix 4's allocation. Missing history needs an explicit validated assumption or incomplete result, not fabricated records.
**Acceptance:** a valid majority switch and a late switch produce the independently expected distinct entitlements; a 6/6 tie chooses the applicable latest class. Post-birth tax switches or raises do not rewrite pre-birth assessment. Cover excluded months for a subsequent child, bonuses excluded without discarding regular wages, year boundaries, overlapping leaves, both recipients, and incomplete history. Each fixture states its eligible window and synthetic net calculation.
**Verify:** assessment tests, strategy/action/reallocation tests, and longitudinal scenarios, then the shared commit gate. Split history construction, synthetic-net calculation, and simulator wiring into prerequisite atomic commits if needed.

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
