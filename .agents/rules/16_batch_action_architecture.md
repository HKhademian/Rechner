# Discrete Batch Action Architecture

The scenario simulation runner must receive and process input data and state transitions in discrete, modular batches:

1. **Batch 0 (Preexisting Baseline Conditions)**:
   - Initial tax classes, salaries, working hours, baseline child count, Kindergeld rates, 13th month bonus calendar months, tax return month, simulation duration.
2. **Batch 1 (Pregnancy Positive Decisions & Life Milestones)**:
   - Positive pregnancy test dates, calculated delivery dates, child index, post-birth part-time hours and net earnings, partner months count. *(Non-monetary user action events: render `—` on financial columns).*
3. **Batch 2 (Tax Class Switch Actions)**:
   - Effective start simulation month, target tax classes for husband and wife, statutory rationale (§ 2b BEEG), revert simulation month. *(Non-monetary user action events: render `—` on financial columns).*
4. **Batch 3 (Salary Raise & Career Actions)**:
   - Effective simulation month, percentage increase, target person (`TargetPerson.Both`, `TargetPerson.Husband`, `TargetPerson.Wife`), promotional or tariff reason. *(Non-monetary action milestone rows: render `—` on financial columns; new salary takes effect in base monthly rows).*
5. **Batch 4 (Financial Events & One-Off Costs / Inflows)**:
   - Effective simulation month, amount (positive for grants/income, negative for costs/expenses), category, description, and optional scenario scoping. *(Monetary special event rows with diff tracking and balance conservation).*

All batches must be dynamically editable by the user via interactive controls and fully testable via unit tests.
