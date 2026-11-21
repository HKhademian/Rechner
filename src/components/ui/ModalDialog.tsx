import "./UnifiedControls.css";
import {
  useId,
  useLayoutEffect,
  useRef,
} from "preact/hooks";
import type {
  ComponentChildren,
  JSX,
} from "preact";
import {
  CloseIcon,
} from "#components/Icons";
import {
  ModalDialogSize,
  lockBodyScroll,
  modalDialogCardClassName,
} from "#utils/uiHelpers";

export {
  ModalDialogSize,
};

export interface ModalDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly id?: string;
  readonly title: ComponentChildren;
  readonly subtitle?: ComponentChildren;
  readonly eyebrow?: ComponentChildren;
  readonly size?: ModalDialogSize;
  readonly footer?: ComponentChildren;
  readonly children: ComponentChildren;
  readonly ariaLabel?: string;
  readonly closeLabel?: string;
  readonly className?: string;
}

/** Accessible modal dialog shell with backdrop dismiss, Escape handling, body scroll lock, and standardized header/footer. */
export function ModalDialog({
  open,
  onClose,
  id,
  title,
  subtitle,
  eyebrow,
  size = ModalDialogSize.Medium,
  footer,
  children,
  ariaLabel,
  closeLabel = "Close dialog",
  className = "",
}: ModalDialogProps): JSX.Element | null {
  const headingId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    if (!open || typeof document === "undefined") {
      return undefined;
    }
    const unlockScroll = lockBodyScroll(
      document,
      typeof window !== "undefined" && typeof window.getComputedStyle === "function"
        ? (body) => window.getComputedStyle(body).paddingRight
        : undefined,
    );

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      unlockScroll();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      id={id}
      className="ui-modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabel ? undefined : headingId}
      aria-label={ariaLabel}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={[modalDialogCardClassName(size), className.trim()].filter(Boolean).join(" ")}
      >
        <div className="ui-modal__header">
          <div className="ui-modal__title-wrap">
            {eyebrow && <p className="ui-modal__eyebrow">{eyebrow}</p>}
            <h2 id={headingId} className="ui-modal__title">
              {title}
            </h2>
            {subtitle && <p className="ui-modal__subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="ui-modal__close"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="ui-modal__body">
          {children}
        </div>

        {footer && (
          <div className="ui-modal__footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
