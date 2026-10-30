import OptionalNumberInput from "#components/OptionalNumberInput";
import {
  type JSX,
} from "preact";
import {
  selectedTaxYear,
  selectedTaxRules,
  verifiedTaxYears,
  parseVerifiedTaxYear,
  resetConfig,
} from "#store/taxConfigStore";

import {
  personalTaxFactor,
} from "#store/calculatorStore";
import {
  toTaxFactor,
} from "#engine/types";

export default function TaxSettings({ onValidityChange }: { onValidityChange?: (valid: boolean) => void }): JSX.Element {
  return (
    <section style={{ marginTop: "15px" }}>
      <h3>Published payroll rules</h3>
      <label for="payrollYear">Tax year</label>
      <select id="payrollYear" value={selectedTaxYear.value}
        onChange={(event) => {
          selectedTaxYear.value = parseVerifiedTaxYear(Number(event.currentTarget.value));
        }}>
        {verifiedTaxYears.map((year) => <option key={year} value={year}>{year}</option>)}
      </select>
      <OptionalNumberInput id="payrollFactor" label="Approved class IV factor (optional, 0–1)" max={1} step={0.001} value={personalTaxFactor.value}
        onChange={(value) => {
          personalTaxFactor.value = value === undefined ? undefined : toTaxFactor(value);
        }} onValidityChange={onValidityChange} />
      <button onClick={resetConfig}>Use latest published year</button>
      <p>Personal insurance and payroll details are editable for each earner. Published tariffs stay tied to their year.</p>
      <details>
        <summary>Values and official sources</summary>
        <dl>
          {Object.entries(selectedTaxRules.value.parameters).map(([key, parameter]) => (
            <div key={key}>
              <dt><a href={parameter.source} target="_blank" rel="noreferrer">{parameter.label}</a></dt>
              <dd>{parameter.value}</dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
