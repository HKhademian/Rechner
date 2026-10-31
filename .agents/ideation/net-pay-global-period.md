# One global monthly/yearly control

Selected: a single amount-period control at the top of German Net Pay Calculator. It governs gross input presentation, comparison outputs and full breakdown dialogs; remove per-column gross-period selectors and dialog period buttons. Annual taxable-income evidence remains explicitly annual. Monthly outputs use calendar-month averages (annual / twelve), while monthly gross input is the ordinary contractual rate.

Changing presentation must not rewrite saved/live inputs, lose cents or change payroll. Preserve each person's original gross input basis internally; add an optional partner basis defaulting to the legacy household basis. A gross edit adopts the selected basis only for that person, without converting the other person's salary. Existing files remain importable; exports identify the new optional per-person basis with a new schema version. Keep period switching disabled while fields contain incomplete/invalid edits.

Atomic progression: representation/conversion/store and roundtrip tests; global control and gross-input adapters; remove repeated selectors and connect all outputs; verify no-toggle drift, partial years/extra salaries, mixed saved cases, invalid drafts and dialogs.

Prerequisite complete: outer workspace card and redundant Scenario Manager heading removed in a separate focused commit; table fills the workspace. Screenshot: /tmp/calculator-without-outer-card.png.
