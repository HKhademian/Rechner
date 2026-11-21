import "./UnifiedControls.css";
import type {
  ComponentChildren,
  JSX,
} from "preact";

import {
  BadgeTone,
  badgeClassName,
} from "#utils/uiHelpers";

export {
  BadgeTone,
  badgeClassName,
};

export interface BadgeProps {
  readonly tone?: BadgeTone;
  readonly title?: string;
  readonly className?: string;
  readonly children: ComponentChildren;
}

/** Compact semantic pill/chip badge for financial deltas, categories, and statutory tags. */
export function Badge({
  tone = BadgeTone.Neutral,
  title,
  className = "",
  children,
}: BadgeProps): JSX.Element {
  return (
    <span className={badgeClassName(tone, className)} title={title}>
      {children}
    </span>
  );
}
