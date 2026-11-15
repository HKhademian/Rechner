# Calculator app contract

The home page is a metadata-only marketplace. Each calculator has its own manifest, client entry, page route, financial store and storage namespace. Shared Preact UI and pure calculation libraries remain reusable within the Astro build.

## Current entry points

- `/`: `CalculatorCatalog`, search/category filters and pagination (`src/apps/registry.ts`).
- `/profile/`: `LifeProfileSummaryPage`, unified household profile overview (`src/store/lifeProfileStore.ts`).
- `/laws/` & `/laws/<lawId>/`: `LawReferencePage`, searchable German statutory rules directory.
- `/calculators/net-pay/`: `src/apps/net-pay/App.tsx`, backed by `calculatorStore.ts` and `taxConfigStore.ts`.
- `/calculators/parental-leave/`: `src/apps/parental-leave/App.tsx`, backed by `elterngeldStore.ts`.
- `/calculators/girocode/`: `src/apps/girocode/App.tsx`, backed by `girocodeStore.ts`.
- `/calculators/visa/`, `/calculators/company-car/`, `/calculators/solar-energy/`, `/calculators/housing/`: standalone domain planners (`App.tsx` + domain store per folder).
- `/elterngeld`: compatibility redirect to the parental-leave route.

Every HTML page wraps in `src/layouts/BaseDocument.astro`, and every interactive root renders inside `<AppShell>` (`src/components/ui/AppShell.tsx`). `Navigation` links to Home, provides a direct **Tools** dropdown switcher across `allCalculatorApps`, links to `Life Profile` and `Laws & Rules`, and renders `Quick § Ref`, `<PrivacyStatus />`, and `<ThemeToggle />`. The catalog, `LifeProfileSummaryPage`, `LawReferencePage`, and shared `src/components/ui/` primitives must never import any calculator-private financial store (`src/apps/dependencyBoundaries.test.ts`).

## State ownership and migration

`src/engine/storage/appStorage.ts` owns privacy mode (`rechner:privacy:storage-mode:v1`) and app-scoped persistence. Calculator keys follow `rechner:<app-id>:v1:<field>`, initialized only on routes that use that calculator. Global site-wide appearance (Light/Dark/Auto mode and `cobalt`/`forest`/`indigo`/`stone` palette) is stored under `rechner:shared:appearance:v1` (`src/store/themeStore.ts` + `src/utils/themeConfig.ts`), with read-only fallback from legacy `rechner:<app-id>:v1:theme` / `german_calc_theme_mode` keys.

Legacy calculator data is copied once from owned older keys. Existing new keys win, including zero amounts and empty saved collections. Legacy keys are retained. A migration marker remains after an app-owned value is cleared so it cannot be revived from legacy storage. Partial/quota-limited copies can retry; read/write failures leave calculators usable in memory. Namespace separation applies to workspaces within this site's browser origin.

Use `browserAppStorage(AppId.YourCalculator)` instead of raw global keys. Clear only owned fields through that adapter; keep the migration marker. Each new app must explicitly declare any legacy key mapping, or an empty mapping for a new calculator.

## Add another calculator

1. Add a stable slug to `AppId` and a legacy mapping in app storage. Runtime enum guards derive from the const definitions.
2. Create `src/apps/<slug>/manifest.ts` implementing `CalculatorAppDefinition`: identity, title, description, category, releaseStatus, keywords and user-facing features. Manifests contain metadata only.
3. Build the app's own entry/UI/store under `src/apps/<slug>/`, wrapping the root view in `<AppShell currentPath={calculatorPath(AppId.<YourCalculator>)}>` and composing UI from `src/components/ui/` (`PageHeader`, `NumberField`, `TextField`, `ChoiceSelect`, `SegmentedControl`, `ToggleSwitch`, `MetricCard`, `ModalDialog`, `StatusBanner`). Import shared pure engine libraries as needed; never import another calculator's store.
4. Add `src/pages/calculators/<slug>.astro` wrapping the client entry in `BaseDocument.astro` with manifest metadata (`title`, `description`).
5. Register the manifest in `src/apps/registry.ts`. Catalog categories, pagination, and the header **Tools** switcher update automatically.
6. Add unit tests alongside new stores/helpers, extend `src/apps/dependencyBoundaries.test.ts`, and verify `src/components/ui/designSystemCompliance.test.ts` passes cleanly. Give exported files an app-specific, versioned format and validate before replacing state.

Future common-calculation ideas are tracked as proposals in the marketplace ideation record, not advertised as working calculators.

## Verification contract

Run `npm run fix`, `npm run check` and `npm run check:build`. Check catalog search/category/empty states, pagination bounds, history restoration, exact route matching, independent stored calculator values, shared site-wide appearance across routes/reloads, and full dark/light palette compliance (`designSystemCompliance.test.ts`). Test storage migration with existing destination values, empty/zero values, legacy-key retention, blocked storage and reset without resurrection.

## Net-pay amount period

German Net Pay Calculator has one Monthly/Yearly control above its columns. The preference is local to net pay (`rechner:net-pay:v1:viewPeriod`) and controls gross input presentation, comparison results, compact calculation summaries and full breakdown dialogs. Annual taxable income and its evidence remain annual. Monthly result figures are annual totals divided by twelve calendar months; a monthly gross input is the regular contractual salary for the configured worked months and extra salary payments.

Switching the view leaves live and saved financial inputs intact. Editing gross adopts the selected basis only for that person. Primary salary keeps `inputMode`; optional `partnerInputMode` preserves the partner's independent basis and defaults to `inputMode` for legacy inputs. Neither a view switch nor editing the other partner converts a stored gross amount. With no worked months, an annual amount cannot infer a regular monthly rate; the monthly input shows unset until explicitly entered. Incomplete or invalid edits block switching and saving until corrected or canceled. The control restores its saved selection after hydration.

Net-pay JSON exports use document version 3 and carry the optional partner basis and assessment choice. Version 1 and 2 imports remain supported; a missing assessment choice becomes unspecified. The presentation preference is excluded from scenario exports; imports and saves preserve financial input bases. This does not change the parental-leave export format or its controls.

Validation: full quality audit and static build, salary-basis and transfer tests, headless rendering checks for one control and consistent summary/dialog totals, and isolated-origin browser checks for gross editing, saved drafts, invalid input blocking and restored period highlighting. No statutory policy values changed.

## Net-pay annual assessment accuracy

Partner presence and annual assessment are independent. With Partner 2 enabled, each live/saved column offers Choose, Individual, or Joint (spouses). Joint is an explicit election for eligible spouses or registered partners under [EStG section 26](https://www.gesetze-im-internet.de/estg/__26.html); it is never inferred from the checkbox or tax class. A two-person case without a choice retains payroll results but leaves annual taxable income unavailable. Existing cases without the field need a choice. Turning a partner off uses individual assessment while preserving the stored choice for re-enabling.

Individual mode calculates each person's deduction limits and zero floor separately before summing taxable income. The annual dialog shows that total and separate per-person detail panels. Joint mode retains pooled deductions. Assessment changes never change payroll withholding, original salary bases or the other scenario columns. Imports validate the mode before modifying live state; schema 3 prevents older readers from silently discarding the new assessment semantics.

Annual taxable income is unavailable when unresolved child allowances could affect it. This source-linked limitation is separate from otherwise valid payroll withholding; child eligibility, allocation/months and favorability checks remain unimplemented. Church-tax, single-parent and provisional-employment limitations remain.

Net-pay annual age relief uses actual wages including bonuses, the existing age-on-1-January input, and the permanent personal cohort under [EStG section 24a](https://www.gesetze-im-internet.de/estg/__24a.html). `src/data/ageReliefRules.json` stores the sourced cohort rates and caps, validated by `createAgeReliefRules`. It is separate from the pinned PAP withholding constants. Each person receives their own limit before joint or individual assessment; the annual cap is not prorated for partial-year employment. The annual details show a source-linked deduction only when positive. Unknown age preserves the existing no-age-relief assumption. Ordinary wages are the supported relief base; pension receipts and other income remain outside this model. The parental-leave timeline retains its separate age-relief limitation until its annual-record collector carries this deduction.
