# Independent calculator apps and home catalog

Selected: make / a searchable calculator marketplace, give each current calculator a canonical /calculators/<slug>/ route, and prepare the app contract for additional common calculators. Default interpretation of pagination: catalog navigation, with page controls only when needed; optional user clarification pending.

Current scope: existing Net Pay Calculator and Parental Leave Planner only. New financial engines are not implied by catalog scaffolding. Each app has its own manifest and entry module, isolated page bundle, local storage namespace, financial state and appearance setting. The catalog imports metadata only. Shared UI and pure engine libraries remain reusable.

Preserve old saved inputs with a copy-only, once-per-app migration. Existing destination keys win; legacy keys remain untouched; cleared new data must not reappear from legacy keys. Include net-pay year, personal payroll and saved cases, parental state, and per-app theme. Storage failures must not crash calculators. Namespace isolation is application behavior on one origin, not a browser security boundary.

Canonical routes: /calculators/net-pay/ and /calculators/parental-leave/. Preserve /elterngeld as a redirect. The home page intentionally becomes the catalog. Registry-driven cards, navigation and app-scoped storage prepare additional apps without loading their stores on the home page. Use semantic design tokens and accessible responsive cards/search/filter/pagination.

Atomic progression: app manifests and catalog model; scoped storage and migration; wire each app's persistence separately; app entries/routes/navigation; catalog UI; verification and contributor contract. Full formatter/audit/build before each implementation commit; preserve unrelated test-random files and user data.
