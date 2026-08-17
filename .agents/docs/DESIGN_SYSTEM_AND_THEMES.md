# German Financial Calculator & Elterngeld Simulator — Institutional Design System

## 1. Design Philosophy

This application is designed as an institutional-grade financial modeling platform for German household fiscal planning (BEEG / EStG / MuSchG).

- **Clarity & Trust**: Clear typography, high contrast, clean white surfaces, and subtle Slate borders.
- **Financial Precision**: Right-aligned tabular numerals, distinct debit/credit colors, and clear delta indicators.
- **No Distracting Aesthetics**: Zero neon gradients, zero rainbow badges, zero arbitrary color schemes.
- **Default Light Theme**: Optimized for day-to-day readability with full Dark Theme support via seamless CSS variable switching.

---

## 2. Color Palette & Semantic Tokens

### Neutral Surface & Text Palette (Slate Spectrum)
| Token | Light Theme (Default) | Dark Theme | Purpose |
|---|---|---|---|
| `--bg-app` | `#f8fafc` (Slate 50) | `#0b0f19` (Deep Charcoal) | Main viewport canvas background |
| `--bg-surface` | `#ffffff` (Pure White) | `#111827` (Gray 900) | Primary cards, panels, modals |
| `--bg-surface-secondary` | `#f1f5f9` (Slate 100) | `#1e293b` (Slate 800) | Table headers, secondary toolbars |
| `--bg-surface-tertiary` | `#e2e8f0` (Slate 200) | `#334155` (Slate 700) | Pill chips, toggle backgrounds |
| `--border-subtle` | `#e2e8f0` (Slate 200) | `#1f2937` (Gray 800) | Structural card & table dividers |
| `--border-strong` | `#cbd5e1` (Slate 300) | `#374151` (Gray 700) | Active inputs, outlines |
| `--text-primary` | `#0f172a` (Slate 900) | `#f8fafc` (Off-white) | Headings, primary numeric values |
| `--text-secondary` | `#334155` (Slate 700) | `#cbd5e1` (Slate 300) | Body text, table labels |
| `--text-muted` | `#64748b` (Slate 500) | `#94a3b8` (Slate 400) | Subtitles, footnotes, statutory notes |

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
| Cash Flow Stream | Color Token (Light) | Color Token (Dark) | Legal / Financial Source |
|---|---|---|---|
| Husband Salary | `#1e3a8a` (Navy Blue) | `#3b82f6` | § 38b EStG Earned Net Wage |
| Wife Salary | `#4338ca` (Indigo) | `#6366f1` | § 38b EStG Part-Time Net Wage |
| Mutterschutzlohn | `#0284c7` (Sky Blue) | `#38bdf8` | § 19 MuSchG Maternity Net Pay |
| Mother Elterngeld | `#059669` (Forest Green) | `#34d399` | § 4 BEEG Elterngeld / Plus |
| Father Partner Months | `#0d9488` (Teal) | `#2dd4bf` | § 4b BEEG Partner Months |
| Kindergeld | `#d97706` (Amber) | `#fbbf24` | § 66 EStG Child Benefit |
| Tax Office Refund | `#0891b2` (Cyan) | `#22d3ee` | § 26b EStG Joint Assessment |

---

## 3. Typography & Numerical Standards

- **Font Family**: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
- **Tabular Numerals**: All currency figures and months use `font-variant-numeric: tabular-nums` or `ui-monospace` to guarantee vertical column alignment.
- **Currency Formatting**: Format standard German locale: `1.234 €` (`de-DE`, maximumFractionDigits: 0).
- **Scale Hierarchy**:
  - Main Hero Title: `2.25rem` / weight `800`
  - Section Headers: `1.25rem` / weight `700`
  - Card Titles: `1.05rem` / weight `700`
  - Body Text: `0.88rem` to `0.95rem` / weight `400`
  - Data Cells & Badges: `0.78rem` to `0.85rem` / weight `600`
