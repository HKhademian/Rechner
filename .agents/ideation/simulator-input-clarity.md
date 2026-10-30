---
name: Simulator input and explanation clarity
status: in_progress
created: 2026-10-30
---

# Simulator input and explanation clarity

Continue the authorized UI work in focused, progressive atomic commits. Preserve engine results, saved-input semantics, source-linked financial configuration and action/event/base-row ordering. The unrelated untracked `test-random/` directory is out of scope.

## Ordered scopes

1. Remove the navigation's fixed five-year label and unexplained PRO badge; expose the active page to assistive technology.
2. Give the input panel a plain-language heading and a native keyboard-accessible disclosure button with expanded state.
3. Allow preset actions to wrap at narrow widths without changing their behavior.
4. Support linked sources on financial explanation factors as a small prerequisite for payroll evidence.
5. Replace the husband's fixed payroll examples with the recorded month and source-linked payroll breakdown. Manual-net records must state that deduction evidence is unavailable.
6. Apply the same recorded-payroll presentation to the wife's salary, removing the fixed full-time net and assumed part-time ratio.
7. Make salary stream notes in the monthly audit use recorded tax classes and stop claiming a fixed part-time schedule.

Each concern gets its own commit after `npm run fix`, `npm run check` and affected-consumer build. Add targeted regression checks for financial explanation mismatches and missing payroll evidence. Local browser access was disabled in Work settings during the preceding pass; use headless rendering where available and disclose unverified visual/interaction behavior instead of claiming it passed.
