---
name: Unified Law Reference, Value Storage, and Three-Tier Formula Architecture
status: active
created: 2026-11-14
---

# Unified Law Reference, Value Storage, and Three-Tier Formula Architecture

## Vision Summary

Replace isolated per-calculator statutory links and scattered rule summaries with a single, strongly typed, cross-referenced statutory infrastructure shared across all calculators (`net-pay`, `parental-leave`, `girocode`, and future calculators):

1. **Typed Law Reference Registry & Graph**: Every statutory reference (`§ x Code`, e.g. `§ 2b BEEG`, `§ 32a EStG`) is compile-time type-checked via `LawId` / `LawGroupId`, carries a map of cross-referenced laws (`relatedLaws: Readonly<Partial<Record<LawId, LawRelationMetadata>>>`), benefit/anti-benefit summaries, typed domain `LawTag` labels (`child`, `parent`, `tax`, `payroll`, `visa`, `energy`, `solar`, `green`, `car`, etc.), and a map of official `externalSources`.
2. **Unified Law Reference Popup**: Clicking any `§` reference anywhere in any calculator opens the shared `<LawReferenceModal />` instead of scrolling to calculator-specific bottom islands or immediately jumping to external pages. Inside the popup, users can inspect benefit/anti-benefit trade-offs, navigate across cross-referenced laws with history back-navigation, filter by tags, inspect governed parameter values, and open external official texts.
3. **Unified Law-Linked Parameter & Value Storage**: Consolidate statutory constants, year-indexed profiles, and modeling assumptions (`benefitRules`, `taxRules`, `ageReliefRules`, `benefitIncomeLimits`, `employmentThresholds`, `timelineConventions`, and future domains) into one typed parameter registry where every entry links to governing `LawId`s, validity years, and mutability policy (`StatutoryFixed`, `YearIndexed`, `Customizable`). One unified Parameter Observer & Editor section lets users inspect and customize values while raising explicit flags on unmodifiable statutory constants.
4. **Three-Tier Functional Calculation Architecture**:
   - **Tier 1 — Immutable, context-unaware pure mathematical formulas**: Pure functions receiving every input and statutory constant explicitly as named parameters so every formula has deterministic, self-contained correctness unit tests.
   - **Tier 2 — Immutable, context-aware evaluators**: Receive environment/statutory context (year-indexed constant storages, regional/cohort tables) and invoke Tier 1 pure mathematical formulas.
   - **Tier 3 — User & scenario calculations**: Combine Tier 2 context-aware evaluators with user-supplied data (salary history, family timeline, personal elections) and hypothetical/overridden scenarios.
5. **Shared Storage with Form-Focused Projections**: All calculators read from the same central law storage and value storage while each calculator form stays focused on its primary workflow (e.g., Net Pay on quick tax-class/scenario diffs; Parental Leave on multi-year leave & allowance planning) by supplying sensible defaults for out-of-focus parameters.
6. **Long-Term North Star (Future Stage — Not Current Scope)**: A general household/life profile input where users declare personal data and future supports/events once, and the engine automatically derives raises, salaries, benefits, bonuses, tax settlements, and cross-domain incentives.

---

## Large Stages & Atomic Steps

### Stage 1: Typed Law Reference Registry & Graph (`src/engine/laws/`) — Completed
1. [x] Define nominal types, `const` enums (`LawId`, `LawGroupId`, `LawTag`, `LawRelationType`, `ExternalSourceId`), runtime validators, and record/map metadata interfaces (`relatedLaws`, `externalSources`).
2. [x] Populate the central frozen `LAW_REGISTRY` and `LAW_GROUP_REGISTRY` covering all existing BEEG, MuSchG, EStG, SolzG, SGB, BVV, and official guidance references, with graph & integrity unit tests.

### Stage 2: Unified Law Reference Popup UI (`src/components/laws/`) — Completed
1. [x] Add intention-named legal/benefit/navigation icons to `src/components/Icons.tsx` and create an app-boundary-safe `lawReferenceStore.ts` managing modal state and in-popup navigation history.
2. [x] Build `<LawReferenceModal />` and `<LawRefLink />` using semantic institutional CSS tokens, supporting cross-reference navigation, back history, tag filtering, benefit/anti-benefit callouts, and external source links.
3. [x] Integrate `<LawReferenceModal />` and `<LawRefLink />` into Net Pay Calculator (`Calculator.tsx`, `CalculatorTaxableIncome.tsx`, `AnnualIncomeBreakdown.tsx`, `PayrollPersonalInputs.tsx`, `HouseholdIncomeInputs.tsx`, `CalculatorResultSummaries.tsx`) and Parental Leave Planner (`elterngeldStore.ts`, `ElterngeldDashboard.tsx`, `AnnualTaxableIncome.tsx`, `RulesExplainer.tsx`, `FieldExplainerModal.tsx`, `RowExplainerModal.tsx`, `SandboxControls.tsx`, `TimelineTable.tsx`).

### Stage 3: Unified Law-Linked Value Storage & Observer/Editor Section — Completed
1. [x] Define `ParameterId`, `ParameterMutability` (`StatutoryFixed`, `YearIndexed`, `Customizable`), `ParameterYearEntry`, and `ParameterDefinition` linking every rule value to `LawId[]`.
2. [x] Build central frozen `PARAMETER_REGISTRY` (`src/engine/parameters/registry.ts`) unifying `taxRules.json`, `benefitRules.json`, `benefitIncomeLimits.json`, `employmentThresholds.json`, and `timelineConventions.json` (83 typed parameters with numeric parity) alongside reactive `parameterStore.ts`.
3. [x] Build unified `<ParameterObserverSection />` (`src/components/parameters/`) mounted across Net Pay and Parental Leave showing every parameter, its linked `§` badge, year profile, default vs. active value, and mutability protection flags whenever unmodifiable statutory constants are touched.
4. [x] Cross-link `<LawReferenceModal />` to display, switch year profiles, edit customizable defaults, and verify statutory protection flags for all parameters governed by the currently viewed law.

### Stage 4: Three-Tier Formula Architecture (`math` → `context` → `scenario`)
1. Extract Tier 1 context-unaware pure mathematical functions (every constant as an explicit named parameter) with comprehensive 1:1 mathematical unit tests.
2. Build Tier 2 context-aware evaluators reading constants from the unified value storage / environment context (`CalculationContext`).
3. Refactor Tier 3 user/scenario calculators (`wageTax`, `annualEmploymentIncome`, `jointAssessment`, `elterngeldPlus`, `timelineGenerator`, etc.) to compose Tier 2 evaluators with user salary history and scenario overrides, emitting formula audit trails linked to `LawId`s.

### Stage 5: Shared Storage & Form-Focused Default Projections
1. Unify backend/storage persistence and reactive `@preact/signals` adapters for the shared law & parameter store while preserving `dependencyBoundaries.test.ts` and app-scoped personal scenario privacy.
2. Define form projection profiles so Net Pay, Parental Leave, and new calculators stay uncluttered by projecting default values for out-of-focus domains while exposing the shared parameter inspector.

### Stage 6 (Future North Star — Out of Current Scope): General Life & Support Input Engine
- Unified user profile + timeline event/support declarations driving automatic derivation of raises, bonuses, payroll, tax settlements, benefits, and future domain calculators (`visa`, `energy`, `solar`, `green`, `car`, `housing`).
