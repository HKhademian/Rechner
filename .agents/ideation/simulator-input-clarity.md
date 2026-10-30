---
name: Simulator input and explanation clarity
status: complete
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

## Added user request: taxable-income section

The user requested a visible section for each partner's taxable income and their sum. The user selected the annual income-tax breakdown. Expose the existing annual calculation's per-partner employment-income contributions without changing its joint deductions or tax result.

- Add recorded annual gross, work-expense deduction and resulting employment-income contribution for each partner to the annual tax-base audit output, preserving the existing household calculation.
- Add a distinct annual section showing husband, wife and combined contributions, then the shared deductions and resulting joint taxable income. Do not invent an allocation of pooled deductions or label a gross salary as final taxable income. Use the actual annual record and matched rule-profile sources.
- Keep unavailable full-year evidence unavailable, and distinguish projected rule years and incomplete annual settlements from known income. Support year selection from available annual records. Mount the section near the scenario summary and inputs in its own small integration commit.
- Resume remaining wife-payroll and monthly-audit explanation scopes after the requested section is complete.

## Added user request: German Net Pay Calculator

The same taxable-income calculation must also be visible on the German Net Pay Calculator. Keep the two pages' input stores independent.

- Add an individual employment-tax-base entry point using the existing sourced deductions with one person's limits. Preserve the existing joint function and all joint results.
- Derive calculator annual taxable-income evidence from its own normalized regular/bonus payroll and active months. Carry unsupported-payroll limitations and the annual model's unsupported church-tax deduction as unavailable evidence.
- Extract the simulator's income/deduction presentation into a shared display without changing its annual-record behavior. Let the calculator use primary/partner labels and individual versus joint wording.
- Mount a full-width calculator section with the verified year, partner contributions/sum where enabled, deductions, resulting taxable income, scope and official sources. The selected yearly amount is based on the user's payment schedule, not a blind multiplication of a monthly value.
- Check individual limits, partner on/off, partial-year schedules, bonuses, unsupported evidence and matching simulator results for equivalent full-year inputs. Commit each prerequisite and integration separately.

## Completed implementation

- `9f93515`: consistent planner navigation and active-page semantics.
- `407499a`: plain-language plan-input heading, native expanded-state toggle and focus styles.
- `75959bd`: preset actions may wrap without changing their behavior.
- `7209a58`: official source links on financial explanation factors.
- `2bb0b37`, `16401af`: husband's and wife's explanations use stored monthly gross, actual tax class, contributions, withholding and earned salary, with linked rule sources. Missing manual-net payroll evidence and provisional limitations remain explicit; no fixed hours ratio or guaranteed annual refund is invented.
- `f75c3d7`: salary stream notes use recorded classes and no fixed part-time claim.
- `2d653eb`: annual tax-base audit retains each partner's gross, work expenses and employment-income contribution without changing joint results.
- `76ee831`, `da1de4f`: annual simulator income section, year selection, partner contributions, sum, shared deductions, joint taxable income before child allowances, unavailable evidence and linked sources. The section is below the scenario summary.
- `659973f`: individual annual tax-base path with one person's sourced deduction limits; existing joint results remain unchanged.
- `54575fe`: shared income-breakdown presentation for both pages, with individual/joint labels and common source links.
- `ae5b092`, `f057de5`: salary-calculator annual taxable income comes from its own normalized actual payment schedules and contributions. Active months, extra salary payments, verified year and partner inputs are preserved. Provisional payroll and unsupported annual church-tax/single-parent deductions remain unavailable.
- `e40f8ea`, `d330e46`: visible full-width taxable-income section on the German Net Pay Calculator before its input/results columns. Primary and partner labels match that calculator, with single-person or joint wording and links to the selected rule profile and editable payroll rules.

## Verification

- Ran `npm run fix` before staging each commit. Each code scope passed `npm run check` and `npm run check:build`. The final code audit reported zero errors and warnings, and all unit/scenario tests passed.
- Permanent regression tests cover recorded salary data across gross amounts/classes, absent manual payroll, provisional limitations, zero salary without inferred maternity, monthly stream class notes, partner-income conservation, individual versus joint deduction limits, active months, bonuses, unsupported deductions and monthly/yearly calculator-input parity.
- Direct Preact server rendering of the real components passed for both pages. Checked partner contributions and their sum, joint deductions, source links, partial/missing annual evidence, known income with an incomplete settlement, projected profiles, individual/partner calculator displays, unsupported annual deductions and each page's section placement.
- Equivalent complete-year calculator and simulator payroll inputs produced identical employment-income contributions and joint taxable income. Changing the calculator's selected verified year changed its section's year and profile source in headless rendering.
- Temporary headless-render checks: `/tmp/calculator-input-render-check.mjs`; results: `/tmp/calculator-input-render-results.log`. These supplement the permanent regression tests and do not validate browser layout, focus behavior, or interactive year selection.
- Local browser access remains disabled in Work settings. Final desktop/mobile visual inspection, interactive disclosure checks and a new screenshot could not be performed. No other browser automation mechanism was used.
- Preview anchors: calculator `http://127.0.0.1:4321/#annual-taxable-income`; simulator `http://127.0.0.1:4321/elterngeld#annual-taxable-income`.
- Each page uses its own input data; no invented split of jointly pooled deductions was added. The displayed final amount is explicitly before child allowances. Calculator scope excludes other income/additional personal deductions and does not promise a refund calculation.
- Saved input semantics, source-linked financial configuration and action/event/base-row ordering were preserved. The unrelated untracked `test-random/` directory was untouched.
