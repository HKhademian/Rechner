---
name: Taxable-income stage clarity
status: complete
created: 2026-10-30
---

# Taxable-income stage clarity

The user asked whether taxable income for KfW 300 comes after insurance deductions. Official references checked on 2026-10-30 confirm that deductible insurance is part of the deductions on the path to taxable income; not all insurance is fully deductible. KfW 300 uses assessed taxable income from tax notices, averaged across the second and third years before application. It explicitly excludes the adjustment in EStG section 2(5a).

Sources:
- EStG section 2: https://www.gesetze-im-internet.de/estg/__2.html
- EStG section 10: https://www.gesetze-im-internet.de/estg/__10.html
- Current KfW 300 leaflet, version 12/2025: https://www.kfw.de/PDF/Download-Center/F%C3%B6rderprogramme-(Inlandsf%C3%B6rderung)/PDF-Dokumente/6000005060_M_300_WEF.pdf (page 2)

## Focused correction

Promote the shared display's existing after-deduction amount above the partner contribution cards, on both pages. Label it as income after modeled deductions, before child allowances and further personal adjustments. Keep the intermediate employment contributions explicitly separate from final taxable income. Link the KfW income-evidence rule, without adding an eligibility decision or invented final zvE. Preserve calculations and saved inputs.

Commit the presentation separately from this documentation. Run formatter, full checks, affected-consumer build and headless rendering. Browser access was disabled in Work settings; do not claim visual verification.

## Outcome and verification

- `1cbef3e` promotes the recorded after-deduction amount above the intermediate partner cards on both pages. It explicitly distinguishes this estimate from final assessed zvE and links the official KfW 300 income-evidence rule. Lower reconciliation labels use the same meaning.
- Formatter, full audit (zero errors/warnings and passing tests), build and headless rendering passed. Rendering checks confirm ordering, both page integrations, unavailable evidence and the KfW source link. No calculations or saved inputs changed.
- Final browser layout/interaction verification remains unavailable because local browser access is disabled in Work settings.
