import "./ui/UnifiedControls.css";
import {
  TopicHelp, 
} from "#components/topics/TopicHelp";
import {
  type JSX,
} from "preact";
import {
  useEffect,
  useState,
} from "preact/hooks";

/** Blank means use the model's default; invalid text never replaces its last valid value. */
export default function OptionalNumberInput({ id, label, topicId, placeholder = "Auto", unit, value, onChange, onValidityChange, min = 0, max, step = 1 }: {
  id: string;
  label: string;
  topicId?: string;
  placeholder?: string;
  unit?: string;
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
    <div className="ui-field">
      <div className="ui-field__top">
        <label className="ui-field__label" for={id}>{label}</label>
        {topicId && <TopicHelp id={topicId} />}
      </div>
      <div className="ui-number-box ui-number-box--compact" data-invalid={error !== "" ? "true" : undefined}>
        <input
          id={id}
          className="ui-number-box__input"
          type="number"
          inputMode={step < 1 ? "decimal" : "numeric"}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          value={draft}
          aria-invalid={error !== ""}
          aria-describedby={error ? `${id}-error` : undefined}
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
          }}
        />
        {unit && <span className="ui-number-box__unit">{unit}</span>}
      </div>
      {error && <p id={`${id}-error`} className="ui-field__error" role="alert">{error}</p>}
    </div>
  );
}
