import "./LiveCalculatorInputs.css";
import {
  type JSX,
} from "preact";
import {
  type Signal,
} from "@preact/signals";
import {
  useEffect,
  useState,
} from "preact/hooks";
import {
  parseCalculatorNumber,
} from "#utils/calculatorNumberInput";

export function LiveNumberInput({ id, label, value, construct, beforeChange, step = 1, scope = "Live Calculation", onValidityChange, descriptionId }: {
  id: string;
  label: string;
  value: Signal<number>;
  construct: (value: number) => number;
  beforeChange?: (value: number) => void;
  step?: number;
  scope?: string;
  onValidityChange?: (valid: boolean) => void;
  descriptionId?: string;
}): JSX.Element {
  const current = value.value;
  const [draft, setDraft] = useState(String(current));
  const [error, setError] = useState("");
  const reportError = (message: string): void => {
    setError(message);
    onValidityChange?.(message === "");
  };
  useEffect(() => () => onValidityChange?.(true), []);
  useEffect(() => {
    setDraft(String(current));
    reportError("");
  }, [current]);
  return (
    <div className="live-control">
      <input id={id} className="live-input" type="number" min="0" step={step} value={draft}
        aria-label={`${scope}: ${label}`} aria-invalid={error !== ""} aria-describedby={[descriptionId, error ? `${id}-error` : undefined].filter(Boolean).join(" ") || undefined}
        onInput={(event) => {
          const raw = event.currentTarget.value;
          setDraft(raw);
          try {
            const parsed = parseCalculatorNumber(raw, construct);
            if (parsed === undefined) {
              reportError("Enter a value.");
            }
            else {
              beforeChange?.(parsed);
              value.value = parsed;
              reportError("");
            }
          }
          catch (problem) {
            reportError(problem instanceof Error ? problem.message : "Invalid input.");
          }
        }} />
      {error && <p id={`${id}-error`} className="live-input__error" role="status">{error}</p>}
    </div>
  );
}

export function LiveChoiceInput<T extends string | number>({ label, value, options, beforeChange, scope = "Live Calculation", onValidityChange }: {
  label: string;
  value: Signal<T>;
  beforeChange?: (value: T) => void;
  scope?: string;
  onValidityChange?: (valid: boolean) => void;
  options: readonly { value: T;
    label: string }[];
}): JSX.Element {
  const [error, setError] = useState("");
  const reportError = (message: string): void => {
    setError(message);
    onValidityChange?.(message === "");
  };
  useEffect(() => () => onValidityChange?.(true), []);
  return (
    <div className="live-control">
      <select className="live-input" aria-label={`${scope}: ${label}`} value={value.value}
        onChange={(event) => {
          const option = options.find((item) => String(item.value) === event.currentTarget.value);
          if (option) {
            try {
              beforeChange?.(option.value);
              value.value = option.value;
              reportError("");
            }
            catch (problem) {
              reportError(problem instanceof Error ? problem.message : "Invalid input.");
            }
          }
        }}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {error && <p className="live-input__error" role="status">{error}</p>}
    </div>
  );
}

export function LiveToggleInput({ label, value, beforeChange, scope = "Live Calculation", onValidityChange }: { label: string;
  scope?: string;
  onValidityChange?: (valid: boolean) => void;
  value: Signal<boolean>;
  beforeChange?: (value: boolean) => void }): JSX.Element {
  const [error, setError] = useState("");
  const reportError = (message: string): void => {
    setError(message);
    onValidityChange?.(message === "");
  };
  useEffect(() => () => onValidityChange?.(true), []);
  return (
    <div className="live-control">
      <input className="live-toggle" type="checkbox" aria-label={`${scope}: ${label}`} checked={value.value}
        onChange={(event) => {
          try {
            beforeChange?.(event.currentTarget.checked);
            value.value = event.currentTarget.checked;
            reportError("");
          }
          catch (problem) {
            reportError(problem instanceof Error ? problem.message : "Invalid input.");
          }
        }} />
      {error && <p className="live-input__error" role="status">{error}</p>}
    </div>
  );
}
