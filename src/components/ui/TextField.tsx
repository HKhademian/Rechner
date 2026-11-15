import "./UnifiedControls.css";
import {
  useId,
} from "preact/hooks";
import type {
  ComponentChildren,
  JSX,
} from "preact";

export type TextFieldType = "text" | "search" | "email" | "url";

export interface TextFieldProps {
  readonly id?: string;
  readonly label?: string;
  readonly ariaLabel?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly type?: TextFieldType;
  readonly placeholder?: string;
  readonly hint?: string;
  readonly error?: string;
  readonly asideValue?: ComponentChildren;
  readonly maxLength?: number;
  readonly compact?: boolean;
  readonly monospace?: boolean;
  readonly leadingIcon?: ComponentChildren;
  readonly trailingAction?: ComponentChildren;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly autoComplete?: string;
  readonly inputMode?: JSX.HTMLAttributes<HTMLInputElement>["inputMode"];
  readonly className?: string;
}

/** Canonical text and search input wrapper matching NumberField sizing, validation states, and tokens. */
export function TextField({
  id,
  label,
  ariaLabel,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  error,
  asideValue,
  maxLength,
  compact = false,
  monospace = false,
  leadingIcon,
  trailingAction,
  disabled = false,
  required = false,
  autoComplete,
  inputMode,
  className = "",
}: TextFieldProps): JSX.Element {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  const boxClasses = [
    "ui-text-box",
    compact ? "ui-text-box--compact" : "",
    monospace ? "ui-text-box--monospace" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={["ui-field", className.trim()].filter(Boolean).join(" ")}>
      {(label || asideValue !== undefined) && (
        <div className="ui-field__top">
          {label ? (
            <label className="ui-field__label" for={inputId}>
              {label}
              {required && <span className="ui-field__required" aria-hidden="true"> *</span>}
            </label>
          ) : (
            <span />
          )}
          {asideValue !== undefined && (
            <span className="ui-field__aside">{asideValue}</span>
          )}
        </div>
      )}
      <div
        className={boxClasses}
        data-invalid={error ? "true" : undefined}
        data-disabled={disabled ? "true" : undefined}
      >
        {leadingIcon && (
          <span className="ui-text-box__leading" aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <input
          id={inputId}
          type={type}
          className="ui-text-box__input"
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-label={ariaLabel ?? label}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          onInput={(event) => onChange(event.currentTarget.value)}
        />
        {trailingAction && (
          <div className="ui-text-box__trailing">
            {trailingAction}
          </div>
        )}
      </div>
      {error && (
        <p id={errorId} className="ui-field__error" role="alert">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="ui-field__hint">
          {hint}
        </p>
      )}
    </div>
  );
}
