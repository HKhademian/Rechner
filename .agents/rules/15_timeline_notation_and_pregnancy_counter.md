# Timeline Notation, Relative Pregnancy Counter & Absolute Month Identifiers

## 1. User-Facing Relative Month Counter (`Mx`)
The relative month counter (`Mx`) in user interfaces, tables, and reports must start relative to the **first pregnancy positive test**, NOT the arbitrary start of the simulation buffer:

1. **Origin ($M1$)**: The month containing the first positive pregnancy test is designated as `M1 (Pregnancy Positive)` (relative index $1$).
2. **Pre-Pregnancy ($M-x$)**: Planning months prior to the first positive pregnancy test are designated as negative offsets (`M-1`, `M-2`, ..., `M-8`).
3. **Post-Pregnancy ($Mx$)**: Months from the positive pregnancy test count forward (`M2`, `M3`, ..., `M9 (Birth 1)`, ..., `M60`).
4. **Delivery Milestones**: Child 1 delivery typically occurs at `M9 (Birth 1)` (8 months after positive pregnancy test at gestation week ~40).

## 2. Immutable Absolute Internal Identifiers (`MonthId`)
Internal IDs, accounting transaction keys, and DOM entity identifiers must **never** rely on relative offsets (which shift when scenarios or buffers change). Instead, they must strictly use absolute calendar month identifiers:

- **Format**: `M` + 2-digit month (01–12) + 4-digit year (e.g. `M092026`, `M012026`, `M122030`).
- **Nominal Brand**: `MonthId = Brand<string, "MonthId">` via `toMonthId(month, year)` and `isMonthId(val)`.
- **Entity Identification**: All transactions (`TX-M092026-...`), special events (`EVENT-M092026-...`), and action rows (`ACTION-...-M092026`) must embed the absolute `MonthId`.
