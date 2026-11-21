import "./ResultsDisplay.css";
import OptionalNumberInput from "#components/OptionalNumberInput";
import LawRefLink from "#components/laws/LawRefLink";
import {
  Button,
  ButtonSize,
} from "#components/ui/Button";
import {
  Disclosure,
} from "#components/ui/Disclosure";
import {
  SegmentedControl,
} from "#components/ui/SegmentedControl";
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
  parseVerifiedTaxYear,
  selectedTaxYear,
  selectedTaxRules,
  verifiedTaxYears,
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
    <section className="tax-settings">
      <div className="tax-settings__bar">
        <div id="payrollYear" className="ui-field">
          <span className="ui-field__label">Tax year</span>
          <SegmentedControl
            compact
            label="Tax year"
            value={selectedTaxYear.value}
            onChange={(year) => {
              selectedTaxYear.value = parseVerifiedTaxYear(year);
            }}
            options={verifiedTaxYears.map((year) => ({
              value: parseVerifiedTaxYear(year),
              label: String(year),
            }))}
          />
        </div>
        <Button size={ButtonSize.Sm} onClick={resetConfig}>
          Latest year
        </Button>
      </div>
      <OptionalNumberInput
        id="payrollFactor"
        topicId="tax-class"
        label="Approved class IV factor (optional, 0–1)"
        max={1}
        step={0.001}
        value={personalTaxFactor.value}
        onChange={(value) => {
          personalTaxFactor.value = value === undefined ? undefined : toTaxFactor(value);
        }}
        onValidityChange={onValidityChange}
      />
      <Disclosure title="Rates and sources" subtle>
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
      </Disclosure>
    </section>
  );
}
