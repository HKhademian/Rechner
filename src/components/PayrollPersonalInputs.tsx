import {
  type JSX,
} from "preact";
import {
  type Signal,
} from "@preact/signals";
import LawRefLink from "#components/laws/LawRefLink";
import OptionalNumberInput from "#components/OptionalNumberInput";
import {
  ChoiceSelect,
} from "#components/ui/ChoiceSelect";
import {
  ToggleSwitch,
} from "#components/ui/ToggleSwitch";
import {
  LawGroupId,
  LawId,
} from "#engine/laws/types";
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
    options.value = parsePersonalPayrollOptions({
      ...options.value,
      [field]: value === undefined ? undefined : value / divisor,
    });
  };
  return (
    <details>
      <summary>{summaryLabel}</summary>
      <div style={{ display: "grid",
        gap: "12px",
        marginTop: "10px" }}>
        <p className="ui-field__hint">Blank fields use the published average insurer rate and defaults.</p>
        <div style={{ display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "12px" }}>
          <OptionalNumberInput
            id={`${id}-insurer`}
            label="Insurer total Zusatzbeitrag"
            unit="%"
            max={100}
            step={0.01}
            value={options.value.healthSupplementTotalRate === undefined ? undefined : options.value.healthSupplementTotalRate * 100}
            onChange={(value) => update("healthSupplementTotalRate", value, 100)}
            onValidityChange={(valid) => onValidityChange?.(`${id}-insurer`, valid)}
          />
          <OptionalNumberInput
            id={`${id}-age`}
            label="Age on 1 January"
            unit="yrs"
            value={options.value.ageAtYearStart}
            onChange={(value) => update("ageAtYearStart", value)}
            onValidityChange={(valid) => onValidityChange?.(`${id}-age`, valid)}
          />
          <OptionalNumberInput
            id={`${id}-children`}
            topicId="care-insurance"
            label="Children under 25 (care ins.)"
            value={options.value.childrenUnder25}
            onChange={(value) => update("childrenUnder25", value)}
            onValidityChange={(valid) => onValidityChange?.(`${id}-children`, valid)}
          />
          <OptionalNumberInput
            id={`${id}-allowance`}
            topicId="tax-class"
            label="ELStAM child allowance (ZKF)"
            step={0.1}
            value={options.value.childAllowanceFactor}
            onChange={(value) => update("childAllowanceFactor", value)}
            onValidityChange={(valid) => onValidityChange?.(`${id}-allowance`, valid)}
          />
        </div>
        <ToggleSwitch
          id={`${id}-is-parent`}
          topicId="care-insurance"
          label="Parent status active"
          hint="Keeps parent care-insurance rate even if no child under 25 is counted above"
          checked={options.value.isParent ?? false}
          onChange={(checked) => {
            options.value = parsePersonalPayrollOptions({
              ...options.value,
              isParent: checked ? true : undefined,
            });
          }}
        />
        <p className="ui-field__hint">
          <LawRefLink lawId={LawId.SGB11_55} label="Care contribution rules (§ 55 SGB XI)" />
        </p>
        {showLocation && (
          <div style={{ display: "grid",
            gap: "12px" }}>
            <ToggleSwitch
              id={`${id}-saxony`}
              topicId="care-insurance"
              label="Employment in Saxony"
              checked={options.value.saxony ?? false}
              onChange={(checked) => {
                options.value = parsePersonalPayrollOptions({
                  ...options.value,
                  saxony: checked,
                });
              }}
            />
            <ChoiceSelect
              id={`${id}-church`}
              compact
              label="Church tax rate"
              value={options.value.churchTaxRate ?? 0}
              options={[
                {
                  value: 0,
                  label: "None",
                },
                {
                  value: DEFAULT_TAX_RULES.parameters.churchRateBavariaBadenWuerttemberg.value,
                  label: "Bavaria / Baden-Württemberg (8%)",
                },
                {
                  value: DEFAULT_TAX_RULES.parameters.churchRateOther.value,
                  label: "Other federal states (9%)",
                },
              ]}
              onChange={(val) => update("churchTaxRate", val)}
            />
            <LawRefLink
              lawId={LawId.EStG_39b}
              groupId={LawGroupId.EStG_PayrollWithholding}
              label="Official church tax rates"
            />
          </div>
        )}
      </div>
    </details>
  );
}
