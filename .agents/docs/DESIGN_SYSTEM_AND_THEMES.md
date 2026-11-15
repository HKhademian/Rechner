# German Financial Calculator & Elterngeld Simulator — Institutional Design System

## 1. Design Philosophy

This application is designed as an institutional-grade financial modeling platform for German household fiscal planning (BEEG / EStG / MuSchG).

- **Clarity & Trust**: Clear typography, high contrast, clean white surfaces, and subtle Slate borders.
- **Financial Precision**: Right-aligned tabular numerals, distinct debit/credit colors, and clear delta indicators.
- **No Distracting Aesthetics**: Zero neon gradients, zero rainbow badges, zero arbitrary color schemes.
- **Default Light Theme + Curated Palettes**: Light mode (`Cobalt`) by default, with full Dark mode (`color-scheme: dark`), `Auto` system sync, and 4 curated institutional palettes (`Cobalt`, `Forest`, `Indigo`, `Stone`) applied site-wide without FOUC.

---

## 2. Site-Wide Layout, Appearance & UI Architecture

### HTML Document Shell (`src/layouts/BaseDocument.astro`)
- All HTML pages under `src/pages/` wrap their output in `BaseDocument.astro` (excluding redirect-only `src/pages/elterngeld.astro`).
- Renders unified Content Security Policy headers and executes an inline synchronous pre-paint script reading `rechner:privacy:storage-mode:v1`, `rechner:shared:appearance:v1` (with legacy key fallback), and `prefers-color-scheme: dark` to set `data-theme` (`light` | `dark`) and `data-palette` (`cobalt` | `forest` | `indigo` | `stone`) before first paint.

### Application Shell & Global Navigation (`AppShell` & `Navigation`)
- Every interactive route renders inside `<AppShell>` (`src/components/ui/AppShell.tsx`), providing a single landmark hierarchy:
  1. Sticky top `<Navigation />` (`#main-navigation`) featuring the `Tools` dropdown switcher across all registered calculators (`allCalculatorApps`), `All calculators`, `Life Profile`, `Laws & Rules`, `Quick § Ref`, `<PrivacyStatus />`, and `<ThemeToggle />`.
  2. Focusable `<main id="main-content" className="ui-page [ui-page--wide]" tabIndex={-1}>` starting with `<PageHeader />`.
  3. Canonical `<footer className="ui-app-footer source-revision-footer"><SourceRevision /></footer>`.
- Site-wide appearance state lives in `src/store/themeStore.ts` + pure config/parsing helpers in `src/utils/themeConfig.ts` under `rechner:shared:appearance:v1`, honoring the active `StorageMode` and synchronizing across browser tabs.

### Shared UI Primitives (`src/components/ui/`)
- Canonical reusable primitives styled cleanly via CSS variables in `src/components/ui/UnifiedControls.css` (also barrel-exported via `src/components/ui/index.ts`):
  - `AppShell` (`uiHelpers.ts`), `PageHeader`, `MetricCard`, `NumberField`, `TextField`, `ChoiceSelect`, `SegmentedControl`, `ToggleSwitch`, `ModalDialog`, `StatusBanner`.
- Compliance is enforced automatically in CI by `src/components/ui/designSystemCompliance.test.ts` (AST verification of `BaseDocument` and `AppShell` adoption, typography/palette/dark tokens, zero undefined `var(--*)`, and zero unauthorized hardcoded `#hex`/`rgb()`/`rgba()`/`white` literals outside `src/styles/global.css`, `src/components/Icons.tsx`, and physical EPC QR optical contrast constants `QR_PAPER_LIGHT_HEX` / `QR_INK_DARK_HEX` in `src/apps/girocode/GiroCodeGenerator.tsx`).

---

## 3. Color Palette, Themes & Semantic Tokens (`src/styles/global.css`)

### Neutral Surface & Text Palette (Slate Spectrum)
| Token | Light Theme (Default) | Dark Theme | Purpose |
|---|---|---|---|
| `--bg-app` | `#f8fafc` (Slate 50) | `#0b0f19` (Deep Charcoal) | Main viewport canvas background |
| `--bg-surface` | `#ffffff` (Pure White) | `#111827` (Gray 900) | Primary cards, panels, modals |
| `--bg-surface-secondary` | `#f1f5f9` (Slate 100) | `#1e293b` (Slate 800) | Table headers, secondary toolbars |
| `--bg-surface-tertiary` | `#e2e8f0` (Slate 200) | `#334155` (Slate 700) | Pill chips, toggle backgrounds |
| `--bg-surface-elevated` | `#ffffff` (Pure White) | `#1f2937` (Gray 800) | Elevated popovers & dialogs |
| `--bg-backdrop` | `rgba(15, 23, 42, 0.68)` | `rgba(2, 6, 23, 0.78)` | Modal backdrop scrim |
| `--border-subtle` | `#e2e8f0` (Slate 200) | `#1f2937` (Gray 800) | Structural card & table dividers |
| `--border-strong` | `#cbd5e1` (Slate 300) | `#374151` (Gray 700) | Active inputs, outlines |
| `--text-primary` | `#0f172a` (Slate 900) | `#f8fafc` (Off-white) | Headings, primary numeric values |
| `--text-secondary` | `#334155` (Slate 700) | `#cbd5e1` (Slate 300) | Body text, table labels |
| `--text-muted` | `#64748b` (Slate 500) | `#94a3b8` (Slate 400) | Subtitles, footnotes, statutory notes |

### Curated Institutional Palettes (`[data-palette="cobalt|forest|indigo|stone"]`)
- **Cobalt (Default)**: Classic Slate & Cobalt (`#1d4ed8` light / `#3b82f6` dark).
- **Forest**: Cool Sage & Emerald (`#0f766e` light / `#2dd4bf` dark) with sage-tinted neutral surfaces.
- **Indigo**: Crisp Slate & Indigo (`#4338ca` light / `#818cf8` dark).
- **Stone**: Warm Paper & Deep Navy (`#1e3a8a` light / `#60a5fa` dark) with warm stone surfaces.

### Semantic Financial Tokens
| Token | Light Theme | Dark Theme | Financial Meaning |
|---|---|---|---|
| `--color-primary` | `#1d4ed8` (Blue 700) | `#3b82f6` (Blue 500) | Primary actions, brand accents |
| `--color-primary-bg` | `#eff6ff` (Blue 50) | `rgba(59, 130, 246, 0.15)` | Selected cards, active badge bg |
| `--color-gain` | `#047857` (Emerald 700) | `#10b981` (Emerald 500) | Positive cash inflow, state subsidies, refund |
| `--color-gain-bg` | `#ecfdf5` (Emerald 50) | `rgba(16, 185, 129, 0.15)` | Positive delta badge background |
| `--color-gain-border` | `#a7f3d0` (Emerald 200) | `rgba(16, 185, 129, 0.3)` | Positive delta badge border |
| `--color-loss` | `#b91c1c` (Red 700) | `#ef4444` (Red 500) | Outflows, costs, forgone subsidies |
| `--color-loss-bg` | `#fef2f2` (Red 50) | `rgba(239, 68, 68, 0.15)` | Negative delta badge background |
| `--color-loss-border` | `#fecaca` (Red 200) | `rgba(239, 68, 68, 0.3)` | Negative delta badge border |
| `--color-warning` | `#b45309` (Amber 700) | `#f59e0b` (Amber 500) | Statutory swap notice, caution note |
| `--color-warning-bg` | `#fffbeb` (Amber 50) | `rgba(245, 158, 11, 0.15)` | Warning banner background |

### 60-Month Stacked Timeline Series Colors
| Cash Flow Stream | CSS Token | Light Theme | Dark Theme | Legal / Financial Source |
|---|---|---|---|---|
| Husband Salary | `--series-salary-husband` | `#1e3a8a` | `#3b82f6` | § 38b EStG Earned Net Wage |
| Wife Salary | `--series-salary-wife` | `#4338ca` | `#6366f1` | § 38b EStG Part-Time Net Wage |
| Mutterschutzlohn | `--series-mutterschutz` | `#0284c7` | `#38bdf8` | § 19 MuSchG Maternity Net Pay |
| Mother Elterngeld | `--series-elterngeld-mother` | `#059669` | `#34d399` | § 4 BEEG Elterngeld / Plus |
| Father Partner Months | `--series-elterngeld-father` | `#0d9488` | `#2dd4bf` | § 4b BEEG Partner Months |
| Kindergeld | `--series-kindergeld` | `#d97706` | `#fbbf24` | § 66 EStG Child Benefit |
| Tax Office Refund | `--series-tax-refund` | `#0891b2` | `#22d3ee` | § 26b EStG Joint Assessment |

---

## 4. Typography Scale & Numerical Standards

- **Font Stacks**: `--font-family` (`Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`) and `--font-mono` (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`).
- **Tabular Numerals**: All currency figures and months use `font-variant-numeric: tabular-nums` or `--font-mono` to guarantee vertical column alignment.
- **Currency Formatting**: Standard German locale `1.234 €` (`de-DE`, maximumFractionDigits: 0).
- **Scale Tokens**:
  - `--font-size-hero`: `clamp(1.5rem, 2.5vw, 2rem)` (`--font-weight-extrabold: 800`, `--line-height-tight: 1.15`)
  - `--font-size-2xl`: `1.85rem` / `--font-size-xl`: `1.5rem` / `--font-size-lg`: `1.2rem`
  - `--font-size-md`: `1rem` / `--font-size-base`: `0.9rem` (`--line-height-normal: 1.5`)
  - `--font-size-sm`: `0.8125rem` / `--font-size-xs`: `0.75rem` / `--font-size-2xs`: `0.7rem`
  - Weights: `--font-weight-regular` (`400`), `--font-weight-medium` (`500`), `--font-weight-semibold` (`600`), `--font-weight-bold` (`700`), `--font-weight-extrabold` (`800`).
