# Editable career salary changes

Status: complete. Requested: enter an actual salary when adding a career raise/promotion.

The existing button invents a 5% raise and creates a read-only card. Replace that flow with editable person, effective month, percentage or new regular monthly gross, and reason. Start new events with a neutral percentage, not an assumed raise.

New gross amounts are user-provided contract inputs, at the person's initial contractual weekly hours. Subsequent working-hours changes prorate that rate; subsequent percentage raises compound from it. Existing verified payroll year profiles remain responsible for deductions. Monthly amounts may be zero or lower than the previous salary. Both people require their own amount. Manual-net plans keep percentage editing; direct gross requires gross-input mode.

Atomic progression:
1. Add branded gross replacements and chronological payroll evaluation with regression tests.
2. Preserve replacements through raw imports and persisted-state validation, including zero and invalid/ambiguous payload tests.
3. Describe actual salary replacements correctly in timeline milestones.
4. Add the editable salary-change card and wire creation with consistent effective dates.
5. Verify controls, payroll integration, and build, then record completion.

Keep event rows non-financial, retain action/financial/base-month ordering, and leave unrelated files and saved scenarios untouched.


## Implemented atomic scopes

- `d0e6d76`: Branded contract gross replacements, explicit payload validation and chronological payroll evaluation. Gross is at initial contractual hours; later hours and percentages apply once.
- `08db8ba`: Strict imports and saved-state sanitization preserve both gross fields and zero, without injecting a percentage into replacement events. Invalid, incomplete or mixed percentage/gross replacements are rejected.
- `f0b32f2`: Timeline milestones show new monthly gross amounts, including both partners; percentage labels retain fractional precision. Non-financial action rows continue to precede base payroll.
- `f720845`: Editable person, calendar month, change method, required monthly gross amount(s), percentage and reason. Annual base preview explicitly means twelve regular payments, excluding configured extra payments/bonuses. Blank/invalid required fields retain the last valid input. Manual-net plans retain percentage editing.
- `d119049`: Replace read-only cards, remove the invented 5% default, use unique IDs and move keyboard focus into each new editor. New events begin as neutral zero-percent changes at the plan start until edited.

## Verification

- Ran formatter before each staging operation. Full `npm run check` and `npm run check:build` passed for every implementation scope; final audit reports zero errors/warnings.
- Permanent engine regression tests cover target isolation, actual replacement, later percentage compounding, working-hour prorating, zero gross, both partners, manual-net rejection, ambiguous/incomplete payloads, import/storage roundtrips and payroll/timeline parity.
- Headless rendering exercised actual editor handlers for October 2026, cents, both partners, zero, invalid/blank drafts, fractional percentages, reasons, manual-net option availability, and engine payroll before/after the chosen month. Existing planner-flow and annual-income render checks passed.
- Browser on isolated `localhost:4323` verified automatic focus after Add, October 2026 selection, direct gross entry, separate partner amounts, zero salary, live non-financial timeline labels, blank-input validation, saved amount restored after reload, and fractional percentages. The temporary event was removed afterward. No user scenarios were modified on another origin.
- At 390px, all new editor fields fit within the viewport. Reset the viewport afterward. Proof: `/tmp/calculator-salary-change.png`; narrow-layout capture: `/tmp/calculator-salary-change-mobile.png`. No exhaustive browser/assistive-technology matrix was run.
- Unrelated untracked `test-random/` remains untouched. No tax profile, statutory value, baseline payroll setting or deployment was changed by this work.
