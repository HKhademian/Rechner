import {
  topicsForLaw, 
} from "#engine/topics/registry";


import "./LawReferencePage.css";
import {
  calculatorPath,
  lawCatalogPath,
  sitePath,
  lawDetailPath,
} from "#/apps/appDefinition.ts";
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
  AppShell,
} from "#components/ui/AppShell";
import {
  PageHeader,
} from "#components/ui/PageHeader";
import {
  TextField,
} from "#components/ui/TextField";
import {
  FORMULA_DOMAIN_LABELS,
  buildLawPageTitle,
  filterLawsByGroup,
  getCalculatorsUsingLaw,
  parseLawPageLocation,
} from "#/components/laws/lawPageHelpers.ts";
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
import type {
  JSX,
} from "preact";
import {
  useEffect,
  useState,
} from "preact/hooks";

export interface LawReferencePageProps {
  readonly initialLawId?: LawId;
}

const DEFAULT_FALLBACK_LAW_ID = LawId.EStG_32a;

/**
 * Dedicated Full Statutory Law Reference Page (`/laws/` and `/laws/<lawId>/`).
 * Houses complete search, tag filtering, thematic law groups, calculator usage links,
 * full benefit/limitation breakdown, governed parameter observation & customization,
 * linked three-tier formulas, and cross-reference graphs.
 */
export default function LawReferencePage({
  initialLawId,
}: LawReferencePageProps): JSX.Element {
  const [selectedLawId, setSelectedLawId] = useState<LawId>(
    initialLawId ?? DEFAULT_FALLBACK_LAW_ID,
  );
  const [selectedGroupId, setSelectedGroupId] = useState<LawGroupId | undefined>(
    initialLawId ? getLawEntry(initialLawId).groupId : undefined,
  );
  const [groupFilter, setGroupFilter] = useState<LawGroupId | undefined>(undefined);
  const [tagFilter, setTagFilter] = useState<LawTag | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [draftInputs, setDraftInputs] = useState<Readonly<Partial<Record<ParameterId, string>>>>({});

  const activeYear = activeParameterYear.value;
  const overrides = customParameterOverrides.value;
  const activeFlag = lastParameterModificationFlag.value;

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
      const nextLawId = parsed.lawId ?? initialLawId ?? DEFAULT_FALLBACK_LAW_ID;
      setSelectedLawId(nextLawId);
      setSelectedGroupId(parsed.groupId ?? getLawEntry(nextLawId).groupId);
      setDraftInputs({});
      document.title = buildLawPageTitle(getLawEntry(nextLawId));

      if (parsed.tagFilter !== undefined) {
        setTagFilter(parsed.tagFilter);
      }
      if (parsed.searchQuery !== undefined) {
        setSearchQuery(parsed.searchQuery);
      }
    };

    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    return () => {
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, [initialLawId]);

  const selectLaw = (
    lawId: LawId,
    groupId?: LawGroupId,
  ): void => {
    const nextEntry = getLawEntry(lawId);
    const resolvedGroup = groupId ?? nextEntry.groupId;
    setSelectedLawId(lawId);
    setSelectedGroupId(resolvedGroup);
    setDraftInputs({});
    if (typeof window !== "undefined") {
      const targetUrl = lawDetailPath(lawId, resolvedGroup);
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (targetUrl !== currentUrl) {
        window.history.pushState({ lawId,
          groupId: resolvedGroup }, "", targetUrl);
      }
      document.title = buildLawPageTitle(nextEntry);
      window.scrollTo({ top: 0,
        behavior: "smooth" });
    }
  };

  const entry = getLawEntry(selectedLawId);
  const activeGroup = selectedGroupId
    ? getLawGroupEntry(selectedGroupId)
    : entry.groupId
      ? getLawGroupEntry(entry.groupId)
      : undefined;
  const allGroups = getAllLawGroupEntries();
  const usedTags = getUsedLawTags();
  const matchingLaws = filterLawsByGroup(searchLaws(searchQuery, tagFilter), groupFilter);
  const hasActiveFilters = Boolean(searchQuery.trim() || tagFilter || groupFilter);
  const outgoingRefs = getRelatedLaws(entry.id);
  const incomingRefs = getLawsReferencing(entry.id);
  const externalSources = getExternalSourceEntries(entry);
  const availableYears = getAvailableParameterYears();
  const usingCalculators = getCalculatorsUsingLaw(entry);

  const governedParameters = getParametersByLaw(entry.id).map((def) =>
    resolveParameterForYear(def.id, activeYear, overrides));
  const governedFlag = activeFlag &&
    governedParameters.some((item) => item.definition.id === activeFlag.parameterId)
    ? activeFlag
    : null;

  const linkedFormulas = Object.values(STATUTORY_FORMULA_DESCRIPTORS).filter((descriptor) =>
    descriptor.governingLawIds.includes(entry.id));

  const currentNavPath = lawCatalogPath();

  return (
    <AppShell currentPath={currentNavPath} wide shellClassName="law-page-shell">
      <PageHeader
        eyebrow="Laws & Rules"
        title="Laws & Rules Directory"
        subtitle="German tax, parental leave, housing, solar, and visa laws linked to the calculators."
      />
      <div className="law-page-layout">
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
                    const targetLawId = group.memberLawIds.includes(selectedLawId)
                      ? selectedLawId
                      : group.primaryLawId;
                    selectLaw(targetLawId, group.id);
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
              const isCurrent = law.id === entry.id;
              return (
                <a
                  key={law.id}
                  href={lawDetailPath(law.id)}
                  className={`law-page-sidebar__item${isCurrent ? " law-page-sidebar__item--active" : ""}`}
                  aria-current={isCurrent ? "page" : undefined}
                  onClick={(event) => {
                    if (!isPlainPrimaryClick(event)) {
                      return;
                    }
                    event.preventDefault();
                    selectLaw(law.id);
                  }}
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

        <article className="law-page-article" aria-labelledby="law-page-title">
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
            <p className="law-page-article__summary">{entry.summary} {topicsForLaw(entry.id).length > 0 && <span> Related topics: {topicsForLaw(entry.id).map((topic) => <a key={topic.id} href={sitePath(`/topics/${topic.id}/`)}>{topic.title} </a>)}</span>}</p>
            <div className="law-page-article__submeta">
              <div className="law-page-article__tags" aria-label="Law tags">
                {entry.tags.map((tag) => {
                  const isSelected = tagFilter === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={`law-page__tag-chip${isSelected ? " law-page__tag-chip--active" : ""}`}
                      onClick={() => setTagFilter(isSelected ? undefined : tag)}
                    >
                      <LawTagClassificationIcon size={11} />
                      <span>{LAW_TAG_LABELS[tag]}</span>
                    </button>
                  );
                })}
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
                      onClick={(event) => {
                        if (!isPlainPrimaryClick(event)) {
                          return;
                        }
                        event.preventDefault();
                        selectLaw(memberId, activeGroup.id);
                      }}
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
                    onClick={(event) => {
                      if (!isPlainPrimaryClick(event)) {
                        return;
                      }
                      event.preventDefault();
                      selectLaw(law.id);
                    }}
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
                    onClick={(event) => {
                      if (!isPlainPrimaryClick(event)) {
                        return;
                      }
                      event.preventDefault();
                      selectLaw(law.id);
                    }}
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
        </article>
      </div>
    </AppShell>
  );
}
