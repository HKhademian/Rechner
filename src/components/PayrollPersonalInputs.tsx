import {
  type JSX,
} from "preact";
import {
  type Signal,
} from "@preact/signals";
import {
  useState,
} from "preact/hooks";
import {
  type PayrollOptions,
  parsePersonalPayrollOptions,
} from "#engine/tax/payroll";

export default function PayrollPersonalInputs({ id, options }: {
  id: string;
  options: Signal<PayrollOptions>;
}): JSX.Element {
  const [error, setError] = useState("");
  const update = (field: string, value: string, divisor = 1): void => {
    try {
      options.value = parsePersonalPayrollOptions({ ...options.value,
        [field]: value === "" ? undefined : Number(value) / divisor });
      setError("");
    }
    catch (problem) {
      setError(problem instanceof Error ? problem.message : "Invalid payroll detail.");
    }
  };
  return (
    <details>
      <summary>Personal payroll details</summary>
      <p>Blank fields use the published average insurer rate and the assumptions shown with the result.</p>
      <label for={`${id}-insurer`}>Insurer total Zusatzbeitrag (%)</label>
      <input id={`${id}-insurer`} type="number" min="0" max="100" step="0.01"
        value={options.value.healthSupplementTotalRate === undefined ? "" : options.value.healthSupplementTotalRate * 100}
        onInput={(event) => update("healthSupplementTotalRate", event.currentTarget.value, 100)} />
      <label for={`${id}-age`}>Age on 1 January</label>
      <input id={`${id}-age`} type="number" min="0" step="1" value={options.value.ageAtYearStart ?? ""}
        onInput={(event) => update("ageAtYearStart", event.currentTarget.value)} />
      <label for={`${id}-children`}>Children under 25 for care insurance</label>
      <input id={`${id}-children`} type="number" min="0" step="1" value={options.value.childrenUnder25 ?? ""}
        onInput={(event) => update("childrenUnder25", event.currentTarget.value)} />
      <label for={`${id}-allowance`}>ELStAM child allowance factor (ZKF)</label>
      <input id={`${id}-allowance`} type="number" min="0" step="0.1" value={options.value.childAllowanceFactor ?? ""}
        onInput={(event) => update("childAllowanceFactor", event.currentTarget.value)} />
      <label>
        <input type="checkbox" checked={options.value.isParent ?? false}
          onChange={(event) => {
            options.value = parsePersonalPayrollOptions({ ...options.value,
              isParent: event.currentTarget.checked ? true : undefined });
          }} />
        Parent status continues even if no child is currently counted above
      </label>
      <p><a href="https://www.gesetze-im-internet.de/sgb_11/__55.html" target="_blank" rel="noreferrer">Care contribution rules</a></p>
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
