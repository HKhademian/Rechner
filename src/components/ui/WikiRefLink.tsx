import "./WikiRefLink.css";
import {
  useEffect,
  useRef,
  useState,
} from "preact/hooks";
import type {
  ComponentChildren,
  JSX,
} from "preact";
import {
  DismissIcon,
} from "#components/Icons";
import {
  Badge,
} from "#components/ui/Badge";
import {
  type WikiRefTarget,
  WikiRefKind,
  resolveWikiRef,
} from "#/components/ui/wikiRefResolver.ts";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";
import {
  activeParameterYear,
  customParameterOverrides,
} from "#store/parameterStore";
import {
  isPlainPrimaryClick,
} from "#store/lawReferenceStore";
import {
  DEFAULT_TAX_YEAR,
} from "#engine/tax/taxRules";
import {
  toFullCalendarYear,
} from "#engine/types";

export {
  type WikiEntryView,
  type WikiRefTarget,
  type WikiRelatedLink,
  WikiRefKind,
  resolveWikiRef,
  toWikiRefKind,
} from "#/components/ui/wikiRefResolver.ts";

export interface WikiRefLinkProps {
  readonly target: WikiRefTarget;
  readonly alignEnd?: boolean;
  readonly className?: string;
  readonly children?: ComponentChildren;
}

const HOVER_OPEN_DELAY_MS = 160;
const HOVER_CLOSE_DELAY_MS = 200;

/**
 * Whisper-quiet inline cross-linked reference for Laws, Topics, Constants/Parameters, and Formulas.
 * Renders as calm prose with a subtle dotted underline; hovering or tapping opens a floating
 * cross-linked preview card while Ctrl/Cmd+Click navigates directly to the full reference page.
 */
export function WikiRefLink({
  target,
  alignEnd = false,
  className = "",
  children,
}: WikiRefLinkProps): JSX.Element {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [history, setHistory] = useState<readonly WikiRefTarget[]>([]);
  const [currentTarget, setCurrentTarget] = useState<WikiRefTarget>(target);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const year = hydrated ? activeParameterYear.value : toFullCalendarYear(DEFAULT_TAX_YEAR);
  const overrides = hydrated ? customParameterOverrides.value : {};
  const rootEntry = resolveWikiRef(target, year, overrides);
  const activeEntry = open ? resolveWikiRef(currentTarget, year, overrides) : rootEntry;

  const clearTimers = (): void => {
    if (openTimerRef.current !== null) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const closeCard = (): void => {
    clearTimers();
    setOpen(false);
    setPinned(false);
    setHistory([]);
    setCurrentTarget(target);
  };

  useEffect(() => {
    setCurrentTarget(target);
    setHistory([]);
  }, [target.kind, target.id]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleOutside = (event: Event): void => {
      if (!(event.target instanceof Node)) {
        return;
      }
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        closeCard();
      }
    };
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        closeCard();
      }
    };
    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useEffect(() => () => clearTimers(), []);

  if (!rootEntry) {
    return <span>{children}</span>;
  }

  const handleMouseEnter = (): void => {
    if (pinned) {
      return;
    }
    clearTimers();
    openTimerRef.current = setTimeout(() => {
      setCurrentTarget(target);
      setHistory([]);
      setOpen(true);
    }, HOVER_OPEN_DELAY_MS);
  };

  const handleMouseLeave = (): void => {
    if (pinned) {
      return;
    }
    clearTimers();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
    }, HOVER_CLOSE_DELAY_MS);
  };

  const handleTriggerClick = (event: JSX.TargetedMouseEvent<HTMLAnchorElement>): void => {
    if (!isPlainPrimaryClick(event)) {
      return;
    }
    event.preventDefault();
    clearTimers();
    if (open && pinned) {
      closeCard();
      return;
    }
    setCurrentTarget(target);
    setHistory([]);
    setPinned(true);
    setOpen(true);
  };

  const jumpToRelated = (next: WikiRefTarget): void => {
    setPinned(true);
    setHistory((prev) => [...prev, currentTarget]);
    setCurrentTarget(next);
  };

  const navigateBack = (): void => {
    setHistory((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const nextHistory = prev.slice(0, -1);
      const previousTarget = prev[prev.length - 1];
      setCurrentTarget(previousTarget);
      return nextHistory;
    });
  };

  const triggerClasses = ["ui-wiki-ref", className.trim()].filter(Boolean).join(" ");
  const peekClasses = [
    "ui-wiki-peek",
    alignEnd ? "ui-wiki-peek--align-end" : "",
  ].filter(Boolean).join(" ");

  return (
    <span
      ref={wrapRef}
      className="ui-wiki-ref-wrap"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <a
        href={rootEntry.href}
        className={triggerClasses}
        aria-expanded={open}
        title={`${rootEntry.title} — Hover or click to peek · Ctrl+Click for full page`}
        onClick={handleTriggerClick}
      >
        {children ?? rootEntry.title}
      </a>

      {open && activeEntry && (
        <span className={peekClasses} role="dialog" aria-label={activeEntry.title}>
          <span className="ui-wiki-peek__top">
            <span className="ui-wiki-peek__nav">
              {history.length > 0 && (
                <button
                  type="button"
                  className="ui-wiki-peek__back"
                  onClick={navigateBack}
                >
                  ← Back
                </button>
              )}
              <Badge tone={activeEntry.tone}>{activeEntry.eyebrow}</Badge>
            </span>
            <button
              type="button"
              className="ui-wiki-peek__close"
              aria-label="Close reference"
              onClick={closeCard}
            >
              <DismissIcon size={13} />
            </button>
          </span>

          <span className="ui-wiki-peek__title">{activeEntry.title}</span>

          {activeEntry.valueLine && (
            <span className="ui-wiki-peek__value">{activeEntry.valueLine}</span>
          )}

          <span className="ui-wiki-peek__summary">{activeEntry.summary}</span>

          {activeEntry.related.length > 0 && (
            <>
              <span className="ui-wiki-peek__related-label">Cross-linked references</span>
              <span className="ui-wiki-peek__related-list">
                {activeEntry.related.map((item) => (
                  <button
                    key={`${item.target.kind}:${item.target.id}`}
                    type="button"
                    className="ui-wiki-peek__chip"
                    onClick={() => jumpToRelated(item.target)}
                  >
                    {item.label}
                  </button>
                ))}
              </span>
            </>
          )}

          <span className="ui-wiki-peek__footer">
            <span>{activeEntry.kind === WikiRefKind.Parameter ? "Editable in Parameters" : "Rechner reference"}</span>
            <a href={activeEntry.href} className="ui-wiki-peek__link">
              Open full page →
            </a>
          </span>
        </span>
      )}
    </span>
  );
}
