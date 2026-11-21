import "./UnifiedControls.css";
import type {
  ComponentChildren,
  JSX,
} from "preact";

/** Semantic container element choices for `Card`. */
export const CardElement = {
  Section: "section",
  Article: "article",
  Div: "div",
} as const;
export type CardElement = (typeof CardElement)[keyof typeof CardElement];

/** Surface density presets for `Card`. */
export const CardPadding = {
  Compact: "compact",
  Default: "default",
} as const;
export type CardPadding = (typeof CardPadding)[keyof typeof CardPadding];

export interface CardProps {
  readonly as?: CardElement;
  readonly padding?: CardPadding;
  readonly interactive?: boolean;
  readonly muted?: boolean;
  readonly ariaLabelledBy?: string;
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly children: ComponentChildren;
}

/** Shared surface container honoring active Swiss, Editorial, or Utility style tokens. */
export function Card({
  as = CardElement.Section,
  padding = CardPadding.Default,
  interactive = false,
  muted = false,
  ariaLabelledBy,
  ariaLabel,
  className = "",
  children,
}: CardProps): JSX.Element {
  const classes = [
    "ui-card",
    padding === CardPadding.Compact ? "ui-card--compact" : "",
    interactive ? "ui-card--interactive" : "",
    muted ? "ui-card--muted" : "",
    className.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  if (as === CardElement.Article) {
    return (
      <article
        className={classes}
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabel}
      >
        {children}
      </article>
    );
  }
  if (as === CardElement.Div) {
    return (
      <div
        className={classes}
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabel}
      >
        {children}
      </div>
    );
  }
  return (
    <section
      className={classes}
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabel}
    >
      {children}
    </section>
  );
}

export interface CardHeaderProps {
  readonly title: ComponentChildren;
  readonly subtitle?: ComponentChildren;
  readonly headingId?: string;
  readonly actions?: ComponentChildren;
  readonly className?: string;
}

/** Shared card header pairing title, optional subtitle, and right-aligned utility actions. */
export function CardHeader({
  title,
  subtitle,
  headingId,
  actions,
  className = "",
}: CardHeaderProps): JSX.Element {
  return (
    <div className={["ui-card__header", className.trim()].filter(Boolean).join(" ")}>
      <div className="ui-card__heading">
        <h2 id={headingId} className="ui-card__title">{title}</h2>
        {subtitle && <p className="ui-card__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="ui-card__actions">{actions}</div>}
    </div>
  );
}
