import "./UnifiedControls.css";
import type {
  ComponentChildren,
  JSX,
} from "preact";
import {
  ChevronDownIcon,
} from "#components/Icons";

export interface DisclosureProps {
  readonly title: ComponentChildren;
  readonly meta?: ComponentChildren;
  readonly defaultOpen?: boolean;
  readonly subtle?: boolean;
  readonly className?: string;
  readonly children: ComponentChildren;
}

/**
 * Progressive-disclosure container keeping secondary options and statutory overrides
 * collapsed cleanly until needed.
 */
export function Disclosure({
  title,
  meta,
  defaultOpen = false,
  subtle = false,
  className = "",
  children,
}: DisclosureProps): JSX.Element {
  const classes = [
    "ui-disclosure",
    subtle ? "ui-disclosure--subtle" : "",
    className.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <details className={classes} open={defaultOpen}>
      <summary className="ui-disclosure__summary">
        <span className="ui-disclosure__title">{title}</span>
        <span className="ui-disclosure__aside">
          {meta && <span className="ui-disclosure__meta">{meta}</span>}
          <ChevronDownIcon size={14} className="ui-disclosure__chevron" />
        </span>
      </summary>
      <div className="ui-disclosure__body">{children}</div>
    </details>
  );
}
