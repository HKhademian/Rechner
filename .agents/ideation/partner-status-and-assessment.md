---
name: Separate partner presence, payroll inclusion and tax assessment
status: complete
created: 2026-10-31
completed: 2026-11-14
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

## Implemented resolution

- **Tax Engine (`src/engine/tax/taxAssessment.ts`)**: Added `HouseholdRelationship` (`Unspecified`, `Single`, `UnmarriedPartners`, `MarriedOrCivilPartners`, `QualifyingWidowed`), `StatutoryAssessmentWarning`, and `validateTaxClassAndAssessmentRules` checking `§§ 24b, 26, 26b, 32a Abs. 6, and 38b EStG`.
- **Net Pay Store & Serialization (`src/store/calculatorStore.ts`, `src/engine/storage/calculatorScenario.ts`)**: Added optional persisted `relationshipStatus` (preserving legacy saves as `Unspecified`), separated 2nd-person payroll toggle (`hasPartner`) from marital eligibility and annual assessment mode, modeled a non-employed (€0-wage) spouse explicitly when married couples select Joint Assessment with one payroll column, enforced individual assessment (`§ 25 EStG`) for `Single` / `UnmarriedPartners` / `QualifyingWidowed`, and preserved the `III/IV/V` partner-column shortcut strictly as an input convenience.
- **Net Pay UI (`ComparisonTable.tsx`, `CalculatorTaxableIncome.tsx`, `CalculatorResultSummaries.tsx`)**: Added the `Relationship` selector, labeled `Partner 2 payroll`, surfaced statutory warnings with interactive `<LawRefLink>` badges, and clearly labeled `"Partner (non-employed spouse)"` when modeling €0-wage joint splitting.
- **Unified Life Profile & Sync (`src/engine/lifeProfile/*`, `LifeProfilePanel.tsx`, `CalculatorPeriodControl.tsx`)**: Added `isMarriedJointAssessment` (`true` for Class IV/IV splitting, `false` for Class I/I separate individual returns) and synced Net Pay `relationshipStatus`, tax classes, and assessment mode accordingly.
