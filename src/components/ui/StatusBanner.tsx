import "./UnifiedControls.css";
import type {
  ComponentChildren,
  JSX,
} from "preact";
import {
  EligibilityConfirmedIcon,
  InformationalNoticeIcon,
  StatutoryLimitationWarningIcon,
} from "#components/Icons";
import {
  BannerTone,
  bannerRoleForTone,
  statusBannerClassName,
} from "#utils/uiHelpers";

export {
  BannerTone,
};

export interface StatusBannerProps {
  readonly tone?: BannerTone;
  readonly title?: ComponentChildren;
  readonly icon?: ComponentChildren;
  readonly actions?: ComponentChildren;
  readonly compact?: boolean;
  readonly children?: ComponentChildren;
  readonly className?: string;
}

function defaultBannerIcon(tone: BannerTone): JSX.Element {
  if (tone === BannerTone.Success) {
    return <EligibilityConfirmedIcon size={16} />;
  }
  if (tone === BannerTone.Warning || tone === BannerTone.Danger) {
    return <StatutoryLimitationWarningIcon size={16} />;
  }
  return <InformationalNoticeIcon size={16} />;
}

/** Shared inline status and warning banner mapped to semantic surface, border, and ARIA roles. */
export function StatusBanner({
  tone = BannerTone.Info,
  title,
  icon,
  actions,
  compact = false,
  children,
  className = "",
}: StatusBannerProps): JSX.Element {
  const renderedIcon = icon === undefined ? defaultBannerIcon(tone) : icon;

  return (
    <div
      className={[statusBannerClassName(tone, compact), className.trim()].filter(Boolean).join(" ")}
      role={bannerRoleForTone(tone)}
    >
      {renderedIcon !== null && (
        <span className="ui-status-banner__icon" aria-hidden="true">
          {renderedIcon}
        </span>
      )}
      <div className="ui-status-banner__content">
        {title && <p className="ui-status-banner__title">{title}</p>}
        {children && <div className="ui-status-banner__body">{children}</div>}
      </div>
      {actions && (
        <div className="ui-status-banner__actions">
          {actions}
        </div>
      )}
    </div>
  );
}
