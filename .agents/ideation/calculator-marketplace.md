# Independent calculator apps and home catalog

Selected: make / a searchable calculator marketplace, give each current calculator a canonical /calculators/<slug>/ route, and prepare the app contract for additional common calculators. Default interpretation of pagination: catalog navigation, with page controls only when needed; confirmed by the user.

Current scope: existing Net Pay Calculator and Parental Leave Planner only. New financial engines are not implied by catalog scaffolding. Each app has its own manifest and entry module, isolated page bundle, local storage namespace, financial state and appearance setting. The catalog imports metadata only. Shared UI and pure engine libraries remain reusable.

Preserve old saved inputs with a copy-only, once-per-app migration. Existing destination keys win; legacy keys remain untouched; cleared new data must not reappear from legacy keys. Include net-pay year, personal payroll and saved cases, parental state, and per-app theme. Storage failures must not crash calculators. Namespace isolation is application behavior on one origin, not a browser security boundary.

Canonical routes: /calculators/net-pay/ and /calculators/parental-leave/. Preserve /elterngeld as a redirect. The home page intentionally becomes the catalog. Registry-driven cards, navigation and app-scoped storage prepare additional apps without loading their stores on the home page. Use semantic design tokens and accessible responsive cards/search/filter/pagination.

Atomic progression: app manifests and catalog model; scoped storage and migration; wire each app's persistence separately; app entries/routes/navigation; catalog UI; verification and contributor contract. Full formatter/audit/build before each implementation commit; preserve unrelated test-random files and user data.


## Completed atomic scopes

- `9a5347f`: Typed app definitions, separate manifests, exact route lookup and catalog filter/page model.
- `9eb4abf`: Unique app namespaces with copy-only, idempotent legacy migration and blocked-storage handling.
- `e7f2165`: Net-pay inputs, personal payroll, year and saved cases use the owning namespace.
- `57e0f84`: Parental plan state uses its own namespace; legacy saves survive migration and cannot reappear after clear.
- `b74c89f`: Separate app entry modules and dedicated page routes.
- `aac1b3b`: Scalable navigation, compatibility redirect and independently scoped appearance preferences.
- `42241b6`: Correct saved-theme control selection after browser hydration.
- `5209658`: Home marketplace, search/category/empty states, bookmarkable pagination/history, mobile layout and static runtime-dependency guards.

## Verification

Formatter, full quality audit (zero errors/warnings) and static build passed for each code scope. Four routes build: catalog, two calculator pages and the old parental redirect. Permanent tests cover route identity, search/category/pagination bounds, copy-only migration, destination precedence, zero/empty values, incomplete migration retries, clear without revival, browser-storage failures, separate store initialization and per-route appearance. Static runtime-import guards prevent the catalog and either app entry from initializing foreign financial stores.

Headless rendering verified catalog cards, pagination visibility/current/disabled controls with a smaller test page size, active navigation and existing calculator summaries. Browser on a separate preview origin verified German-keyword search, category filters, empty-state recovery, URL/history restoration, both standalone app routes, old planner redirect, retained net-pay values/saved cases after visiting the planner, separate appearance preferences and their restored indicators, keyboard skip navigation, and 390px layout without horizontal overflow. Current two-item production catalog needs one page; multi-page bounds and rendering were tested through the model/fixture, not claimed as a live multi-page browser session.

Restored temporary preview inputs, removed the saved test case and restored light appearance. Existing user-origin inputs and unrelated test-random/ were untouched. Proof: /tmp/calculator-marketplace.png and /tmp/calculator-marketplace-mobile.png. No exhaustive browser/assistive-technology matrix was run. Financial formulas and statutory profiles were not changed.

## Possible next calculators (proposed, not implemented)

Percentage/discount, VAT, compound interest, loan repayment, date differences and unit conversion are candidates. Each needs its own app entry, engine/reference checks, owned state and, where relevant, sourced/versioned parameters before registration as available. The completed app contract documents the extension workflow; no placeholder calculator routes are advertised.
