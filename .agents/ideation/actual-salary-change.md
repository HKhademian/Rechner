# Editable career salary changes

Status: in progress. Requested: enter an actual salary when adding a career raise/promotion.

The existing button invents a 5% raise and creates a read-only card. Replace that flow with editable person, effective month, percentage or new regular monthly gross, and reason. Start new events with a neutral percentage, not an assumed raise.

New gross amounts are user-provided contract inputs, at the person's initial contractual weekly hours. Subsequent working-hours changes prorate that rate; subsequent percentage raises compound from it. Existing verified payroll year profiles remain responsible for deductions. Monthly amounts may be zero or lower than the previous salary. Both people require their own amount. Manual-net plans keep percentage editing; direct gross requires gross-input mode.

Atomic progression:
1. Add branded gross replacements and chronological payroll evaluation with regression tests.
2. Preserve replacements through raw imports and persisted-state validation, including zero and invalid/ambiguous payload tests.
3. Describe actual salary replacements correctly in timeline milestones.
4. Add the editable salary-change card and wire creation with consistent effective dates.
5. Verify controls, payroll integration, and build, then record completion.

Keep event rows non-financial, retain action/financial/base-month ordering, and leave unrelated files and saved scenarios untouched.
