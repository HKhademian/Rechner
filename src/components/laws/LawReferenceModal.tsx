import "./LawReferenceModal.css";
import {
  InlineContent, 
} from "#components/topics/InlineContent";
import {
  topicPath, 
} from "#utils/topicPath";
import {
  lawDetailPath,
} from "#/apps/appDefinition.ts";
import {
  CloseIcon,
  ExternalLegalSourceIcon,
  LawAntiBenefitCaveatIcon,
  LawBenefitAdvantageIcon,
  NavigatePreviousLawIcon,
  ParameterSlidersIcon,
  StatutorySectionIcon,
} from "#components/Icons";
import {
  getExternalSourceEntries,
  getLawEntry,
  getLawGroupEntry,
  getLawsReferencing,
  getRelatedLaws,
} from "#engine/laws/registry";
import {
  topicsForLaw,
} from "#engine/topics/registry";
import {
  LAW_TAG_LABELS,
  isLawGroupId,
  isLawId,
} from "#engine/laws/types";
import {
  getParametersByLaw,
} from "#engine/parameters/registry";
import {
  activeLawModalState,
  closeLawReference,
  isPlainPrimaryClick,
  navigateLawHistoryBack,
  navigateToRelatedLaw,
  openLawGroupReference,
  openLawReference,
} from "#store/lawReferenceStore";
import type {
  JSX,
} from "preact";
import {
  createPortal,
} from "preact/compat";
import {
  useEffect,
  useRef,
} from "preact/hooks";

/**
 * Compact Quick-Reference Law Popup.
 * Shows only high-signal essentials (summary, benefit/caveat, tags, compact cross-ref chips,
 * and external links) with a prominent link to the dedicated Full Law Reference Page.
 */
export default function LawReferenceModal(): JSX.Element | null {
  const modalState = activeLawModalState.value;
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent): void => {
      if (event.defaultPrevented || !isPlainPrimaryClick(event)) {
        return;
      }
      const target = event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("a[data-law-ref-id], a[data-law-ref-group]")
        : null;
      if (!target) {
        return;
      }
      const rawLawId = target.dataset.lawRefId;
      const rawGroupId = target.dataset.lawRefGroup;
      const resolvedLawId = rawLawId && isLawId(rawLawId) ? rawLawId : undefined;
      const resolvedGroupId = rawGroupId && isLawGroupId(rawGroupId) ? rawGroupId : undefined;
      if (!resolvedLawId && !resolvedGroupId) {
        return;
      }
      event.preventDefault();
      if (resolvedLawId) {
        openLawReference(resolvedLawId, resolvedGroupId);
      }
      else if (resolvedGroupId) {
        openLawGroupReference(resolvedGroupId);
      }
    };

    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (modalState && !dialog.open && typeof dialog.showModal === "function") {
      dialog.showModal();
    }
    else if (!modalState && dialog.open && typeof dialog.close === "function") {
      dialog.close();
    }
  }, [modalState]);

  if (!modalState) {
    return null;
  }

  const entry = getLawEntry(modalState.currentLawId);
  const activeGroup = modalState.activeGroupId
    ? getLawGroupEntry(modalState.activeGroupId)
    : undefined;
  const outgoingRefs = getRelatedLaws(entry.id);
  const incomingRefs = getLawsReferencing(entry.id);
  const seenCrossRefIds = new Set(outgoingRefs.map((ref) => ref.law.id));
  const combinedCrossRefs = [
    ...outgoingRefs.map((ref) => ref.law),
    ...incomingRefs.map((ref) => ref.law).filter((law) => {
      if (seenCrossRefIds.has(law.id)) {
        return false;
      }
      seenCrossRefIds.add(law.id);
      return true;
    }),
  ];
  const externalSources = getExternalSourceEntries(entry);
  const governedParameterCount = getParametersByLaw(entry.id).length;
  const fullPageHref = lawDetailPath(entry.id, activeGroup?.id);

  const dialogContent = (
    <dialog
      ref={dialogRef}
      className="law-reference-dialog"
      aria-labelledby="law-reference-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        closeLawReference();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          closeLawReference();
        }
      }}
    >
      <div className="law-reference-dialog__surface">
        <header className="law-reference-dialog__header">
          <div>
            <div className="law-reference-dialog__header-meta">
              <span className="law-reference-dialog__citation-pill">
                <StatutorySectionIcon size={12} />
                <span>{entry.citation}</span>
              </span>
              <span className="law-reference-dialog__code-pill">{entry.code}</span>
              {activeGroup && (
                <span className="law-reference-dialog__code-pill">
                  {activeGroup.title}
                </span>
              )}
            </div>
            <h2 id="law-reference-dialog-title" className="law-reference-dialog__title">
              {entry.title}
            </h2>
          </div>

          <div className="law-reference-dialog__header-actions">
            {modalState.history.length > 0 && (
              <button
                type="button"
                className="law-reference-dialog__icon-btn"
                onClick={navigateLawHistoryBack}
                aria-label="Back to previous law reference"
              >
                <NavigatePreviousLawIcon size={14} />
                <span>Back</span>
              </button>
            )}
            <a
              href={fullPageHref}
              className="law-reference-dialog__icon-btn law-reference-dialog__icon-btn--primary"
              title="Open dedicated full law page (parameters, formulas & full graph)"
              onClick={(event) => {
                if (isPlainPrimaryClick(event)) {
                  closeLawReference();
                }
              }}
            >
              <span>Full page</span>
              <ExternalLegalSourceIcon size={12} />
            </a>
            <button
              type="button"
              className="law-reference-dialog__icon-btn"
              onClick={closeLawReference}
              aria-label="Close law reference"
              autoFocus
            >
              <CloseIcon size={14} />
              <span>Close</span>
            </button>
          </div>
        </header>

        <div className="law-reference-dialog__body">
          {modalState.context && <section className="law-reference-dialog__context" aria-label={modalState.context.title}>
            <h3>{modalState.context.title}</h3>
            <p><InlineContent text={modalState.context.description} /></p>
            <p><strong>In this calculator:</strong> <InlineContent text={modalState.context.calculatorEffect} /></p>
            {modalState.context.topicId && <a href={topicPath(modalState.context.topicId)}>Explore this topic →</a>}
          </section>}
          <p className="law-reference-dialog__summary">{entry.summary}</p>

          {(entry.benefit || entry.antiBenefit) && (
            <div className="law-reference-dialog__tradeoffs">
              {entry.benefit && (
                <div className="law-reference-dialog__callout law-reference-dialog__callout--benefit">
                  <div className="law-reference-dialog__callout-label">
                    <LawBenefitAdvantageIcon size={13} />
                    <span>Benefit</span>
                  </div>
                  <p>{entry.benefit}</p>
                </div>
              )}
              {entry.antiBenefit && (
                <div className="law-reference-dialog__callout law-reference-dialog__callout--anti-benefit">
                  <div className="law-reference-dialog__callout-label">
                    <LawAntiBenefitCaveatIcon size={13} />
                    <span>Limitation</span>
                  </div>
                  <p>{entry.antiBenefit}</p>
                </div>
              )}
            </div>
          )}

          {topicsForLaw(entry.id).length > 0 && <div className="law-reference-dialog__crossrefs">
            <span className="law-reference-dialog__micro-label">Understand topics:</span>
            <div className="law-reference-dialog__chips">
              {topicsForLaw(entry.id).map((topic) => <a className="law-reference-dialog__chip" href={topicPath(topic.id)} key={topic.id}>{topic.title}</a>)}
            </div>
          </div>}
          {entry.tags.length > 0 && (
            <div className="law-reference-dialog__tags" aria-label="Law tags">
              {entry.tags.map((tag) => (
                <span key={tag} className="law-reference-dialog__tag-pill">
                  {LAW_TAG_LABELS[tag]}
                </span>
              ))}
            </div>
          )}

          {combinedCrossRefs.length > 0 && (
            <div className="law-reference-dialog__crossrefs">
              <span className="law-reference-dialog__micro-label">Related:</span>
              <div className="law-reference-dialog__chips">
                {combinedCrossRefs.map((law) => (
                  <a
                    key={law.id}
                    href={lawDetailPath(law.id)}
                    className="law-reference-dialog__chip"
                    title={`${law.title} — Click to preview · Ctrl+Click for full page`}
                    onClick={(event) => {
                      if (!isPlainPrimaryClick(event)) {
                        return;
                      }
                      event.preventDefault();
                      navigateToRelatedLaw(law.id);
                    }}
                  >
                    <StatutorySectionIcon size={11} />
                    <span>{law.citation}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="law-reference-dialog__footer">
          <div className="law-reference-dialog__footer-links">
            {governedParameterCount > 0 && (
              <a
                href={fullPageHref}
                className="law-reference-dialog__footer-meta-link"
                onClick={(event) => {
                  if (isPlainPrimaryClick(event)) {
                    closeLawReference();
                  }
                }}
              >
                <ParameterSlidersIcon size={12} />
                <span>
                  {governedParameterCount} governed{" "}
                  {governedParameterCount === 1 ? "value" : "values"}
                </span>
              </a>
            )}
            {externalSources.map((source) => (
              <a
                key={source.sourceId}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="law-reference-dialog__footer-source-link"
              >
                <span>{source.label}</span>
                <ExternalLegalSourceIcon size={11} />
              </a>
            ))}
          </div>
          <a
            href={fullPageHref}
            className="ui-btn ui-btn--sm ui-btn--primary"
            onClick={(event) => {
              if (isPlainPrimaryClick(event)) {
                closeLawReference();
              }
            }}
          >
            <span>Open full law page →</span>
          </a>
        </footer>
      </div>
    </dialog>
  );

  if (typeof document !== "undefined" && document.body) {
    return createPortal(dialogContent, document.body);
  }
  return dialogContent;
}
