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
  allResolvedParameters,
  dismissParameterModificationFlag,
  filteredResolvedParameters,
  lastParameterModificationFlag,
  modifyParameterValue,
  parameterModificationFlagHistory,
  resetAllParameterOverrides,
  resetParameterOverride,
  setParameterDomainFilter,
  setParameterMutabilityFilter,
  setParameterSearchQuery,
  setParameterYear,
} from "#store/parameterStore";
import type {
  JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";

export interface ParameterObserverSectionProps {
  readonly defaultExpanded?: boolean;
  readonly embedded?: boolean;
}

const DOMAIN_OPTIONS: readonly ParameterDomainType[] = Object.values(ParameterDomain);
const MUTABILITY_OPTIONS: readonly ParameterMutabilityType[] = Object.values(ParameterMutability);

/**
 * Shared Unified Parameter Value Storage Observer & Editor Section.
 * Allows observing all law-linked statutory constants, year-indexed profiles, and
 * customizable assumptions in one place across calculators, while raising explicit
 * statutory protection flags whenever modification is attempted on locked parameters.
 */
export default function ParameterObserverSection({
  defaultExpanded = false,
  embedded = false,
}: ParameterObserverSectionProps): JSX.Element {
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded);
  const [draftValues, setDraftValues] = useState<Readonly<Partial<Record<ParameterId, string>>>>({});

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
              Unified Statutory Values &amp; Parameters
            </strong>
          </span>
          <span className="parameter-observer__toggle-meta">
            <span className="parameter-observer__badge">
              {totalCount} parameters
            </span>
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
            All calculators read statutory rates, annual thresholds, and planning assumptions from this single law-linked registry.
            Customizable planning defaults can be edited freely; statutory or year-indexed legal constants raise a protection flag if modification is attempted.
          </p>

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
                All Domains
              </button>
              {DOMAIN_OPTIONS.map((domain) => (
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
            Showing {filteredParams.length} of {totalCount} parameters
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
                      <code className="parameter-observer__id-tag">{def.id}</code>
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
