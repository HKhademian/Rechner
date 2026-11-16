import "./UnifiedControls.css";
import {
  TopicHelp, 
} from "#components/topics/TopicHelp";
import type {
  JSX,
} from "preact";

export interface SelectOption<T extends string | number> {
  readonly value: T;
  readonly label: string;
}

export interface ChoiceSelectProps<T extends string | number> {
  readonly id: string;
  readonly topicId?: string;
  readonly label: string;
  readonly value: T;
  readonly options: readonly SelectOption<T>[];
  readonly onChange: (value: T) => void;
  readonly hint?: string;
  readonly compact?: boolean;
  readonly ariaLabel?: string;
}

/** Shared styled `<select>` wrapper matching NumberField heights and tokens. */
export function ChoiceSelect<T extends string | number>({
  id,
  topicId,
  label,
  value,
  options,
  onChange,
  hint,
  compact = false,
  ariaLabel,
}: ChoiceSelectProps<T>): JSX.Element {
  return (
    <div className="ui-field">
      <div className="ui-field__top">
        <label className="ui-field__label" for={id}>{label}</label>
        {topicId && <TopicHelp id={topicId} />}
      </div>
      <select
        id={id}
        className={`ui-select${compact ? " ui-select--compact" : ""}`}
        aria-label={ariaLabel ?? label}
        value={value}
        onChange={(event) => {
          const matched = options.find((item) => String(item.value) === event.currentTarget.value);
          if (matched) {
            onChange(matched.value);
          }
        }}
      >
        {options.map((option) => (
          <option key={String(option.value)} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && <p className="ui-field__hint">{hint}</p>}
    </div>
  );
}
