import {
  type JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  type JurisdictionCode,
} from "#engine/lifeProfile/statutoryRuleResolver";
import {
  TaxClassCombination,
  toTaxClassCombination,
} from "#engine/lifeProfile/taxSwitchEvent";
import {
  type TaxClassSwitchComparisonResult,
  compareTaxClassSwitches,
} from "#engine/lifeProfile/taxClassSwitchComparison";
import {
  VERIFIED_TAX_YEARS,
} from "#engine/tax/taxRules";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";
import CalculationExplanationPanel from "#components/CalculationExplanationPanel";

export interface TaxSwitchComparisonPanelProps {
  readonly jurisdiction: JurisdictionCode;
}

export default function TaxSwitchComparisonPanel({ jurisdiction }: TaxSwitchComparisonPanelProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [taxYear, setTaxYear] = useState<number>(VERIFIED_TAX_YEARS[VERIFIED_TAX_YEARS.length - 1] ?? 2026);
  const [primaryGrossText, setPrimaryGrossText] = useState("6000");
  const [secondaryGrossText, setSecondaryGrossText] = useState("3200");
  const [childrenText, setChildrenText] = useState("0");
  const [initialCombo, setInitialCombo] = useState<TaxClassCombination>(TaxClassCombination.IV_IV);
  const [targetCombo, setTargetCombo] = useState<TaxClassCombination>(TaxClassCombination.III_V);
  const [switchMonth, setSwitchMonth] = useState("7");

  let result: TaxClassSwitchComparisonResult | undefined;
  if (expanded) {
    const primary = Number(primaryGrossText);
    const secondary = Number(secondaryGrossText);
    const children = Number(childrenText);
    const month = Number(switchMonth);
    if (Number.isFinite(primary) && primary >= 0
      && Number.isFinite(secondary) && secondary >= 0
      && Number.isSafeInteger(children) && children >= 0 && children <= 10
      && Number.isSafeInteger(month) && month >= 1 && month <= 13) {
      try {
        result = compareTaxClassSwitches({
          taxYear,
          primaryMonthlyGrossEur: primary,
          secondaryMonthlyGrossEur: secondary,
          childrenCount: children,
          initialCombination: initialCombo,
          targetCombination: targetCombo,
          switchMonth: month,
          jurisdiction,
        });
      }
      catch {
        result = undefined;
      }
    }
  }

  return <section className="life-monthly" aria-label="Tax class switch comparison">
    <button type="button" className="ui-btn" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      {expanded ? "Hide tax class switch comparison" : "Compare tax class switches (withholding vs. final tax)"}
    </button>
    {expanded && <>
      <p>Compare German spousal tax class switch dates with separate views for monthly payroll withholding (Lohnsteuerabzug) and final annual joint assessment (Zusammenveranlagung). For full deductions and church tax, open the <a href="/calculators/net-pay/">Net Pay calculator</a>.</p>
      <div className="life-people__form">
        <label className="life-people__field">Tax year
          <select value={String(taxYear)} onChange={(event) => setTaxYear(Number(event.currentTarget.value))}>
            {VERIFIED_TAX_YEARS.map((year) => <option key={year} value={String(year)}>{year}</option>)}
          </select>
        </label>
        <label className="life-people__field">Spouse 1 monthly gross (€)
          <input type="number" min="0" step="100" value={primaryGrossText} onInput={(event) => setPrimaryGrossText(event.currentTarget.value)} />
        </label>
        <label className="life-people__field">Spouse 2 monthly gross (€)
          <input type="number" min="0" step="100" value={secondaryGrossText} onInput={(event) => setSecondaryGrossText(event.currentTarget.value)} />
        </label>
        <label className="life-people__field">Children
          <input type="number" min="0" max="10" step="1" value={childrenText} onInput={(event) => setChildrenText(event.currentTarget.value)} />
        </label>
        <label className="life-people__field">Starting tax classes
          <select value={initialCombo} onChange={(event) => setInitialCombo(toTaxClassCombination(event.currentTarget.value))}>
            <option value={TaxClassCombination.IV_IV}>IV / IV</option>
            <option value={TaxClassCombination.III_V}>III / V</option>
            <option value={TaxClassCombination.V_III}>V / III</option>
            <option value={TaxClassCombination.IV_IV_Factor}>IV / IV with factor</option>
          </select>
        </label>
        <label className="life-people__field">Target tax classes
          <select value={targetCombo} onChange={(event) => setTargetCombo(toTaxClassCombination(event.currentTarget.value))}>
            <option value={TaxClassCombination.III_V}>III / V</option>
            <option value={TaxClassCombination.V_III}>V / III</option>
            <option value={TaxClassCombination.IV_IV}>IV / IV</option>
            <option value={TaxClassCombination.IV_IV_Factor}>IV / IV with factor</option>
          </select>
        </label>
        <label className="life-people__field">Effective switch month (1–12, or 13 = no switch)
          <input type="number" min="1" max="13" step="1" value={switchMonth} onInput={(event) => setSwitchMonth(event.currentTarget.value)} />
        </label>
      </div>
      {!result ? <p>Enter valid non-negative gross salaries and switch month (1–13).</p> : !result.supported ? <>
        <p>No verified tax class switch model applies for this jurisdiction and tax year.</p>
        <CalculationExplanationPanel explanation={result.explanation} summary="Explain tax class rule limitations" />
      </> : <>
        <h4>View 1: Estimated payroll withholding (monthly cash flow)</h4>
        {result.beforeSwitch && result.afterSwitch && <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Phase</th>
                <th>Spouse 1 monthly net</th>
                <th>Spouse 2 monthly net</th>
                <th>Combined monthly net</th>
                <th>Combined monthly tax withheld</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Before switch ({result.beforeSwitch.combination})</th>
                <td>{formatIntegerEuroCents(result.beforeSwitch.primaryMonthlyNetCents)}</td>
                <td>{formatIntegerEuroCents(result.beforeSwitch.secondaryMonthlyNetCents)}</td>
                <td>{formatIntegerEuroCents(result.beforeSwitch.combinedMonthlyNetCents)}</td>
                <td>{formatIntegerEuroCents(result.beforeSwitch.combinedMonthlyTaxWithheldCents)}</td>
              </tr>
              <tr>
                <th scope="row">After switch ({result.afterSwitch.combination}{result.afterSwitch.factor ? ` · factor ${result.afterSwitch.factor.toFixed(3)}` : ""})</th>
                <td>{formatIntegerEuroCents(result.afterSwitch.primaryMonthlyNetCents)}</td>
                <td>{formatIntegerEuroCents(result.afterSwitch.secondaryMonthlyNetCents)}</td>
                <td>{formatIntegerEuroCents(result.afterSwitch.combinedMonthlyNetCents)}</td>
                <td>{formatIntegerEuroCents(result.afterSwitch.combinedMonthlyTaxWithheldCents)}</td>
              </tr>
            </tbody>
          </table>
        </div>}

        <h4>View 2: Final annual joint tax assessment &amp; switch-date settlement</h4>
        {result.finalAnnualTax && <>
          <p>
            <strong>Estimated annual joint income tax + Solz (§ 26b / § 32a EStG):</strong>{" "}
            {formatIntegerEuroCents(result.finalAnnualTax.totalFinalJointTaxCents)} (identical across all tax class switch dates for the same annual income).{" "}
            {result.finalAnnualTax.mandatoryFilingRequired ? "Mandatory annual tax return filing applies (§ 46 Abs. 2 Nr. 3a EStG)." : ""}
          </p>
          <div className="life-monthly__scroll">
            <table>
              <thead>
                <tr>
                  <th>Switch timing</th>
                  <th>Months ({initialCombo} / {targetCombo})</th>
                  <th>Annual payroll net</th>
                  <th>Annual tax withheld</th>
                  <th>Est. year-end settlement</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ...(result.selectedSwitchScenario ? [result.selectedSwitchScenario] : []),
                  ...result.switchDateComparisons.filter((row) => row.switchMonth !== result.selectedSwitchScenario?.switchMonth),
                ].map((row) => <tr key={`${row.label}-${row.switchMonth}`}>
                  <th scope="row">{row.label}</th>
                  <td>{row.monthsInInitial} / {row.monthsInTarget}</td>
                  <td>{formatIntegerEuroCents(row.annualCombinedNetCents)}</td>
                  <td>{formatIntegerEuroCents(row.annualCombinedTaxWithheldCents)}</td>
                  <td>{row.estimatedYearEndSettlementCents >= 0
                    ? `Est. refund ${formatIntegerEuroCents(row.estimatedYearEndSettlementCents)}`
                    : `Est. back-payment ${formatIntegerEuroCents(Math.abs(row.estimatedYearEndSettlementCents))}`}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </>}
        <CalculationExplanationPanel
          explanation={result.explanation}
          summary="Explain payroll withholding vs. final joint tax rules"
        />
      </>}
    </>}
  </section>;
}
