import {
  type JSX,
} from "preact";
import {
  useEffect,
  useState,
} from "preact/hooks";
import {
  type CalculatorInputs,
  calculatorViewPeriod,
} from "#store/calculatorStore";
import {
  type CalculatorGrossField,
  grossInputForPeriod,
} from "#engine/tax/calculatorGrossPeriod";
import {
  type GrossSalary,
  SalaryPeriod,
  toGrossSalary,
} from "#engine/types";
import {
  parseCalculatorNumber,
} from "#utils/calculatorNumberInput";
import "./LiveCalculatorInputs.css";

/** Keep unfinished text separate from the canonical financial input. */
export default function CalculatorGrossInput({ inputs, field, id, label, onChange, onValidityChange, descriptionId }: {
  inputs: CalculatorInputs;
  field: CalculatorGrossField;
  id: string;
  label: string;
  descriptionId?: string;
  onChange: (amount: GrossSalary) => void;
  onValidityChange: (valid: boolean) => void;
}): JSX.Element {
  const period = calculatorViewPeriod.value;
  const current = grossInputForPeriod(inputs, field, period);
  const text = current === undefined ? "" : String(Math.round(current * 100) / 100);
  const [draft, setDraft] = useState(text);
  const [error, setError] = useState("");
  useEffect(() => () => onValidityChange(true), []);
  useEffect(() => {
    setDraft(text); setError(""); onValidityChange(true);
  }, [current, period]);
  return <div className="live-control">
    <input id={id} className="live-input" type="number" min="0" step="0.01" value={draft}
      aria-label={`${label} (€ / ${period === SalaryPeriod.Monthly ? "month" : "year"})`}
      aria-invalid={error !== ""} aria-describedby={[`${id}-note`, descriptionId].filter(Boolean).join(" ")}
      onInput={(event) => {
        setDraft(event.currentTarget.value);
        try {
          const amount = parseCalculatorNumber(event.currentTarget.value, toGrossSalary);
          if (amount === undefined) {
            throw new TypeError("Enter a value. Results retain the last valid value.");
          }
          onChange(amount);
          setError("");
          onValidityChange(true);
        }
        catch (problem) {
          setError(problem instanceof Error ? problem.message : "Invalid gross amount.");
          onValidityChange(false);
        }
      }} />
    <small id={`${id}-note`} role={error ? "status" : undefined} className={error ? "live-input__error" : undefined}>
      {error || (current === undefined ? "No working months: enter a regular monthly salary if needed." : "")}
    </small>
  </div>;
}
