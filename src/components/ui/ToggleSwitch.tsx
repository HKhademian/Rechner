import "./UnifiedControls.css";
import type {
  JSX,
} from "preact";

export interface ToggleSwitchProps {
  readonly id?: string;
  readonly label: string;
  readonly hint?: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly plain?: boolean;
  readonly disabled?: boolean;
}

/** Accessible binary switch control sharing a 42px hit area and institutional styling. */
export function ToggleSwitch({
  id,
  label,
  hint,
  checked,
  onChange,
  plain = false,
  disabled = false,
}: ToggleSwitchProps): JSX.Element {
  return (
    <label className={`ui-toggle${plain ? " ui-toggle--plain" : ""}`} for={id}>
      <span className="ui-toggle__text">
        <span className="ui-toggle__label">{label}</span>
        {hint && <span className="ui-toggle__hint">{hint}</span>}
      </span>
      <span className="ui-toggle__control">
        <input
          id={id}
          type="checkbox"
          className="ui-toggle__input"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        <span className="ui-toggle__track" aria-hidden="true" />
        <span className="ui-toggle__thumb" aria-hidden="true" />
      </span>
    </label>
  );
}
