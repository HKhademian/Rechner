import "./UnifiedControls.css";
import {
  useEffect,
  useRef,
} from "preact/hooks";
import type {
  ComponentChildren,
  JSX,
} from "preact";

/** Horizontal anchor alignment for popover panels. */
export const PopoverAlign = {
  Left: "left",
  Right: "right",
} as const;
export type PopoverAlign = (typeof PopoverAlign)[keyof typeof PopoverAlign];

export interface PopoverMenuProps {
  readonly summary: ComponentChildren;
  readonly summaryAriaLabel?: string;
  readonly summaryClassName?: string;
  readonly panelAriaLabel: string;
  readonly align?: PopoverAlign;
  readonly className?: string;
  readonly panelClassName?: string;
  readonly children: ComponentChildren;
}

/**
 * Shared dismissible `<details>` popover handling outside-pointer, focus-out, and Escape
 * key dismissal with focus return to the trigger summary.
 */
export function PopoverMenu({
  summary,
  summaryAriaLabel,
  summaryClassName = "",
  panelAriaLabel,
  align = PopoverAlign.Right,
  className = "",
  panelClassName = "",
  children,
}: PopoverMenuProps): JSX.Element {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeWhenOutside = (event: Event): void => {
      if (!(event.target instanceof Node)) {
        return;
      }
      const details = detailsRef.current;
      if (details?.open && !details.contains(event.target)) {
        details.open = false;
      }
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }
      const details = detailsRef.current;
      if (details?.open) {
        details.open = false;
        details.querySelector("summary")?.focus();
      }
    };

    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("focusin", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("focusin", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const rootClasses = ["ui-popover", className.trim()].filter(Boolean).join(" ");
  const panelClasses = [
    "ui-popover__panel",
    align === PopoverAlign.Left ? "ui-popover__panel--left" : "ui-popover__panel--right",
    panelClassName.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <details ref={detailsRef} className={rootClasses}>
      <summary
        className={summaryClassName.trim() || undefined}
        aria-label={summaryAriaLabel}
      >
        {summary}
      </summary>
      <div className={panelClasses} role="region" aria-label={panelAriaLabel}>
        {children}
      </div>
    </details>
  );
}
