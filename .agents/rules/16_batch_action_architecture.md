# Discrete Batch Action Architecture

The scenario simulation runner must receive and process input data and state transitions in discrete, modular batches:

1. **Batch 0 (Preexisting Conditions)**:
   - Initial tax classes, salaries, working hours, baseline child count, Kindergeld rates, 13th month bonus calendar months, tax return month, simulation duration.
2. **Batch 1 (Pregnancy Actions)**:
   - Positive pregnancy test dates, calculated delivery dates, child index, post-birth part-time hours and net earnings, partner months count.
3. **Batch 2 (Tax Class Switch Actions)**:
   - Effective start simulation month, target tax classes for husband and wife, statutory rationale (§ 2b BEEG), revert simulation month.
4. **Batch 3 (Salary Raise Actions)**:
   - Effective simulation month, percentage increase, target person (`TargetPerson.Both`, `TargetPerson.Husband`, `TargetPerson.Wife`), promotional or tariff reason.

All four batches must be dynamically editable by the user via interactive controls and fully testable via unit tests.
