# Statutory configuration

Benefit defaults live in `src/data/benefitRules.json`. Each numeric parameter has a descriptive label and a direct link to the statutory provision defining it. The checked-in defaults were reviewed on 2026-10-29 against current BEEG rules; they are not a guarantee of future law.

`createBenefitRules(overrides)` in `src/engine/config/benefitRules.ts` validates monetary values, fractional rates, hours, whole-month limits, and relationships between thresholds. It returns deeply frozen, branded parameter values. Invalid or unknown overrides throw `TypeError`.

Callers may override named values through the factory. Each parameter retains its official reference URL and records `overridden: true` when its value differs from the referenced default. An override is a modeling assumption, not a statement that the official source prescribes that value. The factory has no shared mutable state. Calculation APIs are being migrated to accept this configuration during the sequential repair plan.

Monetary constructors preserve cents and use decimal exponent shifting to round half cents away from zero. This preserves statutory fractional amounts and avoids binary midpoint errors. The rounding source for benefit calculations is the [BEEG guidelines, section 2.0.3.3.1](https://www.bmbfsfj.bund.de/resource/blob/243236/6d06137220a52d1a18905493c3ab6199/richtlinien-zum-beeg-data.pdf). Numeric constants defining currency units or indexing are distinct from configurable statutory parameters.

Regression fixtures retain independently sourced expected values; they must not derive their expected results from the production configuration or calculation under test.

## Annual tax profiles

`src/data/taxRules.json` holds source-linked 2025 and 2026 tax and social-insurance defaults, including tariff coefficients. `createTaxRules(calendarYear, overrides)` validates and freezes them. An unavailable historical year is rejected; a future year carries the latest verified profile with distinct `calendarYear`, `sourceYear`, and `projected: true` metadata. Per-parameter overrides remain marked as assumptions. This is an explicit latest-known-law projection, not a claim that later laws are known.

The health supplement defaults are officially announced averages. The actual insurer supplement may differ and is configurable. Employee pension, unemployment, and general health shares are derived from the statutory total rates and equal employer/employee division. State/age/child eligibility must still be supplied to payroll.

The income-tax tariff, solidarity mitigation and standard employee social-insurance calculations accept the selected `TaxRules` profile. Gross-to-net results include that profile, including sources and projection flags. CLI/store base payroll derivation forwards its selected calendar year. This does not yet make legacy wage-withholding approximations or the annual refund model exact: their replacements are separate pending repairs. Current social contributions assume the supplied child count qualifies for contribution discounts; detailed age/state inputs follow in payroll integration.

## Verified payroll boundary

Payroll withholding runs locally through the pinned `lohnsteuerrechner` 1.0.7 implementation of the [BMF PAP](https://www.bmf-steuerrechner.de/interface/programmablauf.xhtml). Independent, source-linked responses for twenty-six 2026 cases are stored in `test/fixture/payroll2026.json`; six additional published annual examples cover the 2025/2026 comparison. Tax and solidarity amounts retain PAP cent rounding.

The accepted product policy is verified year profiles plus personal inputs, not arbitrary hypothetical tariffs. Personal input seams include insurer supplement, state/Saxony, age at year start, parental status, qualifying children, ELStAM child counter, church rate and IV factor. The PAP boundary rejects unsupported tariff overrides rather than claiming to apply them. Generic annual-tax profile overrides remain available for isolated mathematical tests; they do not redefine PAP withholding.

Regular and bonus tax deductions are separated; one-off social contributions use year-to-date assessment ceilings and supplied prior bonuses. Missing personal/YTD data is identified in the result assumptions. A regular payroll net is not BEEG standardized net: the old serialized `elterngeldSyntheticNet` field is a deprecated compatibility alias for serialized compatibility; actual benefit assessments use the independent BEEG model. Annual tax-return liability remains a separate pending repair.

The IV factor follows [EStG section 39f](https://www.gesetze-im-internet.de/estg/__39f.html), including truncation to three decimals and a possible zero factor. Its wage-tax bases come from PAP public outputs with a temporary taxable addition to avoid the public WVFRB zero clamp; that addition does not change gross or contribution inputs and is removed algebraically.

## Salary calculator integration

The calculator selects only published annual profiles. Personal insurer Zusatzbeitrag is the total insurer rate before employee/employer sharing. Age, care-insurance children under 25, ongoing parent status, ELStAM child factor, state/church status, and an approved class IV factor can be edited. Missing personal data is reported as an assumption. Old arbitrary tariff overrides are ignored; the retired defaultTaxConfig.json is removed.

Monthly input is regular monthly earnings; yearly input is the actual year total, including extras. Working months describe whole active months starting in January. Contractual annual salary equivalents are prorated to active months, with bonus paid in the last active month unless an explicit engine schedule is supplied. These bonus conventions are employment-contract assumptions, not statutory law. Annual tax assessment is separate from payroll withholding. Saved input fields remain compatible; precomputed results are recalculated.

Simulator scenarios persist validated husbandPayrollOptions and wifePayrollOptions. The same personal controls appear under preexisting conditions; CLI scenario files preserve them. Existing scenarios without these fields use the documented missing-input assumptions. Known ages advance each calendar year; newly born children increase care-discount counts. Ages of older children are not supplied, so their qualifying count is assumed unchanged until edited. Ordinary working hours and annual bonus schedules are modeled as contract assumptions. Day-level contribution periods and the prior-year March bonus allocation rule are not yet implemented.

CLI salary amounts describe ordinary pay. Use an explicit monthly/yearly period; annual ordinary pay is divided by twelve and separately configured bonuses are additional. Amount size never changes its unit, and zero is a valid input. The general calculator yearly field instead describes the actual total including its contractual extra payments.

## BEEG assessment deductions

The standardized-net helper uses BEEG sections 2c-2f and remains separate from payroll take-home. The supported insurance model is taxable ordinary employment with mandatory public health, pension and unemployment coverage. Deduction characteristics are selected independently from earned-income months; ties use the latest evidence. BEEG social flat rates ignore ordinary contribution ceilings and use their own transition-zone factor; church deduction uses the BEEG rate. Marginal employment tax treatment, private/voluntary insurance, self-employment and special employment regimes require separate inputs/calculation paths.

PAP publication provenance is recorded separately from retrospective payroll effective dates. The January snapshot of the year before birth must be verified before automatic BEEG tax deductions are used. The pinned 2025 provider is the January 22 revision; the earlier required snapshot has not been verified and must not silently be replaced. A missing snapshot yields unavailable standardized net, not statutory ineligibility. The 2026 January PAP is available; future required years retain projection metadata.

## Calendar and claim conventions

`src/data/timelineConventions.json` preserves the legacy one-before/two-from-birth maternity approximation, twelve ordinary mother Plus months, and four partnership-bonus months. These are editable planning conventions, not assertions that the statute prescribes those calendar durations or that every planned payment is eligible. Each entry explains its basis and links the relevant statutory context. The actual three-calendar-month maternity-pay reference is separately sourced to MuSchG section 20. Day/life-month conversion remains outside this calendar-month model.

## Integrated assessment history

The public simulator now consumes the calendar income schedule and birth-cohort allowance projector. Each parent has a frozen twelve-eligible-month history; excluded older-child receipt and maternity months extend lookback. Missing prehistory repeats the initial salary, class and deduction settings at the user's explicit request, with assumed month IDs in the audit. Positive earning months across ordinary Plus and partnership claims share the same post-birth average. Internal forecasting finishes the claim period beyond the visible ledger, retaining the public 120-month limit.

`benefitAssessments`, `benefitsComplete`, `unavailableReasons`, and `assumptions` disclose the supported calculation. Monthly payment audits retain cohort entitlements, overlap credits and actual payments. Unknown PAP snapshots or sibling ages produce unavailable benefits, not guessed exact payments. Totals then omit those streams and the scorecard identifies the result as partial. Availability means calculable under the stated assumptions, not comprehensive statutory eligibility certification; prior-year household income eligibility remains pending annual accounting.

Manual payroll take-home is never automatically treated as BEEG net. The optional persisted `assumeManualNetIsAssessmentNet` boolean defaults false; an explicit opt-in permits labeled, unverified estimates. Old scenarios remain readable. Their benefit estimates may now be unavailable until this decision or adequate gross inputs are supplied. Per-parent audits replace scenario-label formulas in the explainer. Ordinary father requests share the real individual/family budget; the projector checks minimum claim duration together with partnership claims. It reallocates only unfilled requests and retains protected minimums where overlap credits apply.

The legacy refund path no longer adds a fixed 850 deduction refund or invents an opening-year refund with no prior-year records. A deduction is not a cash payment; actual reconciliation must compare assessed tax with credited payments under [EStG section 36](https://www.gesetze-im-internet.de/estg/__36.html). Remaining legacy withholding-variance and child-relief estimates still require replacement by annual accounting.

General health and insurer supplementary contributions are rounded separately before addition, including one-off assessment bases, under [BVV section 2](https://www.gesetze-im-internet.de/beitrvv/BJNR113800006.html). Standard care adjustments use the permitted combined-rate method. The [GKV guidance section 3.3](https://www.gkv-spitzenverband.de/media/dokumente/pflegeversicherung/grundprinzipien/2025-03-31_GH_Beitragssatzdifferenzierung_sPV.pdf) permits combined or two-step standard-care rounding; transition-zone care requires separate treatment of its different bases.

## Payroll transition zone

Ordinary single-job Midijob deductions use the [SGB IV section 20](https://www.gesetze-im-internet.de/sgb_4/__20.html) employee contribution base, independently of the BEEG flat-rate base. F derives from the source-linked payroll numerator and published average total contribution rates; a personal insurer supplement changes employee health contributions, not F. Independent effective-year employment thresholds remain separate from PAP availability. For 2027 the known marginal threshold is used while unavailable contribution rates remain labeled projections.

Predictable contract extras enter the regular expected monthly earnings test in both employment-period and simulator adapters. Care childless surcharge uses the total transition base; child discounts use the employee base, following BVV and GKV section 3.3. The supported path assumes an ordinary single job, without trainee/student/short-time exceptions. Marginal employment requires pension/tax-regime inputs; one-off contributions in the transition zone also remain unsupported. Such amounts carry `payrollLimitations` and explicit provisional-estimate assumptions. Simulator `payrollComplete` and UI/CLI notices preserve this distinction. Annual accounting must not infer exact liabilities from those unsupported contributions.
