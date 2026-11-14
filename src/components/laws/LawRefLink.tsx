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
  readonly variant?: "inline" | "badge";
  readonly showIcon?: boolean;
  readonly className?: string;
  readonly title?: string;
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
  title,
}: LawRefLinkProps): JSX.Element {
  const entry = lawId ? getLawEntry(lawId) : undefined;
  const group = groupId ? getLawGroupEntry(groupId) : undefined;
  const targetLawId = lawId ?? group?.primaryLawId;
  const resolvedLabel = label ?? entry?.citation ?? group?.citationLabel ?? "";
  const resolvedTitle = title ??
    `${entry?.title ?? group?.title ?? resolvedLabel} — Click for quick popup · Ctrl+Click for full page`;
  const href = targetLawId ? lawDetailPath(targetLawId, groupId) : "#";
  const classes = [
    "law-ref-link",
    variant === "badge" ? "law-ref-link--badge" : "",
    className,
  ].filter(Boolean).join(" ");

  const handleClick = (event: JSX.TargetedMouseEvent<HTMLAnchorElement>): void => {
    if (!isPlainPrimaryClick(event)) {
      return;
    }
    event.preventDefault();
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
      title={resolvedTitle}
      aria-label={resolvedTitle}
      onClick={handleClick}
    >
      {showIcon && <StatutorySectionIcon size={variant === "badge" ? 11 : 13} />}
      <span>{resolvedLabel}</span>
    </a>
  );
}
