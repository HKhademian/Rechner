# Calculator app contract

The home page is a metadata-only marketplace. Each calculator has its own manifest, client entry, page route, financial store and storage namespace. Shared Preact UI and pure calculation libraries remain reusable within the Astro build.

## Current entry points

- `/`: `CalculatorCatalog`, search/category filters and pagination. The catalog page size is configured in `src/apps/registry.ts`; controls appear only for multiple pages. Search, category and page are URL parameters and work with browser history.
- `/calculators/net-pay/`: `src/apps/net-pay/App.tsx`, backed by `calculatorStore.ts` and its own payroll-year settings.
- `/calculators/parental-leave/`: `src/apps/parental-leave/App.tsx`, backed by `elterngeldStore.ts` and calendar-year payroll profiles from its plan.
- `/elterngeld`: compatibility redirect to the parental-leave route.

`Navigation` links to the catalog and identifies the current calculator. The catalog has no dependency on either financial store. The app entry dependency tests guard that boundary and prevent either app from importing the other calculator's financial store.

## State ownership and migration

`src/engine/storage/appStorage.ts` owns app-scoped persistence. Keys follow `rechner:<app-id>:v1:<field>`:

- Catalog: appearance only.
- Net pay: salary/partner inputs, saved scenarios, verified payroll year, personal payroll options, factor and appearance.
- Parental leave: complete plan state and appearance.

A full page visit initializes only that calculator's stores. Saved data persists across visits; unsaved scenario drafts remain session-local. The existing entry modules reuse UI implementations under `src/components`; new calculators may keep their UI/store beside their app entry.

Legacy data is copied once from owned older keys. Existing new keys win, including zero amounts and empty saved collections. Legacy keys are retained. A migration marker remains after an app-owned value is cleared so it cannot be revived from legacy storage. Partial/quota-limited copies can retry; read/write failures leave calculators usable in memory. Namespace separation applies to workspaces within this site's browser origin.

Use `browserAppStorage(AppId.YourCalculator)` instead of raw global keys. Clear only owned fields through that adapter; keep the migration marker. Each new app must explicitly declare any legacy key mapping, or an empty mapping for a new calculator. Appearance is owned by the route's app, including an independent catalog preference.

## Add another calculator

1. Add a stable slug to `AppId` and a legacy mapping in app storage. Runtime enum guards derive from the const definitions.
2. Create `src/apps/<slug>/manifest.ts` implementing `CalculatorAppDefinition`: identity, title, description, category, keywords and user-facing features. Manifests contain metadata only.
3. Build the app's own entry/UI/store under `src/apps/<slug>/`. Import shared pure engine libraries as needed; never import another calculator's store. Keep financial values branded and source/version statutory parameters according to repository rules.
4. Add `src/pages/calculators/<slug>.astro` importing only that entry and manifest. Use its manifest metadata for the page title and description. Include the common navigation and a focusable `main-content` target.
5. Register the manifest in `src/apps/registry.ts`. Register only working calculator routes. Catalog categories and pagination update from that list; no new navigation tab is required.
6. Add engine reference cases and app isolation, persistence, import/export and route verification appropriate to the calculator. Extend dependency boundary checks when adding another financial store. Give exported files an app-specific, versioned format and validate before replacing state.

Future common-calculation ideas are tracked as proposals in the marketplace ideation record, not advertised as working calculators.

## Verification contract

Run `npm run fix`, `npm run check` and `npm run check:build`. Check catalog search/category/empty states, pagination bounds, history restoration, exact route matching, independent stored values and per-app appearance. Verify narrow layout and keyboard access. Test storage migration with existing destination values, empty/zero values, legacy-key retention, blocked storage and reset without resurrection. Use an isolated browser origin for interaction tests instead of changing user saved scenarios.

## Net-pay amount period

German Net Pay Calculator has one Monthly/Yearly control above its columns. The preference is local to net pay (`rechner:net-pay:v1:viewPeriod`) and controls gross input presentation, comparison results, compact calculation summaries and full breakdown dialogs. Annual taxable income and its evidence remain annual. Monthly result figures are annual totals divided by twelve calendar months; a monthly gross input is the regular contractual salary for the configured worked months and extra salary payments.

Switching the view leaves live and saved financial inputs intact. Editing gross adopts the selected basis only for that person. Primary salary keeps `inputMode`; optional `partnerInputMode` preserves the partner's independent basis and defaults to `inputMode` for legacy inputs. Neither a view switch nor editing the other partner converts a stored gross amount. With no worked months, an annual amount cannot infer a regular monthly rate; the monthly input shows unset until explicitly entered. Incomplete or invalid edits block switching and saving until corrected or canceled. The control restores its saved selection after hydration.

Net-pay JSON exports use document version 3 and carry the optional partner basis and assessment choice. Version 1 and 2 imports remain supported; a missing assessment choice becomes unspecified. The presentation preference is excluded from scenario exports; imports and saves preserve financial input bases. This does not change the parental-leave export format or its controls.

Validation: full quality audit and static build, salary-basis and transfer tests, headless rendering checks for one control and consistent summary/dialog totals, and isolated-origin browser checks for gross editing, saved drafts, invalid input blocking and restored period highlighting. No statutory policy values changed.

## Net-pay annual assessment accuracy

Partner presence and annual assessment are independent. With Partner 2 enabled, each live/saved column offers Choose, Individual, or Joint (spouses). Joint is an explicit election for eligible spouses or registered partners under [EStG section 26](https://www.gesetze-im-internet.de/estg/__26.html); it is never inferred from the checkbox or tax class. A two-person case without a choice retains payroll results but leaves annual taxable income unavailable. Existing cases without the field need a choice. Turning a partner off uses individual assessment while preserving the stored choice for re-enabling.

Individual mode calculates each person's deduction limits and zero floor separately before summing taxable income. The annual dialog shows that total and separate per-person detail panels. Joint mode retains pooled deductions. Assessment changes never change payroll withholding, original salary bases or the other scenario columns. Imports validate the mode before modifying live state; schema 3 prevents older readers from silently discarding the new assessment semantics.

Annual taxable income is unavailable when unresolved child allowances or annual age relief could affect it. These source-linked limitations are deliberately separate from otherwise valid payroll withholding. This prevents reporting the incomplete intermediate base as a supported result; it does not implement child eligibility, allocation/months, favorability checks or annual age-relief deductions. Church-tax, single-parent and provisional-employment limitations remain. Published year profiles and statutory values are unchanged.
