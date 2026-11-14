import "./LawRefLink.css";
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
 * Strongly-typed clickable statutory reference (`§`) that opens the unified Law Reference popup.
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
  const resolvedLabel = label ?? entry?.citation ?? group?.citationLabel ?? "";
  const resolvedTitle = title ?? `Open statutory reference: ${entry?.title ?? group?.title ?? resolvedLabel}`;
  const classes = [
    "law-ref-link",
    variant === "badge" ? "law-ref-link--badge" : "",
    className,
  ].filter(Boolean).join(" ");

  const handleClick = (): void => {
    if (lawId) {
      openLawReference(lawId, groupId);
    }
    else if (groupId) {
      openLawGroupReference(groupId);
    }
  };

  return (
    <button
      type="button"
      className={classes}
      title={resolvedTitle}
      aria-label={resolvedTitle}
      onClick={handleClick}
    >
      {showIcon && <StatutorySectionIcon size={variant === "badge" ? 11 : 13} />}
      <span>{resolvedLabel}</span>
    </button>
  );
}
