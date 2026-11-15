import type {
  ComponentChildren,
  JSX,
} from "preact";
import {
  MetricTone,
  metricToneClass,
} from "#utils/metricTone";

export {
  MetricTone,
};

export interface MetricBreakdownItem {
  readonly label: string;
  readonly value: string;
  readonly tone?: MetricTone;
}

export interface MetricCardProps {
  readonly label: string;
  readonly value: string;
  readonly subtitle?: string;
  readonly tone?: MetricTone;
  readonly highlight?: boolean;
  readonly accentColor?: string;
  readonly breakdown?: readonly MetricBreakdownItem[];
  readonly footer?: ComponentChildren;
}

/**
 * Shared institutional KPI card for headline metrics, itemized sub-values, and comparison footers.
 */
export function MetricCard({
  label,
  value,
  subtitle,
  tone = MetricTone.Neutral,
  highlight = false,
  accentColor,
  breakdown = [],
  footer,
}: MetricCardProps): JSX.Element {
  return (
    <article
      className={metricToneClass(tone, highlight)}
      style={accentColor ? { borderLeftColor: accentColor } : undefined}
    >
      <div className="ui-metric-card__label">{label}</div>
      {subtitle && <p className="ui-metric-card__subtitle">{subtitle}</p>}
      <div className="ui-metric-card__value tabular-nums">{value}</div>
      {breakdown.length > 0 && (
        <div className="ui-metric-card__breakdown">
          {breakdown.map((item) => (
            <span key={item.label} className="ui-metric-card__item">
              <span>{item.label}: </span>
              <strong
                className={`tabular-nums${item.tone ? ` ui-metric-card__item-value--${item.tone}` : ""}`}
              >
                {item.value}
              </strong>
            </span>
          ))}
        </div>
      )}
      {footer && <div className="ui-metric-card__footer">{footer}</div>}
    </article>
  );
}
