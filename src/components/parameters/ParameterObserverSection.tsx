import "./ParameterObserverSection.css";
import {
  AuditInspectionIcon,
  CloseIcon,
  CollapseSectionIcon,
  EditableParameterIcon,
  ExpandSectionIcon,
  ExternalLegalSourceIcon,
  ParameterSlidersIcon,
  ParameterValueLockedIcon,
  ResetDefaultsIcon,
  StatutoryLimitationWarningIcon,
} from "#components/Icons";
import LawRefLink from "#components/laws/LawRefLink";
import {
  formatParameterValue,
  getAvailableParameterYears,
} from "#engine/parameters/registry";
import {
  FormProjectionProfileId,
} from "#engine/parameters/projections";
import {
  type ParameterDomain as ParameterDomainType,
  type ParameterId,
  type ParameterMutability as ParameterMutabilityType,
  PARAMETER_DOMAIN_LABELS,
  PARAMETER_MUTABILITY_LABELS,
  ParameterDomain,
  ParameterMutability,
} from "#engine/parameters/types";
import {
  toFullCalendarYear,
} from "#engine/types";
import {
  activeParameterDomainFilter,
  activeParameterMutabilityFilter,
  activeParameterOverrideCount,
  activeParameterSearchQuery,
  activeParameterYear,
  activeProjectionProfileId,
  allResolvedParameters,
  dismissParameterModificationFlag,
  filteredResolvedParameters,
  lastParameterModificationFlag,
  modifyParameterValue,
  parameterModificationFlagHistory,
  projectedParameterView,
  resetAllParameterOverrides,
  resetParameterOverride,
  setParameterDomainFilter,
  setParameterMutabilityFilter,
  setParameterProjectionProfile,
  setParameterSearchQuery,
  setParameterYear,
  setShowProjectedOutDomains,
  showProjectedOutDomains,
} from "#store/parameterStore";
import type {
  JSX,
} from "preact";
import {
  useEffect,
  useState,
} from "preact/hooks";

export interface ParameterObserverSectionProps {
  readonly defaultExpanded?: boolean;
  readonly embedded?: boolean;
  readonly projectionProfile?: FormProjectionProfileId;
}

const DOMAIN_OPTIONS: readonly ParameterDomainType[] = Object.values(ParameterDomain);
const MUTABILITY_OPTIONS: readonly ParameterMutabilityType[] = Object.values(ParameterMutability);

/**
 * Shared Unified Parameter Value Storage Observer & Editor Section.
 * Allows observing all law-linked statutory constants, year-indexed profiles, and
 * customizable assumptions in one place across calculators, using per-calculator
 * Form Projection Profiles to keep out-of-focus domains cleanly default-projected
 * while allowing full inspection on demand.
 */
export default function ParameterObserverSection({
  defaultExpanded = false,
  embedded = false,
  projectionProfile = FormProjectionProfileId.FullCatalog,
}: ParameterObserverSectionProps): JSX.Element {
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded);
  const [draftValues, setDraftValues] = useState<Readonly<Partial<Record<ParameterId, string>>>>({});

  useEffect(() => {
    setParameterProjectionProfile(projectionProfile);
  }, [projectionProfile]);

  const activeYear = activeParameterYear.value;
  const availableYears = getAvailableParameterYears();
  const totalCount = allResolvedParameters.value.length;
  const filteredParams = filteredResolvedParameters.value;
  const overrideCount = activeParameterOverrideCount.value;
  const activeDomain = activeParameterDomainFilter.value;
  const activeMutability = activeParameterMutabilityFilter.value;
  const searchQuery = activeParameterSearchQuery.value;
  const activeFlag = lastParameterModificationFlag.value;
  const flagHistory = parameterModificationFlagHistory.value;
  const currentProfileId = activeProjectionProfileId.value;
  const projectionView = projectedParameterView.value;
  const showingAllDomains = showProjectedOutDomains.value;
  const hasProjectedOut = projectionView.projectedOutParameters.length > 0;
  const domainButtonOptions =
    hasProjectedOut && !showingAllDomains
      ? projectionView.profile.focusedDomains
      : DOMAIN_OPTIONS;

  const isExpanded = expanded || activeFlag !== null;

  return (
    <section
      className={`parameter-observer${embedded ? " parameter-observer--embedded" : ""}`}
      aria-labelledby="parameter-observer-heading"
    >
      <div className="parameter-observer__header-bar">
        <button
          type="button"
          className="parameter-observer__toggle-btn"
          aria-expanded={isExpanded}
          aria-controls="parameter-observer-panel"
          onClick={() => setExpanded(!isExpanded)}
        >
          <span className="parameter-observer__toggle-title">
            <ParameterSlidersIcon size={17} />
            <strong id="parameter-observer-heading">
              Rates &amp; Assumptions
            </strong>
          </span>
          <span className="parameter-observer__toggle-meta">
            {hasProjectedOut && (
              <span className="parameter-observer__badge">
                {projectionView.profile.label}: {projectionView.focusedParameters.length}/{totalCount}
              </span>
            )}
            {!hasProjectedOut && (
              <span className="parameter-observer__badge">
                {totalCount} rules
              </span>
            )}
            <span className="parameter-observer__badge">
              Year {activeYear}
            </span>
            {overrideCount > 0 && (
              <span className="parameter-observer__badge parameter-observer__badge--custom">
                {overrideCount} custom
              </span>
            )}
            {flagHistory.length > 0 && (
              <span className="parameter-observer__badge parameter-observer__badge--flag">
                {flagHistory.length} flag{flagHistory.length === 1 ? "" : "s"}
              </span>
            )}
            <span className="parameter-observer__chevron">
              {isExpanded ? <CollapseSectionIcon size={16} /> : <ExpandSectionIcon size={16} />}
            </span>
          </span>
        </button>
      </div>

      {isExpanded && (
        <div id="parameter-observer-panel" className="parameter-observer__panel">
          <p className="parameter-observer__intro">
            Shared rates, thresholds, and assumptions used across calculators. Fixed legal limits stay locked; planning assumptions can be adjusted.
          </p>

          {hasProjectedOut && (
            <div className="parameter-observer__projection-bar">
              <div className="parameter-observer__projection-info">
                <strong>{projectionView.profile.label}</strong>
                <span>
                  {showingAllDomains
                    ? `Showing all ${totalCount} rules across all calculators.`
                    : `${projectionView.profile.description} (${projectionView.projectedOutParameters.length} other rules use ${activeYear} defaults.)`}
                </span>
              </div>
              <button
                type="button"
                className={`parameter-observer__projection-toggle${showingAllDomains ? " parameter-observer__projection-toggle--active" : ""}`}
                onClick={() => setShowProjectedOutDomains(!showingAllDomains)}
              >
                {showingAllDomains
                  ? `Show relevant only (${projectionView.focusedParameters.length})`
                  : `Show all ${totalCount}`}
              </button>
            </div>
          )}

          {activeFlag && (
            <div className="parameter-observer__flag-banner" role="alert">
              <div className="parameter-observer__flag-main">
                <StatutoryLimitationWarningIcon size={17} />
                <div>
                  <div className="parameter-observer__flag-title">
                    <span>Statutory Protection Flag ({activeFlag.code})</span>
                    <span className="parameter-observer__flag-attempted tabular-nums">
                      Attempted value: {String(activeFlag.attemptedValue)}
                    </span>
                  </div>
                  <p className="parameter-observer__flag-message">{activeFlag.message}</p>
                  {activeFlag.lawIds.length > 0 && (
                    <div className="parameter-observer__law-chips">
                      {activeFlag.lawIds.map((lawId) => (
                        <LawRefLink key={lawId} lawId={lawId} variant="badge" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="parameter-observer__flag-close"
                aria-label="Dismiss statutory flag"
                onClick={dismissParameterModificationFlag}
              >
                <CloseIcon size={14} />
              </button>
            </div>
          )}

          <div className="parameter-observer__toolbar">
            <label className="parameter-observer__search-label">
              <AuditInspectionIcon size={14} />
              <input
                type="search"
                className="parameter-observer__search-input"
                aria-label="Search statutory parameters"
                placeholder="Search parameters, descriptions, IDs, or § citations..."
                value={searchQuery}
                onInput={(event) => setParameterSearchQuery(event.currentTarget.value)}
              />
            </label>

            <label className="parameter-observer__year-control">
              <span>Year profile:</span>
              <select
                aria-label="Active parameter calendar year"
                value={activeYear}
                onChange={(event) => {
                  setDraftValues({});
                  setParameterYear(toFullCalendarYear(Number(event.currentTarget.value)));
                }}
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="parameter-observer__reset-all-btn"
              onClick={() => {
                resetAllParameterOverrides();
                setParameterProjectionProfile(currentProfileId);
                setDraftValues({});
              }}
            >
              <ResetDefaultsIcon size={13} />
              <span>Reset All</span>
            </button>
          </div>

          <div className="parameter-observer__filters">
            <div className="parameter-observer__filter-group" role="group" aria-label="Filter by domain">
              <button
                type="button"
                className={`parameter-observer__filter-pill${activeDomain === undefined ? " parameter-observer__filter-pill--active" : ""}`}
                onClick={() => setParameterDomainFilter(undefined)}
              >
                {hasProjectedOut && !showingAllDomains ? "Focused Domains" : "All Domains"}
              </button>
              {domainButtonOptions.map((domain) => (
                <button
                  key={domain}
                  type="button"
                  className={`parameter-observer__filter-pill${activeDomain === domain ? " parameter-observer__filter-pill--active" : ""}`}
                  onClick={() => setParameterDomainFilter(activeDomain === domain ? undefined : domain)}
                >
                  {PARAMETER_DOMAIN_LABELS[domain]}
                </button>
              ))}
            </div>

            <div className="parameter-observer__filter-group" role="group" aria-label="Filter by mutability">
              <button
                type="button"
                className={`parameter-observer__filter-pill${activeMutability === undefined ? " parameter-observer__filter-pill--active" : ""}`}
                onClick={() => setParameterMutabilityFilter(undefined)}
              >
                All Mutability
              </button>
              {MUTABILITY_OPTIONS.map((mutability) => (
                <button
                  key={mutability}
                  type="button"
                  className={`parameter-observer__filter-pill${activeMutability === mutability ? " parameter-observer__filter-pill--active" : ""}`}
                  onClick={() => setParameterMutabilityFilter(activeMutability === mutability ? undefined : mutability)}
                >
                  {PARAMETER_MUTABILITY_LABELS[mutability]}
                </button>
              ))}
            </div>
          </div>

          <div className="parameter-observer__count-row">
            Showing {filteredParams.length} of {totalCount} rules
            {hasProjectedOut && !showingAllDomains && !searchQuery.trim() && !activeDomain
              ? ` (${projectionView.projectedOutParameters.length} other rules use ${activeYear} defaults)`
              : ""}
          </div>

          <div className="parameter-observer__list">
            {filteredParams.map((item) => {
              const def = item.definition;
              const isEditable = item.editable;
              const draftText = draftValues[def.id] ?? String(item.activeValue);
              const stepAttr = def.bounds.integerOnly ? "1" : "any";
              const mutabilityClass = def.mutability === ParameterMutability.Customizable
                ? "parameter-observer__mutability--custom"
                : def.mutability === ParameterMutability.YearIndexed
                  ? "parameter-observer__mutability--year"
                  : "parameter-observer__mutability--fixed";

              return (
                <article key={def.id} className="parameter-observer__row">
                  <div className="parameter-observer__row-info">
                    <div className="parameter-observer__row-header">
                      <strong>{def.label}</strong>
                      <span className="parameter-observer__domain-pill">
                        {PARAMETER_DOMAIN_LABELS[def.domain]}
                      </span>
                      <span className={`parameter-observer__mutability ${mutabilityClass}`}>
                        {isEditable
                          ? <EditableParameterIcon size={11} />
                          : <ParameterValueLockedIcon size={11} />}
                        <span>{PARAMETER_MUTABILITY_LABELS[def.mutability]}</span>
                      </span>
                    </div>

                    <p className="parameter-observer__row-desc">{def.description}</p>

                    <div className="parameter-observer__row-links">
                      <div className="parameter-observer__law-chips">
                        {def.lawIds.map((lawId) => (
                          <LawRefLink key={lawId} lawId={lawId} variant="badge" />
                        ))}
                      </div>
                      <a
                        href={item.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="parameter-observer__source-link"
                      >
                        <ExternalLegalSourceIcon size={12} />
                        <span>Official source</span>
                      </a>
                    </div>
                  </div>

                  <div className="parameter-observer__row-controls">
                    <div className="parameter-observer__value-box">
                      <span className="parameter-observer__active-value tabular-nums">
                        {formatParameterValue(item.activeValue, def.unit)}
                      </span>
                      {item.overridden && (
                        <span className="parameter-observer__sub-note">
                          Baseline: {formatParameterValue(item.baselineValue, def.unit)}
                        </span>
                      )}
                      {item.projected && item.sourceYear && (
                        <span className="parameter-observer__sub-note">
                          Source table: {item.sourceYear}
                        </span>
                      )}
                    </div>

                    <div className="parameter-observer__edit-box">
                      <input
                        type="number"
                        className="parameter-observer__number-input tabular-nums"
                        aria-label={`Value for ${def.label}`}
                        value={draftText}
                        step={stepAttr}
                        min={def.bounds.min}
                        max={def.bounds.max}
                        onInput={(event) => {
                          setDraftValues({
                            ...draftValues,
                            [def.id]: event.currentTarget.value,
                          });
                        }}
                      />
                      <button
                        type="button"
                        className={isEditable
                          ? "parameter-observer__apply-btn"
                          : "parameter-observer__attempt-btn"}
                        onClick={() => {
                          const parsed = Number(draftText);
                          modifyParameterValue(def.id, parsed);
                        }}
                      >
                        {isEditable ? "Apply" : "Attempt Edit"}
                      </button>
                      {isEditable && item.overridden && (
                        <button
                          type="button"
                          className="parameter-observer__reset-btn"
                          title={`Restore default (${item.baselineValue})`}
                          onClick={() => {
                            resetParameterOverride(def.id);
                            const nextDrafts = { ...draftValues };
                            delete nextDrafts[def.id];
                            setDraftValues(nextDrafts);
                          }}
                        >
                          <ResetDefaultsIcon size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
