---
name: Gross input month-year preview
status: in_progress
created: 2026-10-31
---

# Gross input month-year preview

The user requested a small year/month conversion near salary inputs: a yearly sum when gross input is monthly, or a monthly average when gross input is yearly.

Use the existing calculated annual gross from each person's payroll schedule. Monthly ordinary pay is not always received for twelve months and extra contractual payments may apply, so its preview must use actual configured working months and salary payments. For yearly input show annual gross divided by twelve calendar months, labeled Monthly avg. This is a read-only aid and must not change the input period or financial calculations.

## Atomic scopes

1. Add a small reusable gross-period preview using existing annual gross, clear labels, two-decimal currency formatting, zero handling and a last-valid-input qualifier.
2. Place it below both live gross fields; preserve input units and validation.
3. Place it below saved/read-only and active-draft gross values, using each column's own input period and freshly calculated or draft payroll data. Show excluded partners as not included rather than inventing a conversion.

Run formatter before staging, full audit and build for code scopes. Verify ordinary monthly pay, extra salary payments, partial-year schedules, annual inputs, partner values, mixed-period saved scenarios, incomplete edits and narrow layouts. Preserve unrelated test-random files. The separate investigation into partner presence versus joint assessment remains proposed; this display change does not implement that model correction.
