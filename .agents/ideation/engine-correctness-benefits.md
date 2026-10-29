---
name: Engine correctness - benefit formulas
status: in_progress
created: 2026-10-29
todos:
  - id: money-precision
    content: "Prerequisite - preserve monetary cents"
    status: completed
  - id: sourced-benefit-configuration
    content: "Prerequisite - configurable source-linked benefit rules"
    status: in_progress
  - id: plus-personal-ceiling
    content: "Fix 1 - apply the personal ElterngeldPlus ceiling"
    status: pending
  - id: capped-assessable-net
    content: "Fix 2 - cap assessable pre-birth net income"
    status: pending
  - id: sibling-bonus
    content: "Fix 3 - correct sibling bonus minimum and ceiling"
    status: pending
  - id: father-allocation
    content: "Fix 4 - honor father eligibility and requested partner months"
    status: pending
plans:
  requires: []
  blocks: [engine-correctness-payroll.md]
  parallel: []
---

# Engine correctness: benefit formulas

## Mission

Repair the isolated benefit errors first, using independently sourced expected amounts. Implement one todo at a time; keep each correction and its regression tests in its own atomic commit.

## Done

- 2026-10-29: monetary constructors preserve cents and round half cents away from zero; 76 constructor tests and the full quality check pass.

- The review reproduced all four defects; no repairs have been implemented.
- The existing full quality audit and production build passed during the review. Some passing tests encode incorrect statutory expectations.

## Plan links and read first

- Orchestrator: [master plan](./engine-correctness-master.md), wave 1; shared constraints and source register apply.
- Next: [payroll plan](./engine-correctness-payroll.md), only after this file is complete.
- Read [benefit calculations](../../src/engine/benefits/elterngeldPlus.ts), [sibling bonus](../../src/engine/benefits/siblingBonus.ts), [timeline generator](../../src/engine/simulator/timelineGenerator.ts), and [project rules](../rules/).

## Prerequisites added during execution

- Money constructors currently discard cents, preventing valid fractional caps and bonus minima. Preserve cents first in a standalone commit with constructor regressions.
- User requested configurable values with official source links. Add validated immutable benefit configuration in a separate commit, then inject it into every affected calculation. Payroll-year configuration follows the same source/value pattern in wave 2.

## Fix 1 - plus-personal-ceiling

**Depends on:** none.
**Files:** modify `src/engine/benefits/elterngeldPlus.ts`, its unit and granular tests, and affected explanation assertions only.
**Actions:** determine the applicable BEEG rounding rules first; document them beside source-backed fixtures. Calculate the no-post-birth-income Basis entitlement separately, then bound Plus by half that personal entitlement. Preserve the separate Basic/Plus minima and hours exclusion; make cap flags describe the applicable personal cap. Do not simply halve every actual income-loss benefit.
**Acceptance:** pre-birth/post-birth net inputs of 2000/0 and 2000/500 yield Plus 650; 2000/1200 yields Plus 520. Zero-income minimums remain Basic 300 and Plus 150 for eligible recipients. The existing 2603/0 expectation of Plus 900 is corrected from the statutory calculation, including documented rounding. Expected values are not calculated by calling production helpers.
**Verify:** focused Node tests for `elterngeldPlus.test.ts` and `elterngeldScale.granular.test.ts`, then the shared commit gate.

## Fix 2 - capped-assessable-net

**Depends on:** plus-personal-ceiling.
**Files:** modify `src/engine/benefits/elterngeldPlus.ts`, its tests, and explanation expectations affected by the income-loss definition.
**Actions:** limit the pre-birth income used for the income difference to the statutory maximum before subtracting post-birth income. Distinguish supplied and assessed income in the result/explanation where useful. Keep this correction separate from Fix 1.
**Acceptance:** 3200/1570 yields Basic 780 and Plus 780, matching the federal example. Cover inputs immediately below, at, and above 2770, plus post-birth income equal to or above the assessed baseline. Respect the statutory maximum and rounding instead of leaking 2770 * 0.65 beyond the ceiling.
**Verify:** focused benefit tests, then the shared commit gate.

## Fix 3 - sibling-bonus

**Depends on:** capped-assessable-net.
**Files:** modify `src/engine/benefits/siblingBonus.ts`, `siblingBonus.test.ts`, affected scenario/explanation tests, and directly related statutory text.
**Actions:** use the Plus minimum bonus of 37.50 and allow the total entitlement to reach 990. Preserve cents and ensure the reported addition equals the difference between final and base amounts. Recheck the age-boundary rule against the official final eligible life-month rule; do not preserve an off-by-one expectation merely because it exists in a test. Prevent a bonus from reviving an ineligible zero entitlement. Keep broader multi-child/disability extensions outside this patch unless needed for an already-supported input.
**Acceptance:** eligible base 150 yields total 187.50; base 900 yields total 990. Cover a non-minimum percentage case, the last eligible month, the next month, and ineligibility. Replace tests explicitly asserting the incorrect 75 minimum and 900 combined maximum.
**Verify:** sibling, benefit, and relevant scenario tests, then the shared commit gate.

## Fix 4 - father-allocation

**Depends on:** sibling-bonus.
**Files:** modify `src/engine/simulator/timelineGenerator.ts`, relevant pregnancy/entitlement types in `src/engine/types.ts` if necessary, `src/engine/simulator/actions.test.ts`, `src/engine/benefits/reallocation.test.ts`, and new focused allocation tests if warranted.
**Actions:** use `fatherPartnerMonthsCount` and the father's actual active hours; remove the unconditional four-month payment branch. Establish whether the stored count denotes Basic months or Plus payment months, and preserve or explicitly migrate that meaning. Keep ordinary partner months, partnership-bonus months, and reallocated months distinct; apply each recipient's entitlement and avoid double use of the family allowance budget. Amounts must ultimately use that parent's own assessment/income loss, not an unconditional 150 or the mother's benefit; wire this through the assessment work in wave 3.
**Acceptance:** 40 hours/week or zero requested partner months produces no ordinary father allowance. Cover 32 versus 33 hours, supported requested durations, dynamic hours changes, no duplicate allocations, and bonus eligibility. If a prerequisite history is unavailable, report that limitation explicitly rather than asserting a statutory amount.
**Verify:** focused allocation/action tests and scenario tests, then the shared commit gate.

## References and constraints

- [Federal benefit examples](https://familienportal.de/familienportal/familienleistungen/elterngeld/faq/wie-viel-elterngeld-kann-ich-bekommen--124616).
- [BEEG section 4a](https://www.gesetze-im-internet.de/beeg/__4a.html).
- [Federal sibling bonus explanation](https://familienportal.de/familienportal/familienleistungen/elterngeld/familiensituation/geschwisterbonus-wie-viel-elterngeld-bekomme-ich-wenn-ich-weitere-kinder-habe--124684).
- [Federal eligibility explanation](https://familienportal.de/familienportal/familienleistungen/elterngeld/faq/kann-ich-elterngeld-bekommen--155116).
- Stack: strict TypeScript, branded domain values, const-object enums, native Node tests. No UI redesign or speculative performance refactor in this wave.
