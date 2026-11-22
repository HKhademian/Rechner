---
name: Parental Leave Workbench 0-to-100 Rebuild & Retirement Plan
status: in-progress
created: 2026-11-22
---

# Parental Leave (Elterngeld) Planner — 0→100 Rebuild & Retirement Plan

## 1. Executive Summary & Problem Diagnosis

The legacy Parental Leave Planner (`src/components/elterngeld/ElterngeldDashboard.tsx`) is backed by a strong statutory engine (`BEEG`, `MuSchG`, `EStG`, day-precision simulation, 3-scenario synthesis, annual tax settlements, Kita costs, inflation indexing, and full audit trails), but its UI accumulated structural debt that limits everyday usability:

- `src/components/elterngeld/SandboxControls.tsx` is a 4,182-line monolith (+ 1,130 lines CSS) presenting ~80+ controls before results.
- Inside `SandboxControls`, Pregnancies (Batch 1) appear before Salaries (Batch 3), while Starting Conditions & Payroll Details (Batch 0) are buried at the bottom.
- Ten full-width sections stack vertically (11,100 lines across 25 files), preventing live side-by-side input/result feedback.

### Core Strategy
1. Build a fresh **Parental Planner** (`src/apps/parental-planner/`) using shared `src/components/ui/` primitives, tokenized CSS, and calm steady-salary cards with **per-section granular drill-down modals** and **whisper-quiet cross-linked wiki references (`WikiRefLink`)**.
2. Publish **side-by-side in the catalog with a `New` badge** alongside the legacy Parental Leave Planner (marked `Deprecated`).
3. Reuse the proven simulation engine and `ElterngeldPersistedState` schema while adding focused pure engine modules (`parentalPlanDiagnostics`, `deductibleExpensesFormula`, `workbenchPresets`).
4. Keep the legacy `/calculators/parental-leave/` page intact until explicit retirement sign-off.

## 2. Target UX Architecture

### Five Calm Steady-Salary Cards with Per-Section Granular Drill-Down
By default, salaries remain steady (0% raises, 12× cadence, 0% CPI) so parental-leave and tax-class trade-offs stay crystal clear. Each card exposes only essential inputs plus a contextual granular button opening a focused modal for that domain, surfacing active customizations as compact removable chips right inside the card:

1. **Household & Income** (`HouseholdIncomeCard` → `IncomeAdjustmentsModal`): Steady baseline gross/net salaries, monthly/yearly cadence, starting tax classes. Granular modal: salary changes/raises (`SalaryChangeEditor`), annual raises, 13th–15th bonus slots, performance bonus, investment/other income, per-partner `PayrollPersonalInputs`, manual-net BEEG toggle.
2. **Children & Leave** (`ChildrenLeaveCard` → `ChildDetailModal`): Child 1 expected birth, Basis/Plus/Mixed mode, Mother & Father months, visual leave strip, `+ Add Child`. Granular modal: day-exact due date, Mutterschutz windows, `§ 17 BEEG` vacation accrual/curtailment, life-month allocation grid.
3. **Tax Strategy & Work Hours** (`TaxAndWorkCard` → `TaxAndScheduleModal`): `§ 2b BEEG` tax-class switch with 1-click Auto-Optimize (`synthesizeOptimalTaxSwitches`), post-leave working hours. Granular modal: custom switch dates/presets, live monthly shift preview, dated working-hours schedules with `24–32 h/wk` corridor validation.
4. **Costs, Benefits & Tax Deductibles** (`CostsBenefitsCard` → `CostsBenefitsModal`): Quick Kita toggle. Granular modal: municipal Kita presets/age/hours/meals (`§ 10(1)5 EStG`), one-off costs/inflows, other regional family benefits (e.g. Familiengeld), and tax-deductible/refundable expenses (`§§ 9, 10, 35a EStG`).
5. **Horizon, Income Cap & Macro** (`HorizonMacroCard` → `HorizonMacroModal`): Compact inline status strip (`60M · ZvE OK · 0% CPI`) + Life Profile / Planning Dashboard bridge. Granular modal: forecast start/horizon, prior children, Kindergeld rate, prior-year couple ZvE (`§ 1 Abs. 8 BEEG`), tax & social deductions breakdown, tax return month, CPI & bracket indexing.

### Always-Visible Summary & 5-Tab Analysis Workspace
- Sticky Scenario Switcher (`C`, `B`, `A`, `Compare`) + Coalesced Calculation Status Pill + Expandable Audit Status.
- 4-KPI Scorecard (`MetricCard`) + Plan Diagnostics Strip (Income-Cap Headroom, `§ 2b` Lead Check, Monthly Elterngeld Formula Summary).
- 5 Workspace Tabs: **Overview & Chart**, **Monthly Ledger** (Rule 13 & Rule 15 + CSV + Field/Row Explainers), **Action Deadlines** (`StatutoryActionTimeline` + warning badge), **Annual Tax** (`AnnualIncomeBreakdown` + deductible impact), **Rules & Parameters** (`ParameterObserverSection` + `RulesExplainer`).

### Whisper-Quiet Cross-Linked Wiki System (`WikiRefLink`)
A shared UI primitive (`src/components/ui/WikiRefLink.tsx`) unifying Rechner's 4 existing registries (`laws`, `topics`, `parameters`, `formulas`). Renders as calm prose with a subtle dotted underline; hovering (160ms intent delay) or clicking/tapping opens a floating `WikiPeekCard` with live values/formulas, clickable cross-links with `← Back` navigation, and `Ctrl+Click` full-page navigation.

## 3. Phased 0→100 Roadmap

- **Phase 0 (0% → 10%)**: Ideation blueprint, `CalculatorReleaseBadge` (`Beta`), `WikiRefLink` + `wikiRefResolver`, shared pure helpers (`calendarNavigation`, `kitaProfileMapping`), pure engine modules (`parentalPlanDiagnostics`, `deductibleExpensesFormula`, `workbenchPresets`).
- **Phase 1 (10% → 25%)**: Modular workbench store (`workbenchState`, `workbenchSimulation`, `workbenchUiState`) with 100% parity tests, published route `/calculators/parental-planner/`, core steady-salary cards, sticky KPI/Scenario/Diagnostics strip, Overview tab.
- **Phase 2 (25% → 45%)**: Granular modals for Income/Raises/Bonuses/Payroll, Children/Day-exact/Grid, and Tax Switches/Work Schedules.
- **Phase 3 (45% → 60%)**: Granular modals for Costs/Other Benefits/Tax-Deductible Expenses and Horizon/Cap/Macro + Sync Life Profile & Classic Plan import bridge.
- **Phase 4 (60% → 80%)**: Full Monthly Ledger tab (Rule 13 & 15 + Field/Row Explainers + CSV), Action Deadlines tab, Annual Tax tab, Rules & Parameters tab.
- **Phase 5 (80% → 92%)**: Export/Import modal (JSON/TXT/ZIP/CSV/Print), full chart modes & hover sync, responsive & cross-theme polish (`swiss`, `editorial`, `utility` × light/dark).
- **Phase 6 (92% → 100%)**: Automated round-trip parity verification suite against legacy planner & CLI runner + UAT sign-off.
- **Phase 7 (Retirement)**: Storage key migration to `AppId.ParentalLeave`, canonical route cutover with 301 redirect from Beta path, deletion of legacy `src/components/elterngeld/` & `src/store/elterngeldStore.ts`.
