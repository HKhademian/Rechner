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
