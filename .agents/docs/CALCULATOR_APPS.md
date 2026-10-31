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
