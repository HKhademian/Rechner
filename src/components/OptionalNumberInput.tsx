import "./LiveCalculatorInputs.css";
import {
  type JSX,
} from "preact";
import {
  useEffect,
  useState,
} from "preact/hooks";

/** Blank means use the model's default; invalid text never replaces its last valid value. */
export default function OptionalNumberInput({ id, label, value, onChange, onValidityChange, min = 0, max, step = 1 }: {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  onValidityChange?: (valid: boolean) => void;
  min?: number;
  max?: number;
  step?: number;
}): JSX.Element {
  const [draft, setDraft] = useState(value === undefined ? "" : String(value));
  const [error, setError] = useState("");
  const reportError = (message: string): void => {
    setError(message);
    onValidityChange?.(message === "");
  };
  useEffect(() => {
    setDraft(value === undefined ? "" : String(value));
    reportError("");
  }, [value]);
  useEffect(() => () => onValidityChange?.(true), []);
  return (
    <div className="live-control">
      <label for={id}>{label}</label>
      <input id={id} className="live-input" type="number" min={min} max={max} step={step} value={draft}
        aria-invalid={error !== ""} aria-describedby={error ? `${id}-error` : undefined}
        onInput={(event) => {
          const raw = event.currentTarget.value;
          setDraft(raw);
          try {
            if (event.currentTarget.validity.badInput) {
              throw new TypeError("Finish entering a number or clear this optional field.");
            }
            const parsed = raw === "" ? undefined : Number(raw);
            if (parsed !== undefined && !Number.isFinite(parsed)) {
              throw new TypeError("Enter a finite number or leave this optional field blank.");
            }
            onChange(parsed);
            reportError("");
          }
          catch (problem) {
            reportError(problem instanceof Error ? problem.message : "Invalid input.");
          }
        }} />
      {error && <p id={`${id}-error`} className="live-input__error" role="alert">{error}</p>}
    </div>
  );
}
