# Top 10 Germany Life Handy Toolbox — Product & Engineering Blueprint

> **Status**: Ideation & Rollout Specification (Wave 1 implemented; Waves 2–3 specified)  
> **Architectural Contract**: Every calculator operates 100% client-side with zero telemetry, isolates persisted user state under `browserAppStorage(AppId.<Tool>)` (`rechner:<slug>:v1:*`), shares the pure statutory engine (`#engine/*`), wraps its root island in `<AppShell>` inside `BaseDocument.astro`, composes UI from `src/components/ui/`, links citations exclusively via `<LawRefLink>`, and stays tagged as `Demo` (`CalculatorReleaseStatus.Draft`) on the catalog until graduation.

---

## Release & Catalog Visibility Model

- **Home Catalog (`/`)**: All tools exist in `allCalculatorApps` (`src/apps/registry.ts`). Tools with `CalculatorReleaseStatus.Draft` display a warning `Demo` badge (`badge-warning`), are **hidden by default** (`showDemos = false`), and appear on `/` when the user toggles **Show demo tools** (persisted under `rechner:catalog:v1:showDemos` and synced via `?demos=1`).
- **Header `Tools` Switcher**: Always lists all registered tools in `allCalculatorApps`, displaying the `Demo` badge beside non-published tools (both inside the dropdown and on the active button trigger when browsing a demo tool).

---

## Wave 1 — Highest Shared-Engine Reuse (Implemented First)

### 1. Kita / Childcare Fee & Tax Offset Estimator (`kita`)
- **Category**: `CalculatorCategory.Family`
- **Governing Statutes**:
  - `§ 10 Abs. 1 Nr. 5 EStG` (2024: 2/3 deductible up to €4,000/child; 2025+: 80% deductible up to €4,800/child under JStG 2024, children under 14; meal costs / *Verpflegungsgeld* excluded)
  - `§ 32a EStG` & `§ 26b EStG` (income tax tariff, *Ehegatten-Splitting*, SolZ & church tax delta)
- **Shared Engine Reuse**:
  - `src/engine/benefits/childcare.ts` (`getAllMunicipalDaycarePresets`, `computeMonthlyChildcarePlanCosts`, `resolveChildcareTaxRulesForYear`, `computeAnnualChildcareTaxDeduction`)
  - `src/engine/tax/wageTax.ts` & `src/engine/tax/jointAssessment.ts` (`computeAnnualIncomeTax`, `computeJointTaxLiability`, `computeSolidaritySurcharge`)
  - `src/engine/formulas/pure/annualTaxDeltaHelper.ts`
- **Core Inputs**: Planning year, municipal fee table preset or custom monthly fee per child, non-deductible monthly meal fee (*Verpflegungsgeld*), child count (1–3) & ages in months, funded care months/year, household annual gross, household taxable income (*ZvE*), joint assessment & church tax flags.
- **Core Outputs**: Monthly gross Kita cash outflow (care + meals), annual eligible care cost vs. § 10 EStG *Sonderausgaben* cap, annual income/SolZ/church tax refund, effective net monthly household cost, and per-child sibling breakdown.
- **Unified Life Profile Sync**: `planningYear`, `dependentChildrenCount`, `primaryAnnualGrossEur` + `partnerAnnualGrossEur`, `isMarriedJointAssessment`, and `householdTax.estimatedTaxableIncomeZvEEur`.

### 2. Minijob & Midijob Transition Calculator (`minijob-midijob`)
- **Category**: `CalculatorCategory.Money`
- **Governing Statutes**:
  - `§ 8 SGB IV` (marginal employment monthly cap: 2024 €538, 2025 €556, 2026 €603, 2027 €633)
  - `§ 20 Abs. 2 SGB IV` (*Übergangsbereich* / Midijob sliding scale up to €2,000/mo with reduced employee base and full statutory pension entitlement)
  - `§ 38b`, `§ 40a EStG`, `§ 158 SGB VI`, `§ 55 SGB XI`
- **Shared Engine Reuse**:
  - `src/engine/tax/employmentThresholds.ts` (`getEmploymentThresholds`)
  - `src/engine/tax/transitionContributions.ts` (`computeTransitionContributionBases`)
  - `src/engine/tax/wageTax.ts` (`computeGrossToNetBreakdown`)
- **Core Inputs**: Planning year, monthly gross pay, tax class (`I`–`VI`), federal state (Saxony nursing care rule), dependent children count, church tax toggle, Minijob tax mode (2% employer flat tax vs. personal tax class), Minijob employee pension top-up opt-out toggle.
- **Core Outputs**: Active employment band classification (`Minijob`, `Midijob`, or `Regular`), monthly net take-home, itemized employee deductions (health, care, pension, unemployment, wage tax, church tax, SolZ), pension entitlement base vs. actual contribution base, marginal retention check, and 4-milestone corridor comparison table.
- **Unified Life Profile Sync**: `planningYear`, `federalState`, `dependentChildrenCount`, partner status & monthly gross reference.

### 3. Commuter Deduction & JobTicket Comparator (`commuter-allowance`)
- **Category**: `CalculatorCategory.Money`
- **Governing Statutes**:
  - `§ 9 Abs. 1 Nr. 4 EStG` (*Entfernungspauschale*: 2024–2025 €0.30/km first 20 km + €0.38/km from km 21; 2026+ uniform €0.38/km from km 1; €4,500 non-car ceiling; § 9 Abs. 2 Satz 2 actual transit ticket alternative)
  - `§ 4 Abs. 5 Nr. 6b` / `§ 9 Abs. 1 Nr. 4` *Homeoffice-Pauschale* (€6/day, max 210 days = €1,260/yr)
  - `§ 9a Nr. 1a EStG` (€1,230 *Arbeitnehmer-Pauschbetrag* baseline absorption)
  - `§ 3 Nr. 15 EStG` (tax-free employer JobTicket subsidy & dollar-for-dollar *Entfernungspauschale* reduction)
- **Shared Engine Reuse**:
  - `src/data/commuterRules.json` + `src/engine/tax/taxRules.ts` (`workExpenseAllowance`)
  - `src/engine/formulas/pure/annualTaxDeltaHelper.ts` + § 32a / § 26b EStG tariff
- **Core Inputs**: Planning year, one-way commute distance (km), annual office days, transport mode (`MotorVehicle` vs `PublicTransitOrBike`), annual home-office days, other annual work expenses (*Werbungskosten*), monthly transit ticket price (*Deutschlandticket* reference: €49 / €58 / €63), monthly tax-free employer JobTicket subsidy, taxable income (*ZvE*), joint assessment & church tax toggles.
- **Core Outputs**: Self-paid commute + Homeoffice total *Werbungskosten*, excess above €1,230 *Pauschbetrag*, annual tax savings in Self-Paid vs. Employer § 3 Nr. 15 JobTicket scenario, § 3 Nr. 15 *Entfernungspauschale* offset amount, and net annual EUR advantage.
- **Unified Life Profile Sync**: `planningYear`, `commuteOneWayKm`, monthly office days × 12, `isMarriedJointAssessment`, and `householdTax.estimatedTaxableIncomeZvEEur`.

---

## Wave 2 — Payroll & Social Security Engine Extensions

### 4. German Sick Pay & Transition Estimator (`sick-pay`)
- **Category**: `CalculatorCategory.Money`
- **Governing Statutes**: `§ 3 EFZG` (6-week / 42-day employer *Entgeltfortzahlung*), `§ 47 SGB V` (*Krankengeld*: 70% gross / max 90% net capped at GKV daily BBG), `§ 32b EStG` (*Progressionsvorbehalt*).
- **Shared Engine Reuse**: `computeGrossToNetBreakdown`, `computeEmploymentPayroll`, `computeProgressionTax` (`src/engine/tax/progressionTax.ts`), GKV *Beitragsbemessungsgrenze* in `TaxRules`.
- **Core Inputs / Outputs**: Monthly gross, one-off annual bonus (lifts daily SGB V net/gross cap over 12 months), tax class, GKV Zusatzbeitrag rate, sick spell duration in days -> Week 1–6 employer pay, daily gross/net *Krankengeld* minus RV/AV/PV employee shares, and annual *Progressionsvorbehalt* tax impact.

### 5. Unemployment Benefit Estimator (`unemployment-benefit`)
- **Category**: `CalculatorCategory.Money`
- **Governing Statutes**: `§§ 149–159 SGB III` (*Arbeitslosengeld I*: 60% standard / 67% with child of *Leistungsentgelt*, capped at GRV BBG; 12-week *Sperrzeit*), `§ 32b EStG`.
- **Shared Engine Reuse**: Shared wage-tax / PAP withholding engine for statutory *Leistungsentgelt* determination + `GRV` contribution ceiling from `TaxRules`.
- **Core Inputs / Outputs**: Last 12 months gross, tax class, at least 1 child flag (60% vs. 67%), age / insurance months entitlement duration, voluntary quit *Sperrzeit* weeks -> daily & monthly net ALG I, benefit duration, and annual progression tax delta.

### 6. Public vs. Private Health Insurance Check (`health-insurance-check`)
- **Category**: `CalculatorCategory.Money`
- **Governing Statutes**: `§ 6 Abs. 1 Nr. 1 SGB V` (*Jahresarbeitsentgeltgrenze* / JAEG), `§ 257 SGB V` (employer tax-free PKV contribution cap), `§ 10 SGB V` (*Familienversicherung* co-insurance loss), `§ 10 Abs. 1 Nr. 3 EStG` (PKV *Basistarif* share tax deductibility).
- **Shared Engine Reuse**: `computeGrossToNetBreakdown`, GKV BBG, employee/employer rates, and annual tax deductibility model in `src/engine/tax/annualEmploymentIncome.ts`.
- **Core Inputs / Outputs**: Regular annual gross incl. contractual extras, age, partner employment status, number of non-working children, quoted PKV total premium & *Basistarif* deductible share -> JAEG eligibility status, GKV max employee net cost vs. PKV post-subsidy & post-tax net cost, plus multi-person *Familienversicherung* break-even comparison.

### 7. Notice Period & Severance Tax Optimizer (`severance-notice`)
- **Category**: `CalculatorCategory.Money`
- **Governing Statutes**: `§ 622 BGB` (tenure-tiered employer vs. 4-week employee notice periods to 15th/month-end), `§ 34 Abs. 1 EStG` (*Fünftelregelung* — 5× tariff delta on 1/5 of extraordinary termination indemnity), `§ 14 SGB IV` (social-security exemption for genuine *Entlassungsentschädigung*).
- **Shared Engine Reuse**: Exact `computeAnnualIncomeTax`, `computeJointTaxLiability`, and `computeSolidaritySurcharge` via `annualTaxDeltaHelper.ts`.
- **Core Inputs / Outputs**: Start date / completed service years, planned termination date, severance payout (*Abfindung*), regular annual taxable income in payout year vs. next year -> exact § 622 BGB deadline date, ordinary tax vs. § 34 EStG *Fünftelregelung* tax savings, and payout-year vs. January-deferral net comparison.

---

## Wave 3 — Everyday Statutory & Calendar Tools

### 8. Rental Deposit & Notice Deadline Calculator (`rental-notice`)
- **Category**: `CalculatorCategory.Everyday`
- **Governing Statutes**: `§ 551 BGB` (max 3× *Nettokaltmiete* deposit, 3 equal monthly installments on move-in), `§ 573c BGB` (tenant 3-month ordinary notice by 3rd *Werktag*; staggered 3/6/9-month landlord notice by tenure), `§ 558 Abs. 3 BGB` (20% / 15% *Kappungsgrenze* over 3 years).
- **Core Inputs / Outputs**: Monthly *Nettokaltmiete*, move-in & handover date, landlord vs. tenant termination side, Bundesland (for Saturday/holiday *Werktag* calendar lookup in notice deadline), current & 3-years-ago rent -> max § 551 BGB deposit + 3-installment schedule, exact *3. Werktag* postmark deadline date, and rent-increase cap check.

### 9. Working-Day, Vacation & Public Holiday Optimizer (`holiday-bridge-optimizer`)
- **Category**: `CalculatorCategory.Everyday`
- **Governing Statutes**: `§ 3 BUrlG` (minimum leave), federal-state *Feiertagsgesetze* across all 16 *Bundesländer* (Easter/Movable Computus holidays + regional holidays such as *Augsburger Friedensfest* option / *Buß- und Bettag* / *Fronleichnam*).
- **Shared Engine Reuse**: Pure holiday calendar generator pairable later with `timelineConventions.ts` and school-holiday planning.
- **Core Inputs / Outputs**: Calendar year, *Bundesland*, available annual vacation days -> state public holiday calendar (filtering weekend vs. weekday holidays), top ranked *Brückentage* stretch windows maximizing consecutive days off per vacation day spent.

### 10. Rundfunkbeitrag Household Split & Exemption Checker (`rundfunkbeitrag`)
- **Category**: `CalculatorCategory.Everyday`
- **Governing Statutes**: `§ 2, § 4, § 4a RBStV` (per-dwelling €18.36/mo flat contribution regardless of headcount; exemptions for BAföG/Bürgergeld/SGB XII recipients, €6.12 disability reduction, secondary-residence *Nebenwohnung* exemption for same contributor).
- **Core Inputs / Outputs**: Household size (flatshare / roommates), exempt status / qualifying social benefit checkboxes, primary vs. *Nebenwohnung* toggle -> statutory contribution status (€0 / €6.12 / €18.36), exact per-roommate monthly/quarterly share (`€55.08 / quarter ÷ N`), and GiroCode SEPA payment link handoff.
