import "./UnifiedControls.css";
import {
  TopicHelp, 
} from "#components/topics/TopicHelp";
import type {
  JSX,
} from "preact";

export interface SegmentedOption<T extends string | number> {
  readonly value: T;
  readonly label: string;
  readonly title?: string;
  readonly disabled?: boolean;
}

export interface SegmentedControlProps<T extends string | number> {
  readonly label: string;
  readonly topicId?: string;
  readonly value: T;
  readonly options: readonly SegmentedOption<T>[];
  readonly onChange: (value: T) => void;
  readonly compact?: boolean;
  readonly fullWidth?: boolean;
}

/** Single canonical segmented option bar replacing fragmented inline button groups. */
export function SegmentedControl<T extends string | number>({
  label,
  topicId,
  value,
  options,
  onChange,
  compact = false,
  fullWidth = false,
}: SegmentedControlProps<T>): JSX.Element {
  const classes = [
    "ui-segmented",
    compact ? "ui-segmented--compact" : "",
    fullWidth ? "ui-segmented--full" : "",
  ].filter(Boolean).join(" ");

  const control = (
    <div className={classes} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          title={option.title}
          disabled={option.disabled}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
  return topicId ? <div className="ui-toggle-with-help">{control}<TopicHelp id={topicId} /></div> : control;
}
