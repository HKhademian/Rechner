import type {
  JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  customPregnancies,
  customTaxClassSwitches,
  customWorkingHoursChanges,
  startCalendarMonth,
  startCalendarYear,
} from "#store/elterngeldStore";
import {
  type IsoCalendarDate,
  StatutoryDeadlineCategory,
  StatutoryDeadlineSeverity,
  TargetPerson,
  formatGermanDate,
} from "#engine/types";
import {
  buildIsoDate,
  diffCalendarDays,
  parseIsoDateParts,
} from "#engine/formulas/pure/maternityAndLifeMonthFormulas";
import {
  type StatutoryDeadlineItem,
  type StatutoryDeadlinesFormulaResult,
  evaluateStatutoryDeadlinesFormula,
} from "#engine/formulas/pure/statutoryDeadlineFormulas";
import LawRefLink from "#components/laws/LawRefLink";
import "./StatutoryActionTimeline.css";

const DeadlineFilterTab = {
  All: "all",
  Warnings: "warnings",
  Tax: "tax",
  Employer: "employer",
  Benefits: "benefits",
} as const;
type DeadlineFilterTab = (typeof DeadlineFilterTab)[keyof typeof DeadlineFilterTab];

function simMonthToFirstIsoDate(
  simMonth: number,
  startYear: number,
  startMonth: number,
  day = 1,
): IsoCalendarDate {
  const elapsed = startMonth - 1 + (simMonth - 1);
  const y = startYear + Math.floor(elapsed / 12);
  const m = ((elapsed % 12) + 12) % 12 + 1;
  return buildIsoDate(y, m, day);
}

function severityPillClass(severity: StatutoryDeadlineSeverity): string {
  switch (severity) {
    case StatutoryDeadlineSeverity.Optimal:
      return "sat-pill sat-pill--optimal";
    case StatutoryDeadlineSeverity.Warning:
      return "sat-pill sat-pill--warning";
    case StatutoryDeadlineSeverity.ActionNeeded:
      return "sat-pill sat-pill--action";
    default:
      return "sat-pill sat-pill--info";
  }
}

function severityLabel(severity: StatutoryDeadlineSeverity): string {
  switch (severity) {
    case StatutoryDeadlineSeverity.Optimal:
      return "Optimal";
    case StatutoryDeadlineSeverity.Warning:
      return "Warning";
    case StatutoryDeadlineSeverity.ActionNeeded:
      return "Action Needed";
    default:
      return "Info";
  }
}

function matchesFilter(item: StatutoryDeadlineItem, filter: DeadlineFilterTab): boolean {
  switch (filter) {
    case DeadlineFilterTab.Warnings:
      return item.severity === StatutoryDeadlineSeverity.Warning;
    case DeadlineFilterTab.Tax:
      return item.category === StatutoryDeadlineCategory.TaxClassSwitch;
    case DeadlineFilterTab.Employer:
      return (
        item.category === StatutoryDeadlineCategory.Elternzeit ||
        item.category === StatutoryDeadlineCategory.WorkingHours ||
        item.category === StatutoryDeadlineCategory.Mutterschutz
      );
    case DeadlineFilterTab.Benefits:
      return (
        item.category === StatutoryDeadlineCategory.Elterngeld ||
        item.category === StatutoryDeadlineCategory.Kindergeld ||
        item.category === StatutoryDeadlineCategory.Vacation
      );
    default:
      return true;
  }
}

/**
 * Prioritized Statutory Action Deadlines, Tax-Switch Guards & § 17 BEEG Vacation Optimizer Panel.
 * Driven deterministically from exact due dates, tax switches, and working-hours return dates.
 */
export default function StatutoryActionTimeline(): JSX.Element | null {
  const [filter, setFilter] = useState<DeadlineFilterTab>(DeadlineFilterTab.All);
  const pregnancies = customPregnancies.value;
  if (pregnancies.length === 0) {
    return null;
  }

  const startY = startCalendarYear.value;
  const startM = startCalendarMonth.value;
  const switches = customTaxClassSwitches.value;
  const hoursChanges = customWorkingHoursChanges.value;

  const sortedPregs = [...pregnancies].sort(
    (a, b) => a.calculatedDeliverySimulationMonth - b.calculatedDeliverySimulationMonth,
  );

  let anyMissingExactDueDate = false;
  const analyses: StatutoryDeadlinesFormulaResult[] = sortedPregs.map((preg, idx) => {
    const dueDate = preg.expectedDueDate ?? (() => {
      anyMissingExactDueDate = true;
      return simMonthToFirstIsoDate(
        preg.calculatedDeliverySimulationMonth,
        startY,
        startM,
        15,
      );
    })();

    // Match closest proactive tax switch preceding this pregnancy's delivery
    const matchingSwitch = switches
      .filter((sw) => sw.effectiveSimulationMonth < preg.calculatedDeliverySimulationMonth)
      .sort((a, b) => b.effectiveSimulationMonth - a.effectiveSimulationMonth)[0];

    const taxSwitchIntoEffectiveDate = matchingSwitch
      ? buildIsoDate(matchingSwitch.effectiveCalendarYear, matchingSwitch.effectiveCalendarMonth, 1)
      : undefined;
    const taxSwitchRevertEffectiveDate =
      matchingSwitch?.revertSimulationMonth !== undefined
        ? simMonthToFirstIsoDate(matchingSwitch.revertSimulationMonth, startY, startM, 1)
        : undefined;

    // Match mother's first return-to-work schedule change (>0h) occurring after delivery
    const returnChange = hoursChanges
      .filter(
        (whc) =>
          (whc.targetPerson === TargetPerson.Wife || whc.targetPerson === TargetPerson.Both) &&
          whc.weeklyHours > 0 &&
          whc.effectiveSimulationMonth > preg.calculatedDeliverySimulationMonth,
      )
      .sort((a, b) => a.effectiveSimulationMonth - b.effectiveSimulationMonth)[0];

    const motherReturnToWorkDate = returnChange
      ? returnChange.effectiveDate ??
        buildIsoDate(returnChange.effectiveCalendarYear, returnChange.effectiveCalendarMonth, 1)
      : undefined;

    const nextPreg = sortedPregs[idx + 1];
    const chainedNextElternzeitEndDate = nextPreg
      ? nextPreg.expectedDueDate ??
        simMonthToFirstIsoDate(nextPreg.calculatedDeliverySimulationMonth, startY, startM, 15)
      : undefined;

    return evaluateStatutoryDeadlinesFormula({
      childIndex: preg.childIndex,
      expectedDueDate: dueDate,
      isMultipleOrPrematureBirth: preg.isMultipleOrPrematureBirth,
      taxSwitchIntoEffectiveDate,
      taxSwitchRevertEffectiveDate,
      motherReturnToWorkDate,
      motherBasisLifeMonthsCount: preg.motherAllowanceMonthsCount ?? 6,
      fatherPartnerMonthsCount: preg.fatherPartnerMonthsCount,
      motherAnnualVacationDays: preg.motherAnnualVacationDays ?? 30,
      motherVacationDaysTakenPreLeave: preg.motherVacationDaysTakenPreLeave ?? 0,
      chainedNextElternzeitEndDate,
    });
  });

  const firstPreg = sortedPregs[0];
  const firstPosOrdinal =
    firstPreg.positiveTestCalendarYear * 12 + (firstPreg.positiveTestCalendarMonth - 1);
  const formatRelativeMx = (iso: IsoCalendarDate): string => {
    const parts = parseIsoDateParts(iso);
    const ord = parts.year * 12 + (parts.month - 1);
    const diff = ord - firstPosOrdinal;
    const mx = diff < 0 ? diff : diff + 1;
    return `M${mx}`;
  };

  const allDeadlines = analyses
    .flatMap((a) => a.deadlines)
    .sort((a, b) => diffCalendarDays(b.targetDate, a.targetDate));
  const warningCount = allDeadlines.filter(
    (item) => item.severity === StatutoryDeadlineSeverity.Warning,
  ).length;
  const visibleDeadlines = allDeadlines.filter((item) => matchesFilter(item, filter));

  return (
    <section
      className="sat-section"
      aria-label="Statutory Deadlines and Vacation Optimization"
      data-testid="statutory-action-timeline"
    >
      <div className="sat-header">
        <div>
          <div className="sat-header__eyebrow">
            Action Calendar · Deadlines &amp; Vacation Optimizer
          </div>
          <h2 className="sat-header__title">
            Statutory Filing Deadlines, Switches &amp; Vacation Days
          </h2>
          <p className="sat-header__subtitle">
            Exact German submission windows indexed by pregnancy-relative month (M1 = Child #1
            positive test) and absolute calendar date for ELSTER switches, Mutterschutz,
            Elternzeit, part-time notices, Elterngeld, Kindergeld, and § 17 BEEG vacation.
          </p>
        </div>

        <div className="sat-filter-row" role="tablist" aria-label="Filter statutory deadlines">
          {[
            { id: DeadlineFilterTab.All,
              label: `All (${allDeadlines.length})` },
            { id: DeadlineFilterTab.Warnings,
              label: `Warnings (${warningCount})` },
            { id: DeadlineFilterTab.Tax,
              label: "Tax Switches" },
            { id: DeadlineFilterTab.Employer,
              label: "Employer HR" },
            { id: DeadlineFilterTab.Benefits,
              label: "Benefits & Vacation" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              className={`sat-filter-btn${filter === tab.id ? " is-active" : ""}`}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {anyMissingExactDueDate && (
        <div className="sat-hint-banner">
          Tip: Enter your exact <strong>Expected Due Date (DD.MM.YYYY)</strong> in the Child
          Pregnancy card above (and exact return date on any Working-Time Schedule) to unlock
          day-exact Mutterschutz proration, BEEG Life-Month checks, and exact 7-week filing dates.
          Defaulting to the 15th of the delivery month where omitted.
        </div>
      )}

      {/* Vacation Day Optimization Cards (one per modeled child) */}
      <div className="sat-vacation-grid">
        {analyses.map((analysis) => {
          const vac = analysis.vacationAnalysis;
          const opt = vac.monthEndOptimization;
          return (
            <div key={`vac-c${analysis.childIndex}`} className="sat-vacation-card">
              <div className="sat-vacation-card__top">
                <span className="sat-vacation-card__title">
                  Child #{analysis.childIndex} Vacation Optimizer (§ 24 MuSchG · § 17 BEEG)
                </span>
                <span
                  className={
                    opt.hasMonthEndTrap
                      ? "sat-pill sat-pill--warning"
                      : "sat-pill sat-pill--optimal"
                  }
                >
                  {opt.hasMonthEndTrap
                    ? `Save +${opt.vacationDaysDelta}d`
                    : opt.vacationDaysDelta > 0
                      ? `+${opt.vacationDaysDelta}d Protected`
                      : "100% Accrued"}
                </span>
              </div>

              <div className="sat-vacation-stats tabular-nums">
                <div className="sat-stat">
                  <div className="sat-stat__label">Post-Cut Entitlement</div>
                  <div className="sat-stat__value">
                    {vac.birthYearEntitledDaysAfterCut}d / {vac.annualVacationDays}d
                  </div>
                </div>
                <div className="sat-stat">
                  <div className="sat-stat__label">Full Months Cut</div>
                  <div className="sat-stat__value">
                    {vac.totalFullCalendarMonthsCut} / 12 (-{vac.totalStatutoryReductionDays}d)
                  </div>
                </div>
                <div className="sat-stat">
                  <div className="sat-stat__label">Carryover Expiry</div>
                  <div className="sat-stat__value">
                    {formatGermanDate(vac.carryoverExpiryDate)}
                  </div>
                </div>
              </div>

              <div
                className={`sat-vacation-callout ${
                  opt.hasMonthEndTrap
                    ? "sat-vacation-callout--warning"
                    : "sat-vacation-callout--optimal"
                }`}
              >
                {opt.explanation}
                {vac.birthYearOverusedDays > 0 && (
                  <>
                    {" "}
                    Note (§ 17 Abs. 4 BEEG): Taking {vac.vacationDaysTakenPreLeave}d pre-leave
                    exceeds post-cut entitlement by {vac.birthYearOverusedDays}d (deductible from
                    next year&apos;s vacation, zero cash clawback).
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Prioritized Statutory Deadlines List */}
      <div className="sat-list">
        {visibleDeadlines.length === 0 ? (
          <div className="sat-hint-banner">
            No items match the selected filter.
          </div>
        ) : (
          visibleDeadlines.map((item) => (
            <article
              key={item.deadlineId}
              className={`sat-item${
                item.severity === StatutoryDeadlineSeverity.Warning
                  ? " sat-item--warning"
                  : item.severity === StatutoryDeadlineSeverity.Optimal
                    ? " sat-item--optimal"
                    : ""
              }`}
            >
              <div className="sat-item__date-col tabular-nums">
                <span className="sat-item__date">
                  {formatRelativeMx(item.targetDate)} · {formatGermanDate(item.targetDate)}
                </span>
                {item.windowStartDate && item.windowEndDate && (
                  <span className="sat-item__window">
                    Window: {formatGermanDate(item.windowStartDate)} –{" "}
                    {formatGermanDate(item.windowEndDate)}
                  </span>
                )}
              </div>
              <div className="sat-item__body">
                <div className="sat-item__head">
                  <span className={severityPillClass(item.severity)}>
                    {severityLabel(item.severity)}
                  </span>
                  <span className="sat-item__title">{item.title}</span>
                </div>
                <div className="sat-item__meta">
                  <span>To: {item.recipient}</span>
                  <span>·</span>
                  <LawRefLink lawId={item.lawId} label={item.statutoryCitation} />
                </div>
                <p className="sat-item__summary">{item.summary}</p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
