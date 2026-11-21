import "./UnifiedControls.css";
import type {
  ComponentChildren,
  JSX,
} from "preact";

export interface CalculatorWorkspaceProps {
  readonly inputs: ComponentChildren;
  readonly results: ComponentChildren;
  readonly className?: string;
}

/** Canonical two-column calculator layout pairing inputs beside live results. */
export function CalculatorWorkspace({
  inputs,
  results,
  className = "",
}: CalculatorWorkspaceProps): JSX.Element {
  return (
    <div className={["ui-workspace", className.trim()].filter(Boolean).join(" ")}>
      <div className="ui-workspace__inputs">{inputs}</div>
      <div className="ui-workspace__results">{results}</div>
    </div>
  );
}

export interface FieldGroupProps {
  readonly title?: ComponentChildren;
  readonly description?: ComponentChildren;
  readonly className?: string;
  readonly children: ComponentChildren;
}

/** Structured vertical stack of calculator form controls with optional section heading. */
export function FieldGroup({
  title,
  description,
  className = "",
  children,
}: FieldGroupProps): JSX.Element {
  return (
    <div className={["ui-field-group", className.trim()].filter(Boolean).join(" ")}>
      {title && <h3 className="ui-field-group__title">{title}</h3>}
      {description && <p className="ui-field-group__description">{description}</p>}
      <div className="ui-field-group__fields">{children}</div>
    </div>
  );
}

export interface FieldRowProps {
  readonly className?: string;
  readonly children: ComponentChildren;
}

/** Responsive two-column pair of related inputs collapsing cleanly on mobile. */
export function FieldRow({
  className = "",
  children,
}: FieldRowProps): JSX.Element {
  return (
    <div className={["ui-field-row", className.trim()].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

export interface LawReferenceBarProps {
  readonly label?: string;
  readonly className?: string;
  readonly children: ComponentChildren;
}

/** Quiet statutory reference strip aligned beneath calculator breakdown cards. */
export function LawReferenceBar({
  label = "Statutory basis:",
  className = "",
  children,
}: LawReferenceBarProps): JSX.Element {
  return (
    <div className={["ui-law-bar", className.trim()].filter(Boolean).join(" ")}>
      {label && <span className="ui-law-bar__label">{label}</span>}
      {children}
    </div>
  );
}
