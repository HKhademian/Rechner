# Institutional Design System & Theme Architecture

The user interface must convey institutional trust, financial precision, and clarity.

1. **Default Light Theme**:
   - The default and primary theme across all pages is the **Institutional Light Theme**.
   - Dark theme is optionally supported via user toggle and system preference.

2. **Strict Color Palette & Prohibition of Playful Styling**:
   - Playful/childish gradients, rainbow accents, and arbitrary unharmonious colors are strictly prohibited.
   - Use a curated institutional palette based on Slate neutrals with high-contrast semantic financial indicators:
     - **Primary Accent**: Institutional Cobalt / Deep Blue (`#1d4ed8` / `#1e40af`)
     - **Financial Inflow / Gain**: Forest Emerald (`#047857` text, `#ecfdf5` background, `#a7f3d0` border)
     - **Financial Outflow / Cost / Deficit**: Crimson / Ruby (`#b91c1c` text, `#fef2f2` background, `#fecaca` border)
     - **Statutory Warnings / Swaps**: Warm Amber (`#b45309` text, `#fffbeb` background, `#fde68a` border)
     - **Surfaces & Borders**: Slate neutrals (`#ffffff`, `#f8fafc`, `#f1f5f9`, `#e2e8f0`, `#cbd5e1`, `#0f172a`)

3. **Switchable Minimal Design Styles (`data-style`)**:
   - The design system supports three curated, institutional minimal styles applied orthogonal to Light/Dark mode and color palettes:
     - `swiss` (Default): Crisp hairline borders, flat resting surfaces, 6–8px geometry, geometric sans headings.
     - `editorial`: Warm neutral paper surfaces, serif display headings paired with sans UI and tabular numerals, generous spacing.
     - `utility`: Soft neutral canvas, generous rounded cards, soft-filled inputs that elevate on focus, calm monochrome-first restraint.

4. **Central Design Tokens & Semantic CSS Variables**:
   - All components must reference semantic design tokens (`var(--bg-app)`, `var(--bg-surface)`, `var(--text-primary)`, `var(--border-subtle)`, `var(--color-gain)`, `var(--space-*)`, `var(--font-size-*)`, `var(--radius-*)`, `var(--z-*)`, etc.).
   - Never hardcode raw color literals, magic `z-index` values, or ad-hoc inline `style={{ ... }}` objects for layout/styling (prefer `src/components/ui/` primitives and tokenized stylesheets).
   - Responsive rules should target the canonical breakpoint tiers (`640px`, `900px`, `1180px`).

5. **Financial Typography, Minimalism & Tabular Alignment**:
   - Financial figures must use tabular numerals (`font-variant-numeric: tabular-nums` or monospace) and right-alignment in data tables.
   - Prefer clean typographic hierarchy, generous whitespace, and progressive disclosure over heavy border stripes, redundant bullet lists, or cluttered headers.
   - Text contrast must exceed WCAG AA/AAA accessibility standards across all theme, palette, and style combinations.
