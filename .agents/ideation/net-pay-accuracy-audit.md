# Net-pay accuracy review

Reviewed 2026-11-01 at `3d24adb43d9bf1e6f18b52c20a03493ba78745ea`. Scope: German Net Pay Calculator, its store adapter, ordinary statutory employee payroll, and its annual taxable-income result. Review only; no calculation changes made.

## Verdict

The tested payroll withholding agrees with the official BMF algorithm. The annual taxable-income display is a bounded employment-income estimate and is incomplete for some inputs the UI accepts. It should not currently be treated as a generally accurate assessment or a KfW eligibility result.

## Verified

- Fresh requests to the exact official BMF API URLs in `test/fixture/payroll2026.json` matched all 26 stored cases and all 312 output values. Cases cover classes I–VI, IV factor, Saxony, children, solidarity, caps, annual withholding and bonuses. The offline provider also matched every fixture. These are withholding checks, not independent certification of total net pay or annual assessment.
- Standard 2026 public-insurance payroll at EUR 5,000 monthly, class I, childless adult, no church tax, published average insurer rate: wage tax EUR 782.41; health EUR 437.50; pension EUR 465; unemployment EUR 65; care EUR 120; net EUR 3,130.09. Contributions reconcile with the source-linked rates; withholding was independently checked against the BMF endpoint.
- Published 2026 caps/rates agree with the ordinary employee profile: health/care cap EUR 5,812.50, pension cap EUR 8,450, and total average health supplement 2.9%. Insurer-specific rates remain editable.
- `npm run check` and `npm run check:build` passed. Existing tests exercise cent rounding, partial years, extra salary schedules, transition contributions, partner basis preservation and source-year selection. Passing tests do not establish completeness outside their cases.

Official sources: [BMF 2026 PAP](https://www.bundesfinanzministerium.de/Content/DE/Downloads/Steuern/Steuerarten/Lohnsteuer/Programmablaufplan/2025-11-12-PAP-2026.html), [GKV 2026 contribution parameters](https://www.gkv-spitzenverband.de/media/dokumente/presse/zahlen_und_grafiken/20260101_Faktenblatt_Rechengroessen_Beitragsrecht.pdf), [BMAS 2026 contribution ceilings](https://www.bmas.bund.de/DE/Service/Gesetze-und-Gesetzesvorhaben/sozialversicherungs-rechengroessenverordnung-2026.html).

## Findings, in proposed fix order

### 1. High: child allowances are omitted from the value labeled annual taxable income

`src/engine/tax/annualEmploymentIncome.ts:20` explicitly computes income before child allowances. `src/engine/tax/payrollTaxBase.ts:33` discards child eligibility/allocation information; the calculator exposes that intermediate base as annual taxable income without a limitation reason. The simulator's separate child-allowance calculation does not run on this path.

Reproduction: two earners with monthly gross EUR 12,000 and EUR 8,000, both class IV, twelve working months/payments, no church tax. Hold their care-insurance parental status and under-25 discount inputs fixed to isolate the tax effect. With zero or one child the calculator returns the same EUR 204,881.01 base and an empty limitation list. For a joint full-year eligible child at this income, the 2026 allowance totals EUR 9,756 and is favorable against full-year Kindergeld. The displayed intermediate base omits that reduction. Eligibility months, allocation and favorability must be represented before claiming final taxable income; until then affected results need an explicit limitation.

Sources: [EStG section 2(5)](https://www.gesetze-im-internet.de/estg/__2.html), [section 31](https://www.gesetze-im-internet.de/estg/__31.html), [section 32(6)](https://www.gesetze-im-internet.de/estg/__32.html). Do not infer an exact KfW adjustment from this example: KfW uses its own documented assessment-year and household evidence rules.

### 2. High: annual age relief is omitted without a limitation

`src/engine/tax/payroll.ts:129` applies age relief to withholding, but `src/engine/tax/annualEmploymentIncome.ts:50` never deducts it from annual income. `payrollTaxBase.ts` only guards certain other unsupported reliefs, including church tax and single-parent relief.

Reproduction: EUR 5,000 monthly, class I, no children/church tax, twelve working months/payments. Age 40 gives annual net EUR 37,561.08; age 64 gives EUR 37,767.00. Both nevertheless report taxable income EUR 46,674 with no limitation. The engine selects the 2026 relief cohort for age 64; the EUR 608 annual relief would lower this bounded base to EUR 46,066. Cohort/birthday information needs a clear contract, with the relief applied or the annual result marked unavailable.

Sources: [EStG section 2(3)](https://www.gesetze-im-internet.de/estg/__2.html), [section 24a](https://www.gesetze-im-internet.de/estg/__24a.html). The section 24a cohort amount was checked against the official indexed legal text; fetching that page through the web reader repeatedly timed out.

### 3. Medium: including a partner also selects joint assessment

`src/store/calculatorStore.ts:587` sends two payrolls whenever the partner is enabled. `src/engine/tax/payrollTaxBase.ts:40` interprets two payrolls as joint assessment. There is no separate eligibility/election input. The detailed scope text does state an eligible-spouse assumption, but the generic Partner 2 control also accepts unmarried partners or spouses choosing individual assessment.

Reproduction: EUR 5,000 monthly for person 1 and zero for partner 2, both class I. Enabling the partner leaves net pay unchanged but reduces the displayed taxable base from EUR 46,674 to EUR 46,638 by pooling the additional special-expense allowance. That is inappropriate for two individually assessed people. Partner presence and assessment choice need separate models; household totals for separate assessments should sum their individually computed bases.

Source: [EStG section 26](https://www.gesetze-im-internet.de/estg/__26.html).

## Supported-scope limits

The payroll adapter hardcodes ordinary statutory health, pension and unemployment insurance markers. Private insurance, contribution exemptions/retirement status, and multiple concurrent jobs are not fully modeled. Marginal employment and transition-zone bonuses already carry explicit provisional-result limitations; class II and church tax suppress the unsupported annual base. Other income, actual work expenses, additional personal deductions and a general annual tax-return settlement are outside the current net-pay model. These limits are distinct from the unflagged omissions above.

KfW 300 requires the relevant prior tax assessments; the current one-year salary estimate cannot replace those documents. [Official KfW product guidance](https://www.kfw.de/inlandsfoerderung/Privatpersonen/Neubau/F%C3%B6rderprodukte/Wohneigentum-f%C3%BCr-Familien-(300)/).

## Reproduce locally

Run `ASTRO_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 node .agents/ideation/net-pay-accuracy-audit.ts`. It checks the pinned BMF fixture outputs and prints the three finding probes without changing live/saved state. Its finding outputs are observations of the reviewed revision, not assertions that the incomplete behavior is correct.

The fresh external verification used four concurrent read-only requests to the existing fixture URLs, parsed every returned output and rejected non-ok input markers. No user financial data was transmitted. The runtime engine remains offline. A class-IV child-factor suspicion was discarded after checking the official ELStAM documentation: its 1.0 marker is correct for a common child because PAP halves the allowance internally for class IV. [ELStAM guide, pages 80–81](https://www.elster.de/elsterweb/attachments/help_arbeitgeber_eop/Informationen_fuer_Arbeitgeber_und_Arbeitnehmer.pdf).

## Mitigations implemented after review

- `ef68e7f`: child-allowance cases now withhold the unsupported annual base and return the section 32 source. Payroll net remains available. This is a completeness guard, not a new child-allowance calculation.
- `e9af337`: age-relief cases now carry an annual-assessment limitation through employment payroll, without incorrectly marking valid monthly PAP withholding provisional. The incomplete annual figure is withheld.
- `36c7da2`: explicit typed assessment choice, independent deduction limits/zero floors, persistence and schema-3 transfers. Two-person cases without a choice are unavailable rather than silently joint. Legacy versions 1 and 2 import with an unspecified choice.
- `7a544ea`: explicit positive ELStAM child-allowance overrides also trigger the annual completeness guard, even with a zero child count. Child-allowance limitation sources now follow the selected profile metadata.
- `eaaa878`: compact per-column assessment selector, matching result labels, and separate individual detail panels. A standalone person uses individual assessment; partner toggles preserve the stored choice.

Full checks/build passed for each implementation scope. Additional headless checks verified required selection, individual/joint amounts, saved-draft isolation and unavailable relief results. Isolated-origin browser verification covered selection, separate per-person details, child-allowance suppression and restoration to standalone mode. The reproduction script now also prints the three explicit assessment modes; the original finding descriptions above remain a snapshot of the reviewed revision. All 26 pinned BMF withholding fixtures still match after these changes.

## Annual age-relief correction

Implemented after the safeguards, on 2026-11-01:

- `9991f8d`: extracted and verified all 54 cohorts (2005–2058) from the current official section 24a table into source-linked configuration. The parser validates rates, caps, consecutive years and the terminal zero allowance. The cohort helper uses the existing age-on-1-January/PAP convention; older cohorts retain the first table limit.
- `0409731`: net-pay payroll carries a separately calculated annual deduction on actual wages, including bonuses. Annual assessment deducts each person's own cohort amount before combining the household; individual assessments still apply separate limits and zero floors. The age-only unavailable guard is removed on this path. Standard 2026 age 64 case: EUR 608 relief and EUR 46,066 modeled taxable income, with unchanged PAP payroll results. Age 65 retains the 2025 cohort cap of EUR 627.
- `a00073f`: annual details show a compact source-linked age-relief deduction only when positive, including each person's individual assessment panel.

Validation: full checks and build passed for each implementation scope; all pinned BMF fixtures pass. Added regressions cover cohort/year boundaries, capped and uncapped wages, zero wages, both assessments, partial-year/bonus receipts and invalid configuration. Headless rendering verified the row, source link, separate partner amounts and zero-row omission. This does not establish support for pension receipts, exempt social-insurance status or other income. Child-allowance, church-tax and single-parent limitations remain. The parental-leave annual collector retains its independent age-relief guard.
