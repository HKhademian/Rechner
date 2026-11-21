import "./UnifiedControls.css";
import type {
  ComponentChildren,
  JSX,
} from "preact";

export interface EmptyStateProps {
  readonly title: string;
  readonly description?: ComponentChildren;
  readonly actions?: ComponentChildren;
  readonly className?: string;
}

/** Shared empty state surface for filtered catalogs, tables, and lists. */
export function EmptyState({
  title,
  description,
  actions,
  className = "",
}: EmptyStateProps): JSX.Element {
  return (
    <div className={["ui-card ui-empty-state", className.trim()].filter(Boolean).join(" ")}>
      <h3 className="ui-empty-state__title">{title}</h3>
      {description && <p className="ui-empty-state__description">{description}</p>}
      {actions && <div className="ui-empty-state__actions">{actions}</div>}
    </div>
  );
}
