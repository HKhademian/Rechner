import "#/components/DomainCalculator.css";
import "#/components/LifeMonthlyView.css";
import {
  type JSX,
} from "preact";


import {
  taxClassSwitchStore,
} from "#/apps/tax-class-switch/taxClassSwitchStore.ts";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";
import CalculationExplanationPanel from "#components/CalculationExplanationPanel";


import {
  MetricCard,
  MetricTone,
} from "#components/ui/MetricCard";
import {
  NumberField,
} from "#components/ui/NumberField";
import {
  PageHeader,
} from "#components/ui/PageHeader";
import {
  JurisdictionCode,
} from "#engine/lifeProfile/statutoryRuleResolver";
import {
  compareTaxClassSwitches,
} from "#engine/lifeProfile/taxClassSwitchComparison";
import {
  TaxClassCombination,
  toTaxClassCombination,
} from "#engine/lifeProfile/taxSwitchEvent";
import {
  VERIFIED_TAX_YEARS,
} from "#engine/tax/taxRules";
import {
  toEuroCents,
} from "#engine/types";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";

function formatSettlement(cents: number): string {
  if (cents > 0) {
    return `+${formatIntegerEuroCents(toEuroCents(cents))} refund`;
  }
  if (cents < 0) {
    return `${formatIntegerEuroCents(toEuroCents(cents))} back-payment`;
  }
  return "0 € balanced";
}

export default function TaxClassSwitchCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const state = hydrated ? taxClassSwitchStore.state.value : taxClassSwitchStore.defaultState;

  const result = compareTaxClassSwitches({
    taxYear: state.taxYear,
    primaryMonthlyGrossEur: state.primaryMonthlyGrossEur,
    secondaryMonthlyGrossEur: state.secondaryMonthlyGrossEur,
    childrenCount: state.childrenCount,
    initialCombination: state.initialCombination,
    targetCombination: state.targetCombination,
    switchMonth: state.switchMonth,
    jurisdiction: JurisdictionCode.GermanyFederal,
  });

  const before = result.beforeSwitch;
  const after = result.afterSwitch;
  const selected = result.selectedSwitchScenario;
  const finalTax = result.finalAnnualTax;

  const monthlyDeltaCents = before && after
    ? toEuroCents(after.combinedMonthlyNetCents - before.combinedMonthlyNetCents)
    : toEuroCents(0);

  return <>
    <main className="domain-calc-page">
      <PageHeader
        eyebrow="Payroll vs. Final Tax · Demo"
        title="Tax Class Switch (Steuerklassenwechsel) Comparator"
        subtitle="Compare switch dates and household combinations while keeping monthly payroll withholding strictly separate from final annual joint income tax."
        actions={<button type="button" className="ui-btn ui-btn--sm" onClick={taxClassSwitchStore.reset}>Reset</button>}
      />

      {before && after && selected && finalTax && <section className="domain-calc-metrics" aria-label="Tax class switch highlights">
        <MetricCard
          label="Monthly Net Change After Switch"
          value={`${monthlyDeltaCents >= 0 ? "+" : ""}${formatIntegerEuroCents(monthlyDeltaCents)}/mo`}
          tone={monthlyDeltaCents >= 0 ? MetricTone.Gain : MetricTone.Loss}
          subtitle={`${before.combination} -> ${after.combination}`}
        />
        <MetricCard
          label="Estimated Year-End Settlement"
          value={formatSettlement(selected.estimatedYearEndSettlementCents)}
          tone={selected.estimatedYearEndSettlementCents >= 0 ? MetricTone.Gain : MetricTone.Loss}
          subtitle={selected.label}
        />
        <MetricCard
          label="Final Annual Joint Tax"
          value={formatIntegerEuroCents(finalTax.totalFinalJointTaxCents)}
          tone={MetricTone.Primary}
          subtitle={finalTax.mandatoryFilingRequired ? "Mandatory tax return (§ 46 EStG)" : "Invariant to tax class choice"}
        />
      </section>}

      <section className="ui-card domain-calc-card" aria-labelledby="tcs-inputs-heading">
        <h2 id="tcs-inputs-heading">Household Scenario &amp; Switch Timing</h2>
        <div className="domain-calc-grid">
          <div className="ui-field">
            <label htmlFor="tcs-year" className="ui-field__label">Verified tax year</label>
            <select
              id="tcs-year"
              className="ui-input"
              value={String(state.taxYear)}
              onChange={(e) => taxClassSwitchStore.update((s) => ({ ...s,
                taxYear: Number((e.target as HTMLSelectElement).value) }))}
            >
              {VERIFIED_TAX_YEARS.map((year) => <option key={year} value={String(year)}>{year}</option>)}
            </select>
          </div>
          <NumberField
            id="tcs-gross-a"
            label="Spouse A monthly gross"
            value={state.primaryMonthlyGrossEur}
            min={0}
            max={50000}
            step={100}
            unit="€"
            onChange={(v) => taxClassSwitchStore.update((s) => ({ ...s,
              primaryMonthlyGrossEur: v }))}
          />
          <NumberField
            id="tcs-gross-b"
            label="Spouse B monthly gross"
            value={state.secondaryMonthlyGrossEur}
            min={0}
            max={50000}
            step={100}
            unit="€"
            onChange={(v) => taxClassSwitchStore.update((s) => ({ ...s,
              secondaryMonthlyGrossEur: v }))}
          />
          <NumberField
            id="tcs-children"
            label="Children (PV relief)"
            value={state.childrenCount}
            min={0}
            max={10}
            step={1}
            onChange={(v) => taxClassSwitchStore.update((s) => ({ ...s,
              childrenCount: v }))}
          />
          <div className="ui-field">
            <label htmlFor="tcs-initial" className="ui-field__label">Initial combination</label>
            <select
              id="tcs-initial"
              className="ui-input"
              value={state.initialCombination}
              onChange={(e) => taxClassSwitchStore.update((s) => ({ ...s,
                initialCombination: toTaxClassCombination((e.target as HTMLSelectElement).value) }))}
            >
              <option value={TaxClassCombination.IV_IV}>IV / IV</option>
              <option value={TaxClassCombination.III_V}>III / V</option>
              <option value={TaxClassCombination.V_III}>V / III</option>
              <option value={TaxClassCombination.IV_IV_Factor}>IV / IV with factor (§ 39f)</option>
            </select>
          </div>
          <div className="ui-field">
            <label htmlFor="tcs-target" className="ui-field__label">Target combination</label>
            <select
              id="tcs-target"
              className="ui-input"
              value={state.targetCombination}
              onChange={(e) => taxClassSwitchStore.update((s) => ({ ...s,
                targetCombination: toTaxClassCombination((e.target as HTMLSelectElement).value) }))}
            >
              <option value={TaxClassCombination.IV_IV}>IV / IV</option>
              <option value={TaxClassCombination.III_V}>III / V</option>
              <option value={TaxClassCombination.V_III}>V / III</option>
              <option value={TaxClassCombination.IV_IV_Factor}>IV / IV with factor (§ 39f)</option>
            </select>
          </div>
          <NumberField
            id="tcs-month"
            label="Effective switch month (1=Jan, 13=No switch)"
            value={state.switchMonth}
            min={1}
            max={13}
            step={1}
            onChange={(v) => taxClassSwitchStore.update((s) => ({ ...s,
              switchMonth: v }))}
          />
        </div>
      </section>

      {before && after && <section className="ui-card domain-calc-card" aria-labelledby="tcs-view1-heading">
        <h2 id="tcs-view1-heading">View 1: Estimated Monthly Payroll Withholding</h2>
        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>State</th>
                <th>Combination</th>
                <th>Spouse A net/mo</th>
                <th>Spouse B net/mo</th>
                <th>Combined net/mo</th>
                <th>Tax withheld/mo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Before switch</th>
                <td>{before.combination}{before.factor !== undefined ? ` (factor ${before.factor.toFixed(3)})` : ""}</td>
                <td>{formatIntegerEuroCents(before.primaryMonthlyNetCents)}</td>
                <td>{formatIntegerEuroCents(before.secondaryMonthlyNetCents)}</td>
                <td>{formatIntegerEuroCents(before.combinedMonthlyNetCents)}</td>
                <td>{formatIntegerEuroCents(before.combinedMonthlyTaxWithheldCents)}</td>
              </tr>
              <tr>
                <th scope="row">After switch</th>
                <td>{after.combination}{after.factor !== undefined ? ` (factor ${after.factor.toFixed(3)})` : ""}</td>
                <td>{formatIntegerEuroCents(after.primaryMonthlyNetCents)}</td>
                <td>{formatIntegerEuroCents(after.secondaryMonthlyNetCents)}</td>
                <td>{formatIntegerEuroCents(after.combinedMonthlyNetCents)}</td>
                <td>{formatIntegerEuroCents(after.combinedMonthlyTaxWithheldCents)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Switch timing</th>
                <th>Months split</th>
                <th>Annual payroll net</th>
                <th>Annual tax withheld</th>
                <th>Est. year-end settlement</th>
              </tr>
            </thead>
            <tbody>
              {result.switchDateComparisons.map((row) => <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{row.monthsInInitial}m / {row.monthsInTarget}m</td>
                <td>{formatIntegerEuroCents(row.annualCombinedNetCents)}</td>
                <td>{formatIntegerEuroCents(row.annualCombinedTaxWithheldCents)}</td>
                <td>{formatSettlement(row.estimatedYearEndSettlementCents)}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>}

      {finalTax && <section className="ui-card domain-calc-card" aria-labelledby="tcs-view2-heading">
        <h2 id="tcs-view2-heading">View 2: Final Annual Joint Tax Assessment (Zusammenveranlagung)</h2>
        <div className="life-monthly__scroll">
          <table>
            <tbody>
              <tr>
                <th scope="row">Combined annual taxable base (est.)</th>
                <td>{formatIntegerEuroCents(toEuroCents(finalTax.primaryAnnualTaxableBaseCents + finalTax.secondaryAnnualTaxableBaseCents))}</td>
              </tr>
              <tr>
                <th scope="row">Joint income tax (§ 26b / § 32a EStG)</th>
                <td>{formatIntegerEuroCents(finalTax.annualJointIncomeTaxCents)}</td>
              </tr>
              <tr>
                <th scope="row">Joint solidarity surcharge (SolZ)</th>
                <td>{formatIntegerEuroCents(finalTax.annualJointSolzCents)}</td>
              </tr>
              <tr>
                <th scope="row">Total final annual joint tax</th>
                <td><strong>{formatIntegerEuroCents(finalTax.totalFinalJointTaxCents)}</strong></td>
              </tr>
              <tr>
                <th scope="row">Annual tax return filing</th>
                <td>{finalTax.mandatoryFilingRequired ? "Mandatory (§ 46 Abs. 2 Nr. 3a EStG for III/V or IV/IV-factor)" : "Voluntary unless other § 46 criteria apply"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <CalculationExplanationPanel explanation={result.explanation} summary="Explain § 38b / § 39f / § 26b EStG formula and assumptions" />
      </section>}
    </main>
  </>;
}
