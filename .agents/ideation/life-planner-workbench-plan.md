---
name: Life Planner Workbench 0-to-100 Rebuild & Retirement Plan
status: planned
created: 2026-11-22
---

# Life Planner Workbench — 0→100 Rebuild & Retirement Plan

## 1. Executive Summary & Problem Diagnosis

Rechner already contains a rich library of German statutory calculators, 17 typed `lifeProfile` event modules (`src/engine/lifeProfile/eventCatalog.ts`), and a proven monthly double-entry ledger & annual tax settlement engine (`src/engine/ledger/`, `src/engine/tax/`, `src/engine/simulator/`). However, the existing life-planning surfaces do not yet unify these capabilities into a true multi-year financial & tax simulator:

- **Static 1-Year Snapshot (`/profile/`, `LifeProfileSummaryPage.tsx`)**: Evaluates 6 calculators for a single planning year (`evaluateUnifiedLifeProfile`) without chronological multi-year replay, monthly cashflow tracking, or multi-year tax settlement reconciliation.
- **Hardcoded Demo Checklist (`/calculators/planning-dashboard/`, `PlanningDashboardCalculator.tsx`)**: Driven by 7 boolean switches that synthesize fixed placeholder events rather than letting users model real life events, cashflows, assets, or tax interactions.
- **Fragmented Experience**: Users who want to see how a job change, company car, home purchase, parental leave, Kita fees, deductible expenses, and tax-class switches interact over 5–10 years must mentally combine outputs across 10+ standalone calculators.

### Core Strategy (Mirroring the Parental Planner Rebuild)

1. Build a **completely new Life Planner Workbench** (`src/apps/life-planner/`) adopting the proven **Concept A Quiet Command Header + Full-Screen Analysis Canvas + Slide-Over Plan Inputs Drawer + Non-Destructive Scenario Levers** architecture from `src/apps/parental-planner/`.
2. Publish **side-by-side** in the catalog at `/calculators/life-planner/` with `CalculatorReleaseBadge.Beta` (demo/preview) alongside the legacy `PlanningDashboard` and `/profile/` pages (`Life Planner (Old)` vs. `Life Planner (Beta)`), keeping legacy pages untouched until explicit retirement sign-off.
3. Build a **unified, pure, strongly-typed Life Simulation & Tax Collector Engine** (`src/engine/lifeSimulator/`) that ingests a chronological multi-domain event stream, computes monthly payroll/benefits/cashflows/assets/debt, **collects every tax-relevant stream into an annual German tax engine**, and posts exact signed annual tax settlements into the monthly ledger with full double-entry audit trails.
4. Provide **1-click bridges** to import/sync from the existing Unified Life Profile and Parental Planner so users never re-enter household data.

---

## 2. Core Engine Architecture (`src/engine/lifeSimulator/`)

All domain types strictly follow Rules 10, 11, 12, and 23 (nominal branded types, `const` enums with runtime validators, zero raw string unions, zero redundant `as number` casts, pure immutable functions).

### 2.1 Unified Event Taxonomy (7 Event Families)

The simulator consumes a single chronological array of strongly-typed `LifeSimulatorEvent` items, reusing existing `src/engine/formulas/pure/*` and `src/engine/tax/*` evaluators as pure calculation primitives:

| Event Family | Concrete Event Types | Financial, Tax & Balance-Sheet Impact |
| :--- | :--- | :--- |
| **1. Household & Baseline** | `HouseholdBaseline` (state), `PersonAdded`, `MaritalStatusChange` | Opening liquid cash, emergency buffer target, starting tax classes (`I`–`VI`), federal state, church tax, health insurance, joint (`Splittingtarif § 32a(5) EStG`) vs. individual assessment. |
| **2. Career & Income** | `JobStarted`, `SalaryRaise`, `BonusSchedule` (13th–15th), `WorkingHoursChange`, `CompanyCar` (`1%`/`0.25%` EV + commute), `CommuterProfile` (`Entfernungspauschale`), `UnpaidLeaveOrSabbatical`, `JobEnded` (severance `§ 34 EStG`, `ALG I`, `Sperrzeit § 159 SGB III`), `SideJobMiniMidi` | Monthly gross → `geldwerter Vorteil` → `Lohnsteuer`, `Soli`, `KiSt`, social security (`RV`/`AV`/`KV`/`PV`), net pay; `ALG I` routed to `§ 32b` progression bucket; commuter km routed to `§ 9` `Werbungskosten`. |
| **3. Family & Childcare** | `PregnancyAndBirth` (`MuSchG`, `Basiselterngeld`, `ElterngeldPlus`, `Partnerschaftsbonus`, `§ 2a` sibling bonus, `§ 1(8)` income cap, `§ 17 BEEG` vacation), `ChildcarePlan` (Kita/Krippe/Hort), `RegionalFamilyBenefit` (e.g. Familiengeld) | `Elterngeld` & `Mutterschutz` routed to `§ 32b` progression bucket; `Kindergeld` tracked for annual `Günstigerprüfung`; Kita fees (`2/3` up to €4,800/child/yr) routed to `§ 10(1)5 EStG` deductible bucket. |
| **4. Tax Strategy & Deductibles** | `TaxClassSwitch` (`III/V`, `IV/IV`, `IV-Faktor`), `DeductibleExpenses` (`§ 9` Werbungskosten, `§ 10` Sonderausgaben, `§ 35a` household services & craftsmen), `CapitalIncome` (`Abgeltungsteuer` + `Sparer-Pauschbetrag`) | Alters monthly withholding vs. final annual tax; accumulates deductible expenses & direct `§ 35a` tax credits into the Annual Tax Collector. |
| **5. Housing, Property & Assets** | `RentAgreement` (cold rent + utilities + indexation), `HomePurchase` (price, `Grunderwerbsteuer`, notary/broker, down payment, mortgage amortization & interest, maintenance), `VehiclePurchaseOrLease`, `SolarPvInstallation` (capex, monthly electricity savings + feed-in, `§ 3 Nr. 72 EStG` exempt), `LoanOrDebt` | Updates **Liquid Cash**, **Asset Value** (appreciation/depreciation), and **Remaining Debt** (principal vs. interest split) every month; computes **Net Worth** (`Cash + Assets − Debt`). |
| **6. Living Expenses, Travel & One-Offs** | `RecurringExpenseBudget` (groceries, insurance, mobility, subscriptions, inflation-indexed), `TravelTrip`, `OneOffCashflow` (inheritance, gift, moving, furnishing, education) | Monthly living outflows and discrete cashflow shocks affecting Liquid Cash and Emergency Runway. |
| **7. Residency & Legal Milestones** | `ResidenceMove`, `ResidencePermit` (Blue Card / skilled worker), `PermanentResidencyGoal` (`§ 18c AufenthG`), `CitizenshipGoal` (`§ 10 StAG`), `TravelAbsence` | Non-cash timeline milestones & statutory deadline/eligibility tracking integrated into the Deadlines tab and Diagnostics strip. |

### 2.2 Unified Tax Collector & Double-Entry Monthly Ledger

Every simulated month (`SimulationMonth` 1..360, default 60 or 120 months) produces an immutable `LifeMonthlyLedgerEntry` containing:

1. **Itemized Cashflow Streams**:
   - Earned net salaries & bonuses (per adult)
   - Statutory benefits (`Mutterschutz`, `Elterngeld`, `Kindergeld`, `ALG I`, regional benefits)
   - Housing & asset cashflows (rent, mortgage principal + interest, solar savings/feed-in, upfront capex)
   - Childcare, living expenses, travel, and one-off events
   - Annual tax settlement (signed refund `+` or repayment `−` posted in `taxReturnMonth` of `year + 1`)
2. **Balance-Sheet Snapshot (End of Month)**:
   - `liquidCashBalance`: Opening cash + cumulative net cashflow
   - `emergencyRunwayMonths`: `liquidCashBalance / rollingMonthlyEssentialOutflow`
   - `totalAssetsValue`: Property + solar + vehicles + investments
   - `totalDebtBalance`: Remaining mortgage + other loans
   - `netWorth`: `liquidCashBalance + totalAssetsValue − totalDebtBalance`
3. **Tax Collector Accumulator (Per Calendar Year)**:
   Every transaction carries a `TaxBucket` enum (`TaxableWage`, `BenefitInKind`, `WithheldWageTax`, `WithheldSoli`, `WithheldChurchTax`, `SocialSecurity`, `ProgressionBenefit32b`, `TaxExemptInflow`, `Werbungskosten9`, `Sonderausgaben10`, `ChildcareDeductible10_1_5`, `TaxCredit35a`, `CapitalGains`, `NonTax`).
   At the close of each calendar year, `evaluateAnnualLifeTaxSettlement` aggregates all 12 months and runs the real statutory German annual assessment:
   - Joint (`Splittingtarif`) vs. Individual (`Grundtarif`) based on marital status in that year
   - `Vorsorgeaufwendungen` (deductible social security contributions)
   - `Werbungskosten` (`max(collected § 9 incl. commuter + home-office, Arbeitnehmer-Pauschbetrag)`)
   - `Sonderausgaben` (incl. `§ 10(1)5` Kita deduction capped at 2/3 up to statutory ceiling)
   - `Altersentlastungsbetrag` (`§ 24a EStG`) when applicable
   - `Progressionsvorbehalt` (`§ 32b EStG`) combining `Elterngeld` + `Mutterschutz` + `ALG I`
   - `Günstigerprüfung` (`Kindergeld` vs. `Kinderfreibetrag`)
   - `§ 35a EStG` direct tax credits (20% household services / craftsmen labor up to statutory caps)
   - `Solidaritätszuschlag` (`SolzG`) & optional `Kirchensteuer`
   - **Signed Settlement**: `(Credited Withholding) − (Final Annual Liability)` → posted once in `taxReturnMonth` of `year + 1`, rebuilding running `liquidCashBalance`, `emergencyRunwayMonths`, and `netWorth` with zero double-counting.

### 2.3 Three Structured Scenarios, Life Disaster Simulator & Non-Destructive Levers

Mirroring `parental-planner`'s `C / B / A / Compare` model, the Life Planner computes three synchronized scenarios on every debounced edit (250ms coalesced scheduler):

1. **`Planned` (Primary)**: User's complete life plan with all configured events, strategies, and tax optimizations active.
2. **`Baseline` (Status Quo)**: Steady-state trajectory using only current household baseline (existing salaries, current rent/living budget, statutory defaults) with planned discretionary/major life events and tax switches suppressed — answering *"What is the net financial & tax impact of my life plan vs. doing nothing?"*.
3. **`StressTest` (Life Disaster & Resilience Simulator)**: Composable German life-shock engine (`disasterSimulator.ts`) applied non-destructively on top of `Planned` at any chosen trigger month, so users can test whether they can safely **expand or must limit fixed commitments** (e.g., upgrading to a better rental house, taking on a mortgage, or adding a car lease):
   - **Fired / Employer Termination (`Kündigung`)**: Statutory notice period (`§ 622 BGB`), optional severance (`Abfindung` with `§ 34 EStG` Fünftelregelung), immediate **`ALG I`** (60% / 67% with child, `§ 149 SGB III`, BBG-capped, routed into `§ 32b EStG` progression tax), configurable unemployment duration (3 / 6 / 12 months), and optional re-employment salary haircut.
   - **Voluntary Resignation (`Eigenkündigung`)**: **12-week `Sperrzeit` (`§ 159 SGB III`)** with €0 `ALG I` during the waiting period + reduced entitlement, followed by `ALG I` until re-employment, with full `§ 32b` tax progression impact.
   - **Long-Term Illness (`Krankengeld`)**: 6 weeks employer continuation (`§ 3 EFZG`), then **`Krankengeld`** (~70% gross / max 90% net, `§ 47 SGB V`, `§ 32b` progression) for configurable duration.
   - **Partner Income Loss / Single-Earner Fallback**: Primary or partner loses 100% of employment income (or drops to part-time / `ALG I`) while the other continues working, including joint-assessment tax shift.
   - **Unexpected Lump-Sum Emergency**: Configurable one-off shock (e.g., €10,000–€25,000 for car replacement, home repair, family emergency, or tax `Nachzahlung`).
   - **Housing / Interest-Rate / Inflation Shock**: Rent indexation jump (`Indexmiete`), mortgage rate reset after `Zinsbindung` (+2–3% p.a.), or +2% living-cost inflation.
   - **Compound Disasters**: Multiple shocks can be combined (e.g., *Fired 6 months after signing a new mortgage or higher rent*).
4. **Commitment Affordability & Safe Ceiling Solver (`commitmentAffordability.ts`)**:
   - Evaluates the `StressTest` trajectory against the user's target emergency floor (e.g., `€5,000` or `3 months` of essential expenses) and reports:
     - **Solvency Verdict**: `Resilient` (stays above emergency floor), `Tight` (dips into buffer but stays > €0), or `Insolvent` (cash deficit of €X in Month Y).
     - **Minimum Liquid Cash & Trough Month** + **Survival Runway** (months until €0 cash).
     - **Max Safe Monthly Commitment Headroom (`+€X / mo` or required cut `−€X / mo`)**: Computed via pure binary search over the disaster trajectory and translated into concrete guidance:
       - **Safe Rental Ceiling**: Maximum affordable warm rent while surviving the selected disaster(s).
       - **Safe Mortgage Ceiling**: Maximum monthly annuity (and implied loan size at current interest + `Tilgung`) that preserves solvency under shock.
5. **`Compare` Overlay**: Side-by-side comparison (`Planned vs. Baseline` and `StressTest vs. Planned`) across cumulative cashflow, ending net worth, minimum cash runway, and lifetime tax paid.

**Non-Destructive Scenario Levers (`lifePlannerDampening.ts`)**:
Users can toggle entire event groups off/on live from the workspace bar without deleting any configured events:
- `Career & Raises`
- `Family & Childcare`
- `Housing & Major Assets`
- `Tax Strategies & Deductibles`
- `Travel & Discretionary`
- `Inflation & Bracket Indexing`

---

## 3. Target UI / UX Architecture

Built with shared `src/components/ui/` primitives, tokenized CSS (`swiss`, `editorial`, `utility` × light/dark), centralized intention-named icons (`src/components/Icons.tsx`), and whisper-quiet `WikiRefLink` statutory cross-links.

### 3.1 Concept A Quiet Command Header + Unified Workspace Bar (~110px Chrome)

- **Row 1 — Quiet Command Header**:
  - Left: `Life Planner` title + `Beta` badge + interactive `LifePlanSummaryStrip` (compact clickable pills: `Household`, `Horizon`, `Events (N)`, `Cash & Net Worth`, `Tax Mode` — clicking any pill opens `LifePlanInputsDrawer` directly to that section).
  - Right: Primary `Edit Plan` button (opens slide-over `LifePlanInputsDrawer`) + `Plan` dropdown menu:
    - **Starter Templates** (`Young Professional`, `Growing Family & Home Purchase`, `Career Break & Sabbatical`, `Expat Blue Card to Citizenship`, `Blank Plan (€0)`)
    - **Sync from Life Profile** & **Import from Parental Planner**
    - **Export / Import** (JSON, CSV Ledger, ZIP bundle, Print/PDF summary)
    - **Clear Plan (€0)**
- **Row 2 — Unified Workspace Bar**:
  - Left: 6 horizontal workspace tabs (`Overview & Charts`, `Event Timeline`, `Monthly Ledger`, `Annual Tax`, `Deadlines` + warning badge, `Rules`).
  - Right: Segmented `ScenarioSwitcherBar` (`Planned` | `Baseline` | `Stress Test` | `Compare`) + `Levers` popover button (with active-dampened count badge) + Coalesced Calculation Status Pill.
- **Contextual Disaster Bar (visible only in `Stress Test` / `Compare` mode)**:
  - Compact 1-click disaster chips (`Fired 6m`, `Resigned + 12w Sperrzeit`, `Illness / Krankengeld`, `Partner Job Loss`, `€15k Emergency`, `Custom…`), a live non-destructive **Rent / Mortgage Commitment Delta Slider** (`−€500` to `+€1,500/mo`), and a live **Max Safe Commitment & Solvency Badge** (`Resilient · Max safe +€420/mo`).

### 3.2 Slide-Over `LifePlanInputsDrawer` (6 Calm Cards + Granular Modals)

Each card displays only calm, essential baseline values plus compact removable chips for active events/customizations, with a contextual drill-down button opening a focused modal:

1. **Household & Opening Balances** (`HouseholdBaselineCard` → `HouseholdBaselineModal`): Adults, steady gross/net salaries, opening liquid cash, emergency buffer target (months), federal state, church tax, existing debts/assets.
2. **Career & Income Events** (`CareerIncomeCard` → `CareerEventModal`): Add/edit job starts, raises, 13th–15th bonuses, working-hours changes, company car, commuter distance, sabbaticals, job endings (severance + ALG I).
3. **Family & Childcare Events** (`FamilyChildcareCard` → `FamilyEventModal`): Add/edit pregnancies/births, Elterngeld Basis/Plus/Mixed allocation, Kita/Krippe/Hort fees, regional family benefits, plus 1-click import from Parental Planner.
4. **Housing & Major Assets** (`HousingAssetsCard` → `HousingAssetModal`): Rent & indexation, home purchase (closing costs, down payment, mortgage amortization), vehicle purchase/lease, solar PV system, custom loans.
5. **Living Expenses, Travel & Tax** (`ExpensesTaxCard` → `ExpensesTaxModal`): Monthly living budget categories, planned travel trips, one-off inflows/outflows, tax-class switches, and annual/one-off `§§ 9, 10, 35a EStG` deductibles & capital income.
6. **Horizon, Stress Test & Residency** (`HorizonResidencyCard` → `HorizonMacroModal`): Start month/year, horizon (1–30 years, default 5 or 10 years), tax return payout month, CPI & bracket indexing, stress-test shock sliders, and residency/Blue Card/citizenship milestones.

### 3.3 Six Full-Width Analysis Tabs (Immediately Above the Fold)

1. **Overview & Charts (`OverviewTab`)**:
   - **4-KPI Scorecard (`MetricCard`)**: `Cumulative Net Cashflow`, `Ending Liquid Cash (Min Runway)`, `Ending Net Worth`, `Total Tax Paid & Refunds`.
   - **Diagnostics Strip (`LifePlanDiagnosticsStrip`)**: Liquidity/Runway health check, Highest-impact Tax Insight (e.g. Progression impact / `§ 35a` unused credit / `Günstigerprüfung`), Residency/Citizenship milestone countdown, and Event Conflict warnings.
   - **Interactive Multi-Series Chart**: Switchable views (`Monthly Cashflow`, `Liquid Cash Runway`, `Net Worth & Debt`, `Cumulative Tax`) with event markers, series toggles, and `Compare` dashed overlay.
2. **Event Timeline (`EventTimelineTab`)**:
   - Chronological multi-domain timeline grouped by year/month with category filters (Career, Family, Housing, Tax, Travel, Residency), `+ Add Event` quick launcher, inline edit/duplicate/mute/delete, and overlap/conflict banners.
3. **Monthly Ledger (`MonthlyLedgerTab`)**:
   - Full-width institutional table adhering to Rule 13 (action milestone rows above effective month) with columns for Month, Events/Phase, Net Income, Benefits, Housing & Living, Tax Settlement, Monthly Net, **Liquid Cash**, and **Net Worth**.
   - Expandable row drawer showing double-entry `AccountingTransaction` lines with `TaxBucket` badges, statutory `WikiRefLink` citations, and field/row explainers + CSV export.
4. **Annual Tax Collector (`AnnualTaxTab`)**:
   - Year-by-year tax return summary table + expandable statutory waterfall per calendar year:
     - Gross Wages + Benefit-in-Kind → Deductions (`Vorsorge`, `§ 9 Werbungskosten`, `§ 10 Sonderausgaben` incl. Kita) → `zvE` → `§ 32b` Progression Income (`Elterngeld`, `Mutterschutz`, `ALG I`) → Effective Tax Rate → `ESt` + `Soli` + `KiSt` − `§ 35a` Credits − `Günstigerprüfung` → Less Withheld `Lohnsteuer` → **Signed Refund / Nachzahlung** (linked to its exact payout month in the Monthly Ledger).
5. **Deadlines & Milestones (`DeadlinesTab`)**:
   - Unified chronological checklist of statutory deadlines across all active domains: Elterngeld/Elternzeit (`BEEG`), Mutterschutz (`MuSchG`), Tax Filing (`§ 149 AO`), Job-seeker registration (`§ 38 SGB III`), Kita applications, and Permit/Permanent Residency/Citizenship (`§ 18c AufenthG`, `§ 10 StAG`).
6. **Rules & Parameters (`RulesAndParametersTab`)**:
   - Live `ParameterObserverSection` and `WikiRefLink` legal provenance showing every statutory constant and formula consumed by the active plan.

---

## 4. Phased 0→100 Implementation Roadmap

- **Phase 0 (0% → 10%) — Blueprint, Domain Types & App Scaffolding**:
  - Finalize ideation blueprint (`.agents/ideation/life-planner-workbench-plan.md`).
  - Register `AppId.LifePlanner` (`life-planner`) with `CalculatorReleaseBadge.Beta` and route `/calculators/life-planner/` (keeping legacy `PlanningDashboard` and `/profile/` intact).
  - Define strongly-typed `src/engine/lifeSimulator/types.ts` (all `const` enums, branded types, `LifeSimulatorEvent` discriminated union, `TaxBucket`, `LifeMonthlyLedgerEntry`, `AnnualLifeTaxRecord`, `LifeSimulationResult`).
- **Phase 1 (10% → 30%) — Pure Life Simulator, Unified Tax Collector & Disaster Engine**:
  - Implement modular pure event evaluators (`careerEvaluator`, `familyEvaluator`, `housingAssetEvaluator`, `expenseTravelEvaluator`, `residencyEvaluator`).
  - Implement `annualTaxCollector.ts` aggregating all 12 months of tax buckets into exact German annual tax settlements (`EStG §§ 26b, 32a, 32b, 35a, 36; SolzG; Günstigerprüfung`) and posting signed settlements into `year + 1`.
  - Implement `lifeSimulator.ts` (monthly replay, balance-sheet tracking: Cash, Runway, Assets, Debt, Net Worth), `disasterSimulator.ts` (Fired/`ALG I`, Resigned/`Sperrzeit`, Illness/`Krankengeld`, Partner Loss, Lump-Sum Emergency, Rent/Rate Shock, Compound Disasters), `commitmentAffordability.ts` (Safe Rent & Mortgage Ceiling binary-search solver), `scenarioBuilder.ts` (`Planned`, `Baseline`, `StressTest`), and `lifePlannerPresets.ts`.
  - 100% unit + multi-year scenario test coverage (`src/engine/lifeSimulator/*.test.ts`).
- **Phase 2 (30% → 48%) — Workbench Store, Persistence & Concept A Shell**:
  - Build modular Preact Signals store in `src/apps/life-planner/store/` (`lifeWorkbenchState.ts`, `lifeWorkbenchSimulation.ts`, `lifeWorkbenchDampening.ts`, `lifeWorkbenchUiState.ts`) with 250ms coalesced calculation scheduler and browser persistence (`AppId.LifePlanner`).
  - Build Concept A Quiet Command Header, `LifePlanSummaryStrip`, Unified Workspace Bar, `ScenarioSwitcherBar` + `Levers` popover, **Contextual Disaster Bar** (1-click disaster chips + live Rent/Mortgage commitment slider + Max Safe Commitment badge), and `OverviewTab` (4 KPI cards + Diagnostics strip + Multi-series Chart).
- **Phase 3 (48% → 68%) — Slide-Over Plan Inputs Drawer & 6 Granular Modals**:
  - Implement `LifePlanInputsDrawer` and all 6 calm cards + granular drill-down modals (`HouseholdBaselineModal`, `CareerEventModal`, `FamilyEventModal`, `HousingAssetModal`, `ExpensesTaxModal`, `HorizonMacroModal`).
  - Add 1-click **Sync from Life Profile** and **Import from Parental Planner** bridges.
- **Phase 4 (68% → 84%) — Full Analysis Tabs (Timeline, Ledger, Annual Tax, Deadlines, Rules)**:
  - Implement `EventTimelineTab`, `MonthlyLedgerTab` (Rule 13 action rows, expandable double-entry transactions, tax-bucket badges, Cash & Net Worth columns, CSV export), `AnnualTaxTab` (statutory tax waterfall per year), `DeadlinesTab`, and `RulesAndParametersTab`.
- **Phase 5 (84% → 94%) — Export/Import, Cross-Theme Polish & Diagnostics**:
  - Full Export/Import modal (JSON, CSV, ZIP, Print/PDF).
  - Responsive & cross-theme verification across `swiss`, `editorial`, and `utility` × light/dark themes.
  - Compliance with `dependencyBoundaries.test.ts`, `isolation.test.ts`, `registry.test.ts`, and `npm run apply`.
- **Phase 6 (94% → 100%) — Parity Verification, Benchmarks & Beta → New Graduation**:
  - Longitudinal scenario tests verifying zero double-counting, exact tax parity with standalone calculators (`net-pay`, `parental-planner`, `company-car`, `housing`, `solar-energy`, `commuter-allowance`), and sub-50ms simulation benchmarks for 10-year horizons.
  - Promote badge from `Beta` → `New` upon UAT sign-off.
- **Phase 7 (Post-Sign-Off Retirement)**:
  - Mark legacy `PlanningDashboard` as `Deprecated`, evaluate migrating `/profile/` to link directly into `Life Planner`, and retire legacy dashboard code only after explicit user sign-off.

---

## 5. Architectural & Quality Guardrails

- **Strict Typing**: Branded types + `const` enums with validators everywhere; no raw string unions, no `as number` casts (Rules 10, 11, 12, 23).
- **Centralized Icons**: Any new icons added to `src/components/Icons.tsx` using intention-based names; zero inline `<svg>` or hardcoded emojis (Rule 22).
- **Design System**: Institutional palette, semantic CSS tokens only, tabular numerals in all financial tables & KPIs, responsive breakpoints (`640px`, `900px`, `1180px`) (Rule 19).
- **App Isolation**: `src/apps/life-planner/` must not import private internals of other apps (only shared `#engine/*`, `#components/*`, `#store/*`, `#utils/*`), verified by `src/apps/dependencyBoundaries.test.ts` and `src/apps/isolation.test.ts`.
- **Quality Gate**: Every commit passes `npm run apply` (lint + typecheck + unit/scenario/audit tests + Astro build) with `ASTRO_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1`.
