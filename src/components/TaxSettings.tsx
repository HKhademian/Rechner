import OptionalNumberInput from "#components/OptionalNumberInput";
import LawRefLink from "#components/laws/LawRefLink";
import {
  TAX_KEY_TO_PARAMETER_ID,
  getTaxParameterPrimaryLawId,
} from "#engine/parameters/registry";
import {
  type TaxParameters,
} from "#engine/tax/taxRules";
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
  const taxKeys = Object.keys(TAX_KEY_TO_PARAMETER_ID) as readonly (keyof TaxParameters)[];
  return (
    <section style={{ marginTop: "15px" }}>
      <h3>Tax profile</h3>
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
      <button onClick={resetConfig}>Latest year</button>
      <details>
        <summary>Rates and sources</summary>
        <dl>
          {taxKeys.map((key) => {
            const parameter = selectedTaxRules.value.parameters[key];
            return (
              <div key={key}>
                <dt>
                  <LawRefLink
                    lawId={getTaxParameterPrimaryLawId(key)}
                    label={parameter.label}
                  />
                </dt>
                <dd>{parameter.value}</dd>
              </div>
            );
          })}
        </dl>
      </details>
    </section>
  );
}
