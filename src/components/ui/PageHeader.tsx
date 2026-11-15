import "./UnifiedControls.css";
import type {
  ComponentChildren,
  JSX,
} from "preact";

export interface PageHeaderMetaItem {
  readonly label: string;
  readonly value: string;
}

export interface PageHeaderProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly actions?: ComponentChildren;
  readonly meta?: readonly PageHeaderMetaItem[];
  readonly metaLabel?: string;
}

/** Shared institutional header rhythm across Home, calculators, and Laws. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  meta,
  metaLabel = "Summary details",
}: PageHeaderProps): JSX.Element {
  return (
    <header className="ui-page-header">
      <div className="ui-page-header__intro">
        {eyebrow && <p className="ui-page-header__eyebrow">{eyebrow}</p>}
        <h1 className="ui-page-header__title">{title}</h1>
        {subtitle && <p className="ui-page-header__subtitle">{subtitle}</p>}
      </div>
      {(actions || (meta && meta.length > 0)) && (
        <div className="ui-page-header__aside">
          {actions && <div className="ui-page-header__actions">{actions}</div>}
          {meta && meta.length > 0 && (
            <dl className="ui-page-header__meta" aria-label={metaLabel}>
              {meta.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </header>
  );
}
