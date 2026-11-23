import "./LawReferencePage.css";
import {
  calculatorPath,
  lawCatalogPath,
  lawDetailPath,
} from "#/apps/appDefinition.ts";
import {
  FORMULA_DOMAIN_LABELS,
  filterLawsByGroup,
  getCalculatorsUsingLaw,
  parseLawPageLocation,
} from "#/components/laws/lawPageHelpers.ts";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";
import {
  AuditInspectionIcon,
  CalculatorNavigationIcon,
  CitationReferenceIcon,
  CloseIcon,
  EditableParameterIcon,
  ExternalLegalSourceIcon,
  LawAntiBenefitCaveatIcon,
  LawBenefitAdvantageIcon,
  LawTagClassificationIcon,
  LegalStatuteDocumentationIcon,
  ParameterSlidersIcon,
  ParameterValueLockedIcon,
  ResetDefaultsIcon,
  StatutoryLimitationWarningIcon,
  StatutorySectionIcon,
} from "#components/Icons";
import {
  TextField,
} from "#components/ui/TextField";
import {
  STATUTORY_FORMULA_DESCRIPTORS,
} from "#engine/formulas/context/statutoryEvaluators";
import {
  getAllLawEntries,
  getAllLawGroupEntries,
  getExternalSourceEntries,
  getLawEntry,
  getLawGroupEntry,
  getLawsReferencing,
  getRelatedLaws,
  getUsedLawTags,
  searchLaws,
} from "#engine/laws/registry";
import {
  type LawGroupId,
  type LawTag,
  LAW_RELATION_LABELS,
  LAW_TAG_LABELS,
  LawId,
  isLawGroupId,
  toLawTag,
} from "#engine/laws/types";
import {
  formatParameterValue,
  getAvailableParameterYears,
  getParameterDefinition,
  getParametersByLaw,
  resolveParameterForYear,
} from "#engine/parameters/registry";
import {
  type ParameterId,
  PARAMETER_MUTABILITY_LABELS,
  ParameterMutability,
} from "#engine/parameters/types";
import {
  DEFAULT_TAX_YEAR,
} from "#engine/tax/taxRules";
import {
  topicsForLaw,
} from "#engine/topics/registry";
import {
  toFullCalendarYear,
} from "#engine/types";
import {
  isPlainPrimaryClick,
} from "#store/lawReferenceStore";
import {
  activeParameterYear,
  customParameterOverrides,
  dismissParameterModificationFlag,
  flagLockedParameterAttempt,
  lastParameterModificationFlag,
  modifyParameterValue,
  resetParameterOverride,
  setParameterYear,
} from "#store/parameterStore";
import {
  topicPath,
} from "#utils/topicPath";
import type {
  JSX,
} from "preact";
import {
  useEffect,
  useState,
} from "preact/hooks";

export const DEFAULT_FALLBACK_LAW_ID = LawId.EStG_32a;

export interface LawDirectorySidebarProps {
  readonly currentLawId: LawId;
  readonly redirectQueryLaw?: boolean;
}

export interface LawArticleSectionProps {
  readonly lawId: LawId;
}

/** Returns true when a statute has governed parameters or linked formulas requiring client hydration. */
export function hasLawInteractiveSections(lawId: LawId): boolean {
  if (getParametersByLaw(lawId).length > 0) {
    return true;
  }
  return Object.values(STATUTORY_FORMULA_DESCRIPTORS).some((descriptor) =>
    descriptor.governingLawIds.includes(lawId));
}

/**
 * Interactive Law Directory sidebar island (`client:idle`).
 * Handles live search, tag filtering, thematic group navigation, and legacy `?law=` query redirects
 * while the main statutory article renders purely at build time.
 */
export function LawDirectorySidebar({
  currentLawId,
  redirectQueryLaw = false,
}: LawDirectorySidebarProps): JSX.Element {
  const [groupFilter, setGroupFilter] = useState<LawGroupId | undefined>(undefined);
  const [tagFilter, setTagFilter] = useState<LawTag | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncFromLocation = (): void => {
      const parsed = parseLawPageLocation(
        window.location.pathname,
        window.location.search,
        lawCatalogPath(),
      );
      if (redirectQueryLaw && parsed.lawId && parsed.lawId !== currentLawId) {
        const target = new URL(
          lawDetailPath(parsed.lawId, parsed.groupId),
          window.location.origin,
        );
        if (parsed.tagFilter) {
          target.searchParams.set("tag", parsed.tagFilter);
        }
        if (parsed.searchQuery) {
          target.searchParams.set("q", parsed.searchQuery);
        }
        window.location.replace(`${target.pathname}${target.search}`);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const rawGroup = params.get("group");
      setGroupFilter(rawGroup && isLawGroupId(rawGroup) ? rawGroup : undefined);
      setTagFilter(parsed.tagFilter);
      setSearchQuery(parsed.searchQuery ?? "");
    };

    const handleArticleTagClick = (event: MouseEvent): void => {
      if (event.defaultPrevented || !isPlainPrimaryClick(event)) {
        return;
      }
      const target = event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("a[data-law-page-tag]")
        : null;
      const rawTag = target?.dataset.lawPageTag;
      if (!rawTag) {
        return;
      }
      try {
        const parsedTag = toLawTag(rawTag);
        event.preventDefault();
        setTagFilter((current) => (current === parsedTag ? undefined : parsedTag));
      }
      catch {
        // Ignore unrecognized tag attributes.
      }
    };

    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    document.addEventListener("click", handleArticleTagClick);
    return () => {
      window.removeEventListener("popstate", syncFromLocation);
      document.removeEventListener("click", handleArticleTagClick);
    };
  }, [currentLawId, redirectQueryLaw]);

  const allGroups = getAllLawGroupEntries();
  const usedTags = getUsedLawTags();
  const matchingLaws = filterLawsByGroup(searchLaws(searchQuery, tagFilter), groupFilter);
  const hasActiveFilters = Boolean(searchQuery.trim() || tagFilter || groupFilter);

  return (
    <aside className="law-page-sidebar" aria-label="Law directory and filters">
      <div className="law-page-sidebar__header">
        <div className="law-page-sidebar__title-row">
          <h2 className="law-page-sidebar__heading">
            <LegalStatuteDocumentationIcon size={16} />
            <span>Law Directory ({matchingLaws.length}/{getAllLawEntries().length})</span>
          </h2>
          {hasActiveFilters && (
            <button
              type="button"
              className="law-page-sidebar__clear-btn"
              onClick={() => {
                setSearchQuery("");
                setTagFilter(undefined);
                setGroupFilter(undefined);
              }}
            >
              Clear filters
            </button>
          )}
        </div>
        <TextField
          type="search"
          compact
          ariaLabel="Search statutory references"
          placeholder="Search §, BEEG, EStG, MuSchG, SGB..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <div className="law-page-sidebar__filter-group">
        <span className="law-page-sidebar__filter-label">Tags</span>
        <div className="law-page-sidebar__tags">
          <button
            type="button"
            className={`law-page__tag-chip${tagFilter === undefined ? " law-page__tag-chip--active" : ""}`}
            onClick={() => setTagFilter(undefined)}
          >
            All
          </button>
          {usedTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`law-page__tag-chip${tagFilter === tag ? " law-page__tag-chip--active" : ""}`}
              onClick={() => setTagFilter(tagFilter === tag ? undefined : tag)}
            >
              {LAW_TAG_LABELS[tag]}
            </button>
          ))}
        </div>
      </div>

      <div className="law-page-sidebar__filter-group">
        <label className="law-page-sidebar__select-wrap">
          <span className="law-page-sidebar__filter-label">Thematic Law Group</span>
          <select
            className="law-page-sidebar__select"
            aria-label="Filter or jump to thematic law group"
            value={groupFilter ?? ""}
            onChange={(event) => {
              const val = event.currentTarget.value;
              if (!val) {
                setGroupFilter(undefined);
                return;
              }
              if (isLawGroupId(val)) {
                const group = getLawGroupEntry(val);
                setGroupFilter(group.id);
                if (!group.memberLawIds.includes(currentLawId) && typeof window !== "undefined") {
                  window.location.assign(lawDetailPath(group.primaryLawId, group.id));
                }
              }
            }}
          >
            <option value="">All topics ({allGroups.length} groups)</option>
            {allGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.citationLabel} — {group.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <nav className="law-page-sidebar__list" aria-label="Registered statutes">
        {matchingLaws.map((law) => {
          const isCurrent = law.id === currentLawId;
          return (
            <a
              key={law.id}
              href={lawDetailPath(law.id, groupFilter)}
              className={`law-page-sidebar__item${isCurrent ? " law-page-sidebar__item--active" : ""}`}
              aria-current={isCurrent ? "page" : undefined}
            >
              <span className="law-page-sidebar__item-citation">{law.citation}</span>
              <span className="law-page-sidebar__item-title">{law.title}</span>
            </a>
          );
        })}
        {matchingLaws.length === 0 && (
          <p className="law-page-sidebar__empty">
            No statutes match your current search, tag, or group filter.
          </p>
        )}
      </nav>
    </aside>
  );
}

/**
 * Build-time static header, summary, tags, calculator links, and benefit/caveat tradeoffs for a statute.
 */
export function LawArticleOverview({
  lawId,
}: LawArticleSectionProps): JSX.Element {
  const entry = getLawEntry(lawId);
  const activeGroup = entry.groupId ? getLawGroupEntry(entry.groupId) : undefined;
  const usingCalculators = getCalculatorsUsingLaw(entry);
  const relatedTopics = topicsForLaw(entry.id);

  return (
    <>
      <header className="law-page-article__header">
        <div className="law-page-article__meta">
          <span className="law-page-article__citation-pill">
            <StatutorySectionIcon size={14} />
            <span>{entry.citation}</span>
          </span>
          <span className="law-page-article__code-pill">{entry.code}</span>
          {activeGroup && (
            <span className="law-page-article__group-pill">{activeGroup.title}</span>
          )}
          <a
            href={lawDetailPath(entry.id, activeGroup?.id)}
            className="law-page-article__permalink"
            title="Direct link to this statute"
          >
            Permalink
          </a>
        </div>
        <h1 id="law-page-title" className="law-page-article__title">
          {entry.title}
        </h1>
        <p className="law-page-article__summary">
          {entry.summary}
          {relatedTopics.length > 0 && (
            <span>
              {" "}Related topics:{" "}
              {relatedTopics.map((topic) => (
                <a key={topic.id} href={topicPath(topic.id)}>{topic.title} </a>
              ))}
            </span>
          )}
        </p>
        <div className="law-page-article__submeta">
          <div className="law-page-article__tags" aria-label="Law tags">
            {entry.tags.map((tag) => (
              <a
                key={tag}
                href={`${lawDetailPath(entry.id)}?tag=${encodeURIComponent(tag)}`}
                data-law-page-tag={tag}
                className="law-page__tag-chip"
              >
                <LawTagClassificationIcon size={11} />
                <span>{LAW_TAG_LABELS[tag]}</span>
              </a>
            ))}
          </div>

          {usingCalculators.length > 0 && (
            <div className="law-page-article__calculators" aria-label="Used in calculators">
              <span className="law-page-article__submeta-label">Used in:</span>
              {usingCalculators.map((app) => (
                <a
                  key={app.id}
                  href={calculatorPath(app.id)}
                  className="law-page-calculator-link"
                >
                  <CalculatorNavigationIcon size={12} />
                  <span>{app.title}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </header>

      {(entry.benefit || entry.antiBenefit) && (
        <section className="law-page-tradeoffs" aria-label="Statutory benefit and limitations">
          {entry.benefit && (
            <div className="law-page-card law-page-card--benefit">
              <div className="law-page-card__title">
                <LawBenefitAdvantageIcon size={15} />
                <span>Benefit / Advantage</span>
              </div>
              <p>{entry.benefit}</p>
            </div>
          )}
          {entry.antiBenefit && (
            <div className="law-page-card law-page-card--anti-benefit">
              <div className="law-page-card__title">
                <LawAntiBenefitCaveatIcon size={15} />
                <span>Anti-Benefit / Limitation</span>
              </div>
              <p>{entry.antiBenefit}</p>
            </div>
          )}
        </section>
      )}
    </>
  );
}

/**
 * Interactive governed parameter editor and linked formula values island.
 * Mounted only on statutes that define governed parameters or linked formulas.
 */
export function LawGovernedParameters({
  lawId,
}: LawArticleSectionProps): JSX.Element | null {
  const hydrated = useHydrated();
  const [draftInputs, setDraftInputs] = useState<Readonly<Partial<Record<ParameterId, string>>>>({});

  const entry = getLawEntry(lawId);
  const activeYear = hydrated ? activeParameterYear.value : DEFAULT_TAX_YEAR;
  const overrides = hydrated ? customParameterOverrides.value : {};
  const activeFlag = hydrated ? lastParameterModificationFlag.value : null;
  const availableYears = getAvailableParameterYears();

  const governedParameters = getParametersByLaw(entry.id).map((def) =>
    resolveParameterForYear(def.id, activeYear, overrides));
  const governedFlag = activeFlag &&
    governedParameters.some((item) => item.definition.id === activeFlag.parameterId)
    ? activeFlag
    : null;

  const linkedFormulas = Object.values(STATUTORY_FORMULA_DESCRIPTORS).filter((descriptor) =>
    descriptor.governingLawIds.includes(entry.id));

  if (governedParameters.length === 0 && linkedFormulas.length === 0) {
    return null;
  }

  return (
    <>
      {governedParameters.length > 0 && (
        <section className="law-page-section" aria-label="Governed parameter values">
          <div className="law-page-section__header">
            <h2 className="law-page-section__title">
              <ParameterSlidersIcon size={15} />
              <span>Governed Values &amp; Statutory Constants ({activeYear})</span>
            </h2>
            <label className="law-page-year-select">
              <span>Year:</span>
              <select
                aria-label="Parameter reference year"
                value={activeYear}
                onChange={(event) => {
                  setDraftInputs({});
                  setParameterYear(toFullCalendarYear(Number(event.currentTarget.value)));
                }}
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
          </div>

          {governedFlag && (
            <div className="law-page-flag-alert" role="alert">
              <div className="law-page-flag-alert__content">
                <StatutoryLimitationWarningIcon size={15} />
                <span>{governedFlag.message}</span>
              </div>
              <button
                type="button"
                className="law-page-flag-alert__dismiss"
                aria-label="Dismiss statutory flag"
                onClick={dismissParameterModificationFlag}
              >
                <CloseIcon size={12} />
              </button>
            </div>
          )}

          <div className="law-page-params-list">
            {governedParameters.map((item) => {
              const def = item.definition;
              const isEditable = item.editable;
              const draftString = draftInputs[def.id] ?? String(item.activeValue);
              const stepValue = def.bounds.integerOnly ? "1" : "any";
              const mutabilityToneClass = def.mutability === ParameterMutability.Customizable
                ? "law-page-mutability--custom"
                : def.mutability === ParameterMutability.YearIndexed
                  ? "law-page-mutability--year"
                  : "law-page-mutability--fixed";

              return (
                <div key={def.id} className="law-page-param-row">
                  <div className="law-page-param-row__main">
                    <div className="law-page-param-row__top">
                      <strong>{def.label}</strong>
                      <span className={`law-page-mutability ${mutabilityToneClass}`}>
                        {isEditable
                          ? <EditableParameterIcon size={11} />
                          : <ParameterValueLockedIcon size={11} />}
                        <span>{PARAMETER_MUTABILITY_LABELS[def.mutability]}</span>
                      </span>
                    </div>
                    <p className="law-page-param-row__desc">{def.description}</p>
                  </div>

                  <div className="law-page-param-row__controls">
                    <div className="law-page-param-row__value-wrap">
                      <span className="law-page-param-row__value tabular-nums">
                        {formatParameterValue(item.activeValue, def.unit)}
                      </span>
                      {item.overridden && (
                        <span className="law-page-param-row__note">
                          Default: {formatParameterValue(item.baselineValue, def.unit)}
                        </span>
                      )}
                      {item.projected && item.sourceYear && (
                        <span className="law-page-param-row__note">
                          Table: {item.sourceYear}
                        </span>
                      )}
                    </div>

                    {isEditable
                      ? (
                        <form
                          className="law-page-param-row__edit"
                          onSubmit={(event) => {
                            event.preventDefault();
                            modifyParameterValue(def.id, Number(draftString));
                          }}
                        >
                          <input
                            type="number"
                            className="law-page-param-row__input"
                            aria-label={`Edit ${def.label}`}
                            value={draftString}
                            min={def.bounds.min}
                            max={def.bounds.max}
                            step={stepValue}
                            onInput={(event) => {
                              setDraftInputs({
                                ...draftInputs,
                                [def.id]: event.currentTarget.value,
                              });
                            }}
                          />
                          <button
                            type="submit"
                            className="law-page-btn"
                          >
                            Apply
                          </button>
                          {item.overridden && (
                            <button
                              type="button"
                              className="law-page-btn"
                              title="Restore baseline value"
                              onClick={() => {
                                resetParameterOverride(def.id);
                                const nextDrafts = { ...draftInputs };
                                delete nextDrafts[def.id];
                                setDraftInputs(nextDrafts);
                              }}
                            >
                              <ResetDefaultsIcon size={12} />
                            </button>
                          )}
                        </form>
                      )
                      : (
                        <button
                          type="button"
                          className="law-page-lock-btn"
                          title="Statutory value is protected; click to raise verification flag"
                          onClick={() => flagLockedParameterAttempt(def.id)}
                        >
                          <ParameterValueLockedIcon size={11} />
                          <span>Locked</span>
                        </button>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {linkedFormulas.length > 0 && (
        <section className="law-page-section" aria-label="Linked calculation formulas">
          <h2 className="law-page-section__title">
            <AuditInspectionIcon size={15} />
            <span>Calculable Formulas Governed by {entry.citation}</span>
          </h2>
          <div className="law-page-formulas-grid">
            {linkedFormulas.map((formula) => (
              <div key={formula.id} className="law-page-formula-card">
                <div className="law-page-formula-card__top">
                  <strong>{formula.label}</strong>
                  <span className="law-page-formula-card__domain">
                    {FORMULA_DOMAIN_LABELS[formula.domain]}
                  </span>
                </div>
                <span className="law-page-formula-card__id">{formula.id}</span>
                <p>{formula.description}</p>
                {formula.consumedParameterIds.length > 0 && (
                  <div className="law-page-formula-card__params" aria-label="Consumed parameters">
                    {formula.consumedParameterIds.map((paramId) => {
                      const def = getParameterDefinition(paramId);
                      const resolved = resolveParameterForYear(paramId, activeYear, overrides);
                      return (
                        <span key={paramId} className="law-page-formula-param-pill" title={def.description}>
                          <span>{def.label}:</span>
                          <strong className="tabular-nums">
                            {formatParameterValue(resolved.activeValue, def.unit)}
                          </strong>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/**
 * Build-time static thematic group, cross-reference graph, and official external sources for a statute.
 */
export function LawArticleReferences({
  lawId,
}: LawArticleSectionProps): JSX.Element {
  const entry = getLawEntry(lawId);
  const activeGroup = entry.groupId ? getLawGroupEntry(entry.groupId) : undefined;
  const outgoingRefs = getRelatedLaws(entry.id);
  const incomingRefs = getLawsReferencing(entry.id);
  const externalSources = getExternalSourceEntries(entry);

  return (
    <>
      {activeGroup && (
        <section className="law-page-section" aria-label="Thematic law group">
          <div className="law-page-section__header">
            <h2 className="law-page-section__title">
              <span>Thematic Group: {activeGroup.title}</span>
            </h2>
            <span className="law-page-article__code-pill">{activeGroup.citationLabel}</span>
          </div>
          <p className="law-page-group-summary">{activeGroup.summary}</p>
          <div className="law-page-chips">
            {activeGroup.memberLawIds.map((memberId) => {
              const member = getLawEntry(memberId);
              const isCurrent = memberId === entry.id;
              return (
                <a
                  key={memberId}
                  href={lawDetailPath(memberId, activeGroup.id)}
                  className={`law-page-chip${isCurrent ? " law-page-chip--current" : ""}`}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  <StatutorySectionIcon size={11} />
                  <span>{member.citation}</span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {outgoingRefs.length > 0 && (
        <section className="law-page-section" aria-label="Cross-referenced statutes">
          <h2 className="law-page-section__title">
            <CitationReferenceIcon size={15} />
            <span>Related &amp; Cross-Referenced Laws</span>
          </h2>
          <div className="law-page-relations-grid">
            {outgoingRefs.map(({ law, metadata }) => (
              <a
                key={law.id}
                href={lawDetailPath(law.id)}
                className="law-page-relation-card"
              >
                <div className="law-page-relation-card__top">
                  <span className="law-page-relation-card__citation">{law.citation}</span>
                  {metadata.relationType && (
                    <span className="law-page-relation-card__kind">
                      {LAW_RELATION_LABELS[metadata.relationType]}
                    </span>
                  )}
                </div>
                <strong className="law-page-relation-card__title">{law.title}</strong>
                {metadata.description && (
                  <span className="law-page-relation-card__desc">{metadata.description}</span>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

      {incomingRefs.length > 0 && (
        <section className="law-page-section" aria-label="Referenced by other laws">
          <h2 className="law-page-section__title">
            <LegalStatuteDocumentationIcon size={15} />
            <span>Referenced By Other Laws</span>
          </h2>
          <div className="law-page-chips">
            {incomingRefs.map(({ law, metadata }) => (
              <a
                key={law.id}
                href={lawDetailPath(law.id)}
                className="law-page-chip"
                title={metadata.description ?? law.title}
              >
                <StatutorySectionIcon size={11} />
                <span>{law.citation}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {externalSources.length > 0 && (
        <section className="law-page-section" aria-label="Official external sources">
          <h2 className="law-page-section__title">
            <ExternalLegalSourceIcon size={15} />
            <span>Official External References</span>
          </h2>
          <div className="law-page-sources-grid">
            {externalSources.map((source) => (
              <a
                key={source.sourceId}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="law-page-source-card"
              >
                <div>
                  <strong>{source.label}</strong>
                  {source.description && <span>{source.description}</span>}
                </div>
                <ExternalLegalSourceIcon size={14} />
              </a>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
