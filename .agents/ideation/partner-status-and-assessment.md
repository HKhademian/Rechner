---
name: Separate partner presence, payroll inclusion and tax assessment
status: proposed
created: 2026-10-31
---

# Separate partner presence, payroll inclusion and tax assessment

The user asked whether a partner makes sense with class I/II and no partner with III/IV. This exposes a distinction that the completed tax-class shortcut alone does not model.

## Verified distinctions

- Class I is compatible with an unmarried partner, including two partners each using I. It does not establish eligibility for joint annual assessment.
- Class II requires single-parent relief. A cohabiting relationship forming a shared household generally conflicts with that relief. Having a relationship while living separately is a different fact from sharing a household.
- Class III includes special cases such as qualifying widowhood, so a living partner cannot always be inferred.
- Class IV ordinarily describes eligible spouses who are not permanently separated; the other spouse can have no wages. A spouse with zero income must be distinguishable from no spouse and from calculating only one person's payroll.
- Annual assessment eligibility and the choice between individual and joint assessment are separate from payroll class selection.

Official sources verified on 2026-10-31:

- https://www.gesetze-im-internet.de/estg/__38b.html
- https://www.gesetze-im-internet.de/estg/__26.html
- https://www.finanzamt-wuerzburg.de/steuerinfos/haeufig-gestellte-fragen/lohnsteuerabzug-und-lohnsteuerermaessigung (class II and cohabiting relationships)

## Current code finding

`calculatorStore.calculateScenarioData` uses `hasPartner` to include the second payroll. `computePayrollTaxBase` then chooses individual or joint employment-income deductions solely from the number of payroll records. `CalculatorTaxableIncome` discloses the eligible-spouse assumption, but does not request or validate it. Therefore enabling an unmarried second person currently selects the joint-deduction model as well. This is a modeling limitation, independent of whether the III/IV/V input-opening shortcut works correctly.

## Proposed correction, not implemented

Separate declared relationship/household status, including a second person's payroll, and annual assessment type/eligibility. Support a spouse with zero wages and a one-person payroll view independently. Unmarried two-person totals should use separate individual annual bases and a clearly labeled sum, rather than shared joint deductions. Check class II against declared shared-household facts, and retain explicit handling for widowhood and other supported exceptions.

Keep the class shortcut an input convenience. It must not be treated as proof of relationship status, second income or joint-assessment eligibility. Do not silently migrate saved cases into inferred legal facts. Any implementation needs its own small ordered scopes, source-backed eligibility rules and meaningful regressions.
