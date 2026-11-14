import "./LawRefLink.css";
import {
  lawDetailPath,
} from "#/apps/appDefinition.ts";
import {
  StatutorySectionIcon,
} from "#components/Icons";
import {
  getLawEntry,
  getLawGroupEntry,
} from "#engine/laws/registry";
import {
  type LawGroupId,
  type LawId,
} from "#engine/laws/types";
import {
  isPlainPrimaryClick,
  openLawGroupReference,
  openLawReference,
} from "#store/lawReferenceStore";
import type {
  ComponentChildren,
  JSX,
} from "preact";

export type LawRefLinkProps = (
  | {
    readonly lawId: LawId;
    readonly groupId?: LawGroupId;
  }
  | {
    readonly lawId?: LawId;
    readonly groupId: LawGroupId;
  }
) & {
  readonly label?: string;
  readonly variant?: "inline" | "badge" | "plain";
  readonly showIcon?: boolean;
  readonly className?: string;
  readonly style?: JSX.CSSProperties;
  readonly title?: string;
  readonly children?: ComponentChildren;
  readonly onOpen?: () => void;
};

/**
 * Strongly-typed statutory reference (`§`) rendered as a semantic anchor:
 * - Plain click opens the compact Quick-Reference Popup.
 * - Ctrl+Click / Cmd+Click / Middle-Click opens the dedicated Full Law Page.
 */
export default function LawRefLink({
  lawId,
  groupId,
  label,
  variant = "inline",
  showIcon = true,
  className = "",
  style,
  title,
  children,
  onOpen,
}: LawRefLinkProps): JSX.Element {
  const entry = lawId ? getLawEntry(lawId) : undefined;
  const group = groupId ? getLawGroupEntry(groupId) : undefined;
  const targetLawId = lawId ?? group?.primaryLawId;
  const resolvedLabel = label ?? entry?.citation ?? group?.citationLabel ?? "";
  const resolvedTitle = title ??
    `${entry?.title ?? group?.title ?? resolvedLabel} — Click for quick popup · Ctrl+Click for full page`;
  const href = targetLawId ? lawDetailPath(targetLawId, groupId) : "#";
  const variantClass = variant === "badge"
    ? "law-ref-link--badge"
    : variant === "plain"
      ? "law-ref-link--plain"
      : "";
  const classes = [
    "law-ref-link",
    variantClass,
    className,
  ].filter(Boolean).join(" ");

  const handleClick = (event: JSX.TargetedMouseEvent<HTMLAnchorElement>): void => {
    if (!isPlainPrimaryClick(event)) {
      return;
    }
    event.preventDefault();
    onOpen?.();
    if (lawId) {
      openLawReference(lawId, groupId);
    }
    else if (groupId) {
      openLawGroupReference(groupId);
    }
  };

  return (
    <a
      href={href}
      className={classes}
      style={style}
      title={resolvedTitle}
      aria-label={resolvedTitle}
      onClick={handleClick}
    >
      {children ?? (
        <>
          {showIcon && <StatutorySectionIcon size={variant === "badge" ? 11 : 13} />}
          <span>{resolvedLabel}</span>
        </>
      )}
    </a>
  );
}
