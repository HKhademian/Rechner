import {
  type JSX,
} from "preact";
import {
  type Signal,
} from "@preact/signals";
import OptionalNumberInput from "#components/OptionalNumberInput";
import {
  type PayrollOptions,
  parsePersonalPayrollOptions,
} from "#engine/tax/payroll";
import {
  DEFAULT_TAX_RULES,
} from "#engine/tax/taxRules";

export default function PayrollPersonalInputs({ id, options, showLocation = false, summaryLabel = "Personal payroll details", onValidityChange }: {
  id: string;
  options: Signal<PayrollOptions>;
  showLocation?: boolean;
  summaryLabel?: string;
  onValidityChange?: (id: string, valid: boolean) => void;
}): JSX.Element {
  const update = (field: string, value: number | undefined, divisor = 1): void => {
    options.value = parsePersonalPayrollOptions({ ...options.value,
      [field]: value === undefined ? undefined : value / divisor });
  };
  return (
    <details>
      <summary>{summaryLabel}</summary>
      <p>Blank fields use the published average insurer rate and the assumptions shown with the result.</p>
      <OptionalNumberInput id={`${id}-insurer`} label="Insurer total Zusatzbeitrag (%)" max={100} step={0.01}
        value={options.value.healthSupplementTotalRate === undefined ? undefined : options.value.healthSupplementTotalRate * 100}
        onChange={(value) => update("healthSupplementTotalRate", value, 100)} onValidityChange={(valid) => onValidityChange?.(`${id}-insurer`, valid)} />
      <OptionalNumberInput id={`${id}-age`} label="Age on 1 January" value={options.value.ageAtYearStart}
        onChange={(value) => update("ageAtYearStart", value)} onValidityChange={(valid) => onValidityChange?.(`${id}-age`, valid)} />
      <OptionalNumberInput id={`${id}-children`} label="Children under 25 for care insurance" value={options.value.childrenUnder25}
        onChange={(value) => update("childrenUnder25", value)} onValidityChange={(valid) => onValidityChange?.(`${id}-children`, valid)} />
      <OptionalNumberInput id={`${id}-allowance`} label="ELStAM child allowance factor (ZKF)" step={0.1} value={options.value.childAllowanceFactor}
        onChange={(value) => update("childAllowanceFactor", value)} onValidityChange={(valid) => onValidityChange?.(`${id}-allowance`, valid)} />
      <label>
        <input type="checkbox" checked={options.value.isParent ?? false}
          onChange={(event) => {
            options.value = parsePersonalPayrollOptions({ ...options.value,
              isParent: event.currentTarget.checked ? true : undefined });
          }} />
        Parent status continues even if no child is currently counted above
      </label>
      <p><a href="https://www.gesetze-im-internet.de/sgb_11/__55.html" target="_blank" rel="noreferrer">Care contribution rules</a></p>
      {showLocation && <>
        <label><input type="checkbox" checked={options.value.saxony ?? false}
          onChange={(event) => {
            options.value = parsePersonalPayrollOptions({ ...options.value,
              saxony: event.currentTarget.checked });
          }} />
          Employment in Saxony</label>
        <label for={`${id}-church`}>Church tax</label>
        <select id={`${id}-church`} value={options.value.churchTaxRate ?? 0}
          onChange={(event) => update("churchTaxRate", Number(event.currentTarget.value))}>
          <option value="0">None</option>
          <option value={DEFAULT_TAX_RULES.parameters.churchRateBavariaBadenWuerttemberg.value}>Bavaria / Baden-Württemberg</option>
          <option value={DEFAULT_TAX_RULES.parameters.churchRateOther.value}>Other federal states</option>
        </select>
        <a href={DEFAULT_TAX_RULES.parameters.churchRateOther.source} target="_blank" rel="noreferrer">Official church tax rates</a>
      </>}
    </details>
  );
}
