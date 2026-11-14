import "./LawReferenceModal.css";
import {
  CitationReferenceIcon,
  CloseIcon,
  ExternalLegalSourceIcon,
  LawAntiBenefitCaveatIcon,
  LawBenefitAdvantageIcon,
  LawTagClassificationIcon,
  LegalStatuteDocumentationIcon,
  NavigatePreviousLawIcon,
  StatutorySectionIcon,
} from "#components/Icons";
import {
  getExternalSourceEntries,
  getLawEntry,
  getLawGroupEntry,
  getLawsReferencing,
  getRelatedLaws,
  getUsedLawTags,
  searchLaws,
} from "#engine/laws/registry";
import {
  LAW_RELATION_LABELS,
  LAW_TAG_LABELS,
} from "#engine/laws/types";
import {
  activeLawModalState,
  activeLawSearchQuery,
  activeLawTagFilter,
  closeLawReference,
  navigateLawHistoryBack,
  navigateToRelatedLaw,
  setLawSearchQuery,
  setLawTagFilter,
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
 * Shared Unified Law Reference Popup Modal.
 * Renders typed law metadata, benefit/anti-benefit summaries, tags,
 * interactive cross-reference navigation, back history, and external sources.
 */
export default function LawReferenceModal(): JSX.Element | null {
  const modalState = activeLawModalState.value;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const tagFilter = activeLawTagFilter.value;
  const searchQuery = activeLawSearchQuery.value;

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
  const externalSources = getExternalSourceEntries(entry);
  const usedTags = getUsedLawTags();
  const filteredLaws = searchLaws(searchQuery, tagFilter);

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
          {/* Domain Tags */}
          <div className="law-reference-dialog__tags" aria-label="Law tags">
            {entry.tags.map((tag) => {
              const isSelected = tagFilter === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  className={`law-reference-dialog__tag-btn${isSelected ? " law-reference-dialog__tag-btn--active" : ""}`}
                  onClick={() => setLawTagFilter(isSelected ? undefined : tag)}
                  title={`Browse laws tagged "${LAW_TAG_LABELS[tag]}"`}
                >
                  <LawTagClassificationIcon size={11} />
                  <span>{LAW_TAG_LABELS[tag]}</span>
                </button>
              );
            })}
          </div>

          {/* Statutory Summary */}
          <p className="law-reference-dialog__summary">{entry.summary}</p>

          {/* Benefit & Anti-Benefit Summary */}
          {(entry.benefit || entry.antiBenefit) && (
            <div className="law-reference-dialog__tradeoffs">
              {entry.benefit && (
                <section className="law-reference-dialog__card law-reference-dialog__card--benefit">
                  <div className="law-reference-dialog__card-title">
                    <LawBenefitAdvantageIcon size={14} />
                    <span>Benefit / Advantage</span>
                  </div>
                  <p>{entry.benefit}</p>
                </section>
              )}
              {entry.antiBenefit && (
                <section className="law-reference-dialog__card law-reference-dialog__card--anti-benefit">
                  <div className="law-reference-dialog__card-title">
                    <LawAntiBenefitCaveatIcon size={14} />
                    <span>Anti-Benefit / Limitation</span>
                  </div>
                  <p>{entry.antiBenefit}</p>
                </section>
              )}
            </div>
          )}

          {/* Thematic Group Context */}
          {activeGroup && (
            <section className="law-reference-dialog__group-box">
              <div className="law-reference-dialog__group-header">
                <strong>Group: {activeGroup.title}</strong>
                <span className="law-reference-dialog__code-pill">
                  {activeGroup.citationLabel}
                </span>
              </div>
              <p className="law-reference-dialog__relation-desc">{activeGroup.summary}</p>
              <div className="law-reference-dialog__group-members">
                {activeGroup.memberLawIds.map((memberId) => {
                  const member = getLawEntry(memberId);
                  const isCurrent = memberId === entry.id;
                  return (
                    <button
                      key={memberId}
                      type="button"
                      disabled={isCurrent}
                      className={`law-reference-dialog__chip${isCurrent ? " law-reference-dialog__chip--current" : ""}`}
                      onClick={() => navigateToRelatedLaw(memberId)}
                    >
                      <StatutorySectionIcon size={11} />
                      <span>{member.citation}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Outgoing Cross-References */}
          {outgoingRefs.length > 0 && (
            <section>
              <h3 className="law-reference-dialog__section-title">
                <CitationReferenceIcon size={13} />
                <span>Related &amp; Cross-Referenced Laws</span>
              </h3>
              <div className="law-reference-dialog__relations-list">
                {outgoingRefs.map(({ law, metadata }) => (
                  <button
                    key={law.id}
                    type="button"
                    className="law-reference-dialog__relation-item"
                    onClick={() => navigateToRelatedLaw(law.id)}
                  >
                    <div className="law-reference-dialog__relation-top">
                      <span className="law-reference-dialog__relation-citation">
                        {law.citation}
                      </span>
                      {metadata.relationType && (
                        <span className="law-reference-dialog__relation-kind">
                          {LAW_RELATION_LABELS[metadata.relationType]}
                        </span>
                      )}
                    </div>
                    <span className="law-reference-dialog__relation-title">
                      {law.title}
                    </span>
                    {metadata.description && (
                      <span className="law-reference-dialog__relation-desc">
                        {metadata.description}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Incoming Back-References */}
          {incomingRefs.length > 0 && (
            <section>
              <h3 className="law-reference-dialog__section-title">
                <LegalStatuteDocumentationIcon size={13} />
                <span>Referenced By Other Laws</span>
              </h3>
              <div className="law-reference-dialog__group-members">
                {incomingRefs.map(({ law, metadata }) => (
                  <button
                    key={law.id}
                    type="button"
                    className="law-reference-dialog__chip"
                    title={metadata.description ?? law.title}
                    onClick={() => navigateToRelatedLaw(law.id)}
                  >
                    <StatutorySectionIcon size={11} />
                    <span>{law.citation}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Official External Sources */}
          {externalSources.length > 0 && (
            <section>
              <h3 className="law-reference-dialog__section-title">
                <ExternalLegalSourceIcon size={13} />
                <span>Official External References</span>
              </h3>
              <div className="law-reference-dialog__sources">
                {externalSources.map((source) => (
                  <a
                    key={source.sourceId}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="law-reference-dialog__source-link"
                  >
                    <div>
                      <strong>{source.label}</strong>
                      {source.description && <span>{source.description}</span>}
                    </div>
                    <ExternalLegalSourceIcon size={13} />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Interactive Tag & Search Law Explorer */}
          <details className="law-reference-dialog__explorer" open={Boolean(tagFilter || searchQuery)}>
            <summary>
              Browse all statutory references ({filteredLaws.length})
            </summary>
            <div className="law-reference-dialog__explorer-controls">
              <input
                type="search"
                className="law-reference-dialog__search"
                placeholder="Search by § section, code (BEEG, EStG, MuSchG, SGB), or topic..."
                value={searchQuery}
                aria-label="Search statutory references"
                onInput={(event) => setLawSearchQuery(event.currentTarget.value)}
              />
              <div className="law-reference-dialog__tags">
                <button
                  type="button"
                  className={`law-reference-dialog__tag-btn${tagFilter === undefined ? " law-reference-dialog__tag-btn--active" : ""}`}
                  onClick={() => setLawTagFilter(undefined)}
                >
                  All tags
                </button>
                {usedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`law-reference-dialog__tag-btn${tagFilter === tag ? " law-reference-dialog__tag-btn--active" : ""}`}
                    onClick={() => setLawTagFilter(tagFilter === tag ? undefined : tag)}
                  >
                    {LAW_TAG_LABELS[tag]}
                  </button>
                ))}
              </div>
              <div className="law-reference-dialog__explorer-list">
                {filteredLaws.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`law-reference-dialog__chip${item.id === entry.id ? " law-reference-dialog__chip--current" : ""}`}
                    onClick={() => navigateToRelatedLaw(item.id)}
                  >
                    <StatutorySectionIcon size={11} />
                    <span>{item.citation}</span>
                  </button>
                ))}
              </div>
            </div>
          </details>
        </div>
      </div>
    </dialog>
  );

  if (typeof document !== "undefined" && document.body) {
    return createPortal(dialogContent, document.body);
  }
  return dialogContent;
}
