import "./UnifiedControls.css";
import type {
  ComponentChildren,
  JSX,
} from "preact";

import {
  ButtonSize,
  ButtonType,
  ButtonVariant,
  buttonClassName,
} from "#utils/uiHelpers";

export {
  ButtonSize,
  ButtonType,
  ButtonVariant,
  buttonClassName,
};

export interface ButtonProps {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly type?: ButtonType;
  readonly disabled?: boolean;
  readonly active?: boolean;
  readonly title?: string;
  readonly ariaLabel?: string;
  readonly ariaControls?: string;
  readonly ariaExpanded?: boolean;
  readonly ariaCurrent?: "page" | "step" | "location" | "date" | "time" | true | false;
  readonly className?: string;
  readonly onClick?: (event: JSX.TargetedMouseEvent<HTMLButtonElement>) => void;
  readonly children: ComponentChildren;
}

/** Canonical button primitive enforcing shared height, typography, focus ring, and variants. */
export function Button({
  variant = ButtonVariant.Secondary,
  size = ButtonSize.Md,
  type = ButtonType.Button,
  disabled = false,
  active,
  title,
  ariaLabel,
  ariaControls,
  ariaExpanded,
  ariaCurrent,
  className = "",
  onClick,
  children,
}: ButtonProps): JSX.Element {
  return (
    <button
      type={type}
      className={buttonClassName(variant, size, className)}
      disabled={disabled}
      aria-pressed={active}
      title={title}
      aria-label={ariaLabel}
      aria-controls={ariaControls}
      aria-expanded={ariaExpanded}
      aria-current={ariaCurrent}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export interface LinkButtonProps {
  readonly href: string;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly title?: string;
  readonly ariaLabel?: string;
  readonly target?: string;
  readonly rel?: string;
  readonly className?: string;
  readonly onClick?: (event: JSX.TargetedMouseEvent<HTMLAnchorElement>) => void;
  readonly children: ComponentChildren;
}

/** Anchor link styled identically to the shared `Button` primitive. */
export function LinkButton({
  href,
  variant = ButtonVariant.Secondary,
  size = ButtonSize.Md,
  title,
  ariaLabel,
  target,
  rel,
  className = "",
  onClick,
  children,
}: LinkButtonProps): JSX.Element {
  return (
    <a
      href={href}
      className={buttonClassName(variant, size, className)}
      title={title}
      aria-label={ariaLabel}
      target={target}
      rel={rel}
      onClick={onClick}
    >
      {children}
    </a>
  );
}
