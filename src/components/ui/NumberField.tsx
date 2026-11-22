import "./UnifiedControls.css";
import {
  TopicHelp, 
} from "#components/topics/TopicHelp";
import type {
  JSX,
} from "preact";
import {
  useEffect,
  useState,
} from "preact/hooks";
import {
  parseCalculatorNumber,
} from "#utils/calculatorNumberInput";

export interface NumberPreset {
  readonly value: number;
  readonly label: string;
}

export interface NumberSliderConfig {
  readonly min: number;
  readonly max: number;
  readonly step?: number;
}

export interface NumberFieldProps<T extends number = number> {
  readonly id: string;
  readonly topicId?: string;
  readonly label: string;
  readonly value: T | undefined;
  readonly onChange: (value: T) => void;
  readonly construct?: (value: number) => T;
  readonly onValidityChange?: (valid: boolean) => void;
  readonly unit?: string;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly placeholder?: string;
  readonly hint?: string;
  readonly asideValue?: string;
  readonly ariaLabel?: string;
  readonly describedBy?: string;
  readonly compact?: boolean;
  readonly slider?: NumberSliderConfig;
  readonly presets?: readonly NumberPreset[];
  readonly accentColor?: string;
}

function defaultConstruct<T extends number>(value: number): T {
  return value as T;
}

/**
 * Unified exact numeric input combining draft-safe typing, unit suffixes,
 * optional quick preset chips, and an optional synchronized range slider.
 */
export function NumberField<T extends number = number>({
  id,
  topicId,
  label,
  value,
  onChange,
  construct = defaultConstruct,
  onValidityChange,
  unit,
  min = 0,
  max,
  step = 1,
  placeholder,
  hint,
  asideValue,
  ariaLabel,
  describedBy,
  compact = false,
  slider,
  presets,
  accentColor,
}: NumberFieldProps<T>): JSX.Element {
  const formattedText = value === undefined ? "" : String(Math.round(value * 1000) / 1000);
  const [draft, setDraft] = useState(formattedText);
  const [error, setError] = useState("");

  const reportError = (message: string): void => {
    setError(message);
    onValidityChange?.(message === "");
  };

  useEffect(() => () => onValidityChange?.(true), []);
  useEffect(() => {
    setDraft(formattedText);
    reportError("");
  }, [formattedText]);

  const commitNumber = (rawNumber: number, syncDraft = false): void => {
    try {
      if (rawNumber < min) {
        throw new RangeError(`Enter at least ${min}.`);
      }
      if (max !== undefined && rawNumber > max) {
        throw new RangeError(`Enter at most ${max}.`);
      }
      const next = construct(rawNumber);
      onChange(next);
      if (syncDraft) {
        setDraft(String(Math.round(rawNumber * 1000) / 1000));
      }
      reportError("");
    }
    catch (problem) {
      reportError(problem instanceof Error ? problem.message : "Invalid input.");
    }
  };

  const describedIds = [
    describedBy,
    hint ? `${id}-hint` : undefined,
    error ? `${id}-error` : undefined,
  ].filter(Boolean).join(" ") || undefined;

  const sliderValue = value ?? slider?.min ?? min;

  return (
    <div className="ui-field">
      <div className="ui-field__top">
        <label className="ui-field__label" for={id}>{label}</label>
        {topicId && <TopicHelp id={topicId} />}
        {asideValue && <span className="ui-field__aside">{asideValue}</span>}
      </div>

      <div
        className={`ui-number-box${compact ? " ui-number-box--compact" : ""}`}
        data-invalid={error !== "" ? "true" : undefined}
      >
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
          aria-label={ariaLabel ?? label}
          aria-invalid={error !== ""}
          aria-describedby={describedIds}
          onInput={(event) => {
            const raw = event.currentTarget.value;
            setDraft(raw);
            try {
              if (event.currentTarget.validity.badInput) {
                throw new TypeError("Enter a valid number.");
              }
              const parsed = parseCalculatorNumber(raw, (n) => n);
              if (parsed === undefined) {
                reportError("Enter a value.");
                return;
              }
              commitNumber(parsed, false);
            }
            catch (problem) {
              reportError(problem instanceof Error ? problem.message : "Invalid input.");
            }
          }}
        />
        {unit && <span className="ui-number-box__unit">{unit}</span>}
      </div>

      {slider && (
        <div className="ui-slider-wrap">
          <input
            className="ui-slider"
            type="range"
            min={slider.min}
            max={slider.max}
            step={slider.step ?? step}
            value={Math.min(slider.max, Math.max(slider.min, sliderValue))}
            aria-label={`${label} slider`}
            style={accentColor ? { accentColor } : undefined}
            onInput={(event) => commitNumber(Number(event.currentTarget.value), true)}
          />
        </div>
      )}

      {presets && presets.length > 0 && (
        <div className="ui-presets" role="group" aria-label={`${label} quick presets`}>
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className="ui-presets__btn"
              aria-pressed={value === preset.value}
              onClick={() => commitNumber(preset.value, true)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p id={`${id}-error`} className="ui-field__error" role="status">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className="ui-field__hint">
          {hint}
        </p>
      )}
    </div>
  );
}
