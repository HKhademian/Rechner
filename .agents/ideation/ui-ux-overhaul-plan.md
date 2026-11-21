# UI/UX Overhaul Blueprint — Switchable Minimal Design System

## Context & Goals

Rechner has grown to 31 calculator routes, 138 TSX components, and 36 stylesheets. While the underlying `AppShell`, `src/components/ui/`, and `global.css` palette system establish a strong foundation, rapid feature expansion produced:

- 665 inline `style={{ ... }}` occurrences concentrated in the Elterngeld simulator and Net Pay comparison views.
- Ad-hoc raw HTML controls (`<input>`, `<select>`, `<button>`, `<table>`, `<details>`) bypassing `src/components/ui/`.
- Missing spacing (`--space-*`), layout container (`--container-*`), z-index (`--z-*`), and control-height tokens, plus 9 unused legacy CSS variable aliases and 25+ hardcoded `font-size` literals.
- 11 scattered `@media` breakpoints and a broken CSS selector in `UnifiedControls.css` (`.ui-text-box--compact` / `.ui-text-box--monospace`).
- Visual clutter in the sticky header (`Navigation.tsx`), dense bulleted catalog cards (`CalculatorCatalog.tsx`), and heavy 4px left-bordered `MetricCard` accents.

## Core Design Decision: Switchable Minimal Design Styles

Users can switch site-wide across **3 curated minimal design styles** (`data-style`) orthogonal to **Color Mode** (`data-theme="light" | "dark"`, light default) and **Color Palette** (`data-palette="cobalt" | "forest" | "indigo" | "stone"`):

1. **Swiss Precision (`swiss` — Default)**: Hairline 1px borders, crisp 6–8px geometry, flat resting surfaces, tight Inter sans typography, institutional clarity for dense tables and multi-scenario comparisons.
2. **Warm Editorial (`editorial`)**: Warm alabaster/stone-tinted surfaces, classic serif display headings paired with clean sans UI and tabular numerals, generous card breathing room, pill badges.
3. **Modern Utility (`utility`)**: Soft neutral canvas, elevated 16px cards, borderless soft-tinted input wells that lift cleanly on focus, calm monochrome-first hierarchy.

## 5-Phase Rollout Sequence

1. **Phase 1 — Unified Design Tokens & Switchable Styles**:
   - Add `ThemeStyle` const enum + validator (`src/engine/types.ts`), extend `themeConfig.ts`, `themeStore.ts`, `BaseDocument.astro`, and `ThemeToggle.tsx`.
   - Expand `src/styles/global.css` with spacing, container, z-index, control-height, surface, display-font, radius, shadow, and `prefers-reduced-motion` tokens plus light/dark rules for all 3 styles.
   - Remove the 9 dead legacy variable aliases and strengthen `designSystemCompliance.test.ts`.
2. **Phase 2 — Reusable UI Component Library & Pattern Deduplication**:
   - Add `Button`, `Badge`, `Card`/`CardHeader`, `DataTable`, `Disclosure`, `PopoverMenu`, `CalculatorWorkspace`/`FieldGroup`/`FieldRow`/`LawReferenceBar`, `EmptyState`, and `Pagination` to `src/components/ui/`.
   - Fix broken selectors in `UnifiedControls.css` and migrate away from inline `style={{}}` across Elterngeld (`SandboxControls`, `TimelineTable`, `DataExportImportModal`, `TimelineChart`, `RulesExplainer`, `FieldExplainerModal`, `RowExplainerModal`, `KpiScorecard`) and Net Pay (`ComparisonTable`, `ResultsDisplay`, `PayrollPersonalInputs`, `TaxSettings`).
3. **Phase 3 — Minimal Layouts, Navigation & Visual Clutter Reduction**:
   - Streamline `Navigation.tsx` to clean brand, primary destinations (`Calculators` + switcher, `Life Profile`, `Reference`), and quiet utilities (`§` quick reference, Privacy, Appearance).
   - Minimalize `CalculatorCatalog.tsx` with inline filters and clean clickable cards without bullet-list noise or repeated `Open` buttons.
   - Use progressive disclosure (`Disclosure`) for secondary calculator options and embedded statutory assumptions (`ParameterObserverSection`).
4. **Phase 4 — Consistent Controls, Result Cards & Interactive States**:
   - Refine `MetricCard` (clean typographic hierarchy without heavy 4px left border bars), unify `:focus-visible` rings, consistent control heights, and standardized header utility actions.
5. **Phase 5 — Mobile UX, Responsive Breakpoints & Accessibility Polish**:
   - Standardize `@media` breakpoints to 3 canonical tiers (`640px`, `900px`, `1180px`), enforce 44px mobile touch targets, responsive table scroll containers, and automated compliance verification via `npm run apply`.
