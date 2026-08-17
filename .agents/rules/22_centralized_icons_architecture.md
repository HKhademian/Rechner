# Centralized Icons Architecture

All visual icons, SVG graphics, symbol badges, and iconographic markers in this project MUST be centrally defined in and exported from [src/components/Icons.tsx](file:///Users/ho/Projects/calculator/src/components/Icons.tsx).

## Architectural Mandates

1. **Single Source of Truth**:
   - No component, page, or module may declare inline `<svg>` elements or import third-party icon libraries directly.
   - All icons must be declared as strongly-typed Preact components in `src/components/Icons.tsx`.

2. **No Hardcoded Visual Emojis**:
   - Visual emojis (such as ☀️, 🌙, 💻, 📅, ⚡, 💰, 👶, 💼, 🔄, 📜, 💡, 🔗, 🔍, ✕, ⚠, ✓, ↗) used as UI icons, button markers, tab symbols, or badge indicators must NOT be hardcoded as raw text/emojis in component JSX.
   - Every visual symbol must be encapsulated in an exported Icon component in `src/components/Icons.tsx` (e.g. `SunIcon`, `MoonIcon`, `MonitorIcon`, `CalendarIcon`, `LightningIcon`, `CoinsIcon`, `BabyIcon`, `BriefcaseIcon`, `TaxSwitchIcon`, `ScrollDocIcon`, `LightbulbIcon`, `LinkChainIcon`, `SearchIcon`, `CloseIcon`, `WarningTriangleIcon`, `CheckmarkIcon`, `ExternalLinkIcon`, `ParagraphSymbolIcon`, etc.).

3. **Consistent IconProps Interface**:
   - All icon components must accept optional `size?: number` and `className?: string` props with sensible institutional defaults.
   - Scalable vector graphics (`<svg>`) or accessible semantic wrappers should be used for crisp institutional rendering across light and dark themes.
