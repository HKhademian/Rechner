import type {
  JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  Badge,
  BadgeTone,
  EmptyState,
  SegmentedControl,
  WikiRefKind,
  WikiRefLink,
} from "#/components/ui/index.ts";
import {
  type IsoCalendarDate,
  StatutoryDeadlineCategory,
  StatutoryDeadlineSeverity,
  TargetPerson,
  formatGermanDate,
} from "#engine/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  buildIsoDate,
} from "#engine/formulas/pure/maternityAndLifeMonthFormulas";
import {
  type StatutoryDeadlineItem,
  type StatutoryDeadlinesFormulaResult,
  evaluateStatutoryDeadlinesFormula,
} from "#engine/formulas/pure/statutoryDeadlineFormulas";
import {
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";

const DeadlineTabFilter = {
  All: "all",
  Warnings: "warnings",
  Tax: "tax",
  Employer: "employer",
  Benefits: "benefits",
} as const;
type DeadlineTabFilter = (typeof DeadlineTabFilter)[keyof typeof DeadlineTabFilter];

function simMonthToIso(
  simMonth: number,
  startYear: number,
  startMonth: number,
): IsoCalendarDate {
  const elapsed = startMonth - 1 + (simMonth - 1);
  const y = startYear + Math.floor(elapsed / 12);
  const m = ((elapsed % 12) + 12) % 12 + 1;
  return buildIsoDate(y, m, 1);
}

/** Pure helper returning evaluated statutory deadlines for all planned births in the workbench. */
export function evaluateWorkbenchDeadlines(): readonly StatutoryDeadlinesFormulaResult[] {
  const s = workbenchState.value;
  const switches = s.customTaxClassSwitches;
  const hoursChanges = s.customWorkingHoursChanges ?? [];

  return s.customPregnancies.map((child, idx) => {
    const dueIso = child.expectedDueDate ?? simMonthToIso(
      child.calculatedDeliverySimulationMonth,
      s.startCalendarYear,
      s.startCalendarMonth,
    );
    const matchingSwitch = switches[idx] ?? switches[0];
    const motherReturn = hoursChanges.find(
      (hc) =>
        (hc.targetPerson === TargetPerson.Wife || hc.targetPerson === TargetPerson.Both) &&
        hc.effectiveSimulationMonth > child.calculatedDeliverySimulationMonth &&
        hc.effectiveDate !== undefined,
    );
    return evaluateStatutoryDeadlinesFormula({
      childIndex: child.childIndex,
      expectedDueDate: dueIso,
      isMultipleOrPrematureBirth: child.isMultipleOrPrematureBirth,
      taxSwitchIntoEffectiveDate: matchingSwitch
        ? simMonthToIso(matchingSwitch.effectiveSimulationMonth, s.startCalendarYear, s.startCalendarMonth)
        : undefined,
      taxSwitchRevertEffectiveDate: matchingSwitch?.revertSimulationMonth
        ? simMonthToIso(matchingSwitch.revertSimulationMonth, s.startCalendarYear, s.startCalendarMonth)
        : undefined,
      motherReturnToWorkDate: motherReturn?.effectiveDate,
      motherBasisLifeMonthsCount: 2 + (child.motherAllowanceMonthsCount ?? 10),
      fatherPartnerMonthsCount: child.fatherPartnerMonthsCount,
      motherAnnualVacationDays: child.motherAnnualVacationDays ?? 30,
      motherVacationDaysTakenPreLeave: child.motherVacationDaysTakenPreLeave ?? 0,
    });
  });
}

function severityTone(severity: StatutoryDeadlineSeverity): BadgeTone {
  switch (severity) {
    case StatutoryDeadlineSeverity.Warning:
      return BadgeTone.Loss;
    case StatutoryDeadlineSeverity.ActionNeeded:
      return BadgeTone.Warning;
    case StatutoryDeadlineSeverity.Optimal:
      return BadgeTone.Gain;
    default:
      return BadgeTone.Neutral;
  }
}

function matchesFilter(item: StatutoryDeadlineItem, filter: DeadlineTabFilter): boolean {
  switch (filter) {
    case DeadlineTabFilter.Warnings:
      return item.severity === StatutoryDeadlineSeverity.Warning;
    case DeadlineTabFilter.Tax:
      return item.category === StatutoryDeadlineCategory.TaxClassSwitch;
    case DeadlineTabFilter.Employer:
      return (
        item.category === StatutoryDeadlineCategory.Elternzeit ||
        item.category === StatutoryDeadlineCategory.WorkingHours ||
        item.category === StatutoryDeadlineCategory.Mutterschutz ||
        item.category === StatutoryDeadlineCategory.Vacation
      );
    case DeadlineTabFilter.Benefits:
      return (
        item.category === StatutoryDeadlineCategory.Elterngeld ||
        item.category === StatutoryDeadlineCategory.Kindergeld
      );
    default:
      return true;
  }
}

/** Tab 3: Statutory Action Deadlines & § 17 BEEG Annual Vacation Optimizer. */
export function DeadlinesTab(): JSX.Element {
  const [filter, setFilter] = useState<DeadlineTabFilter>(DeadlineTabFilter.All);
  const results = evaluateWorkbenchDeadlines();
  const allItems = results
    .flatMap((r) => r.deadlines)
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  const warningCount = allItems.filter((d) => d.severity === StatutoryDeadlineSeverity.Warning).length;
  const visible = allItems.filter((item) => matchesFilter(item, filter));

  if (results.length === 0) {
    return (
      <EmptyState
        title="No births scheduled"
        description="Add a child in Section 2 to generate statutory Elterngeld, Elternzeit, Mutterschutz, and § 17 BEEG vacation deadlines."
      />
    );
  }

  return (
    <>
      <div className="plw-toolbar">
        <SegmentedControl
          compact
          label="Filter statutory deadlines"
          value={filter}
          options={[
            {
              value: DeadlineTabFilter.All,
              label: `All (${allItems.length})`,
            },
            {
              value: DeadlineTabFilter.Warnings,
              label: `Warnings (${warningCount})`,
            },
            {
              value: DeadlineTabFilter.Tax,
              label: "Tax",
            },
            {
              value: DeadlineTabFilter.Employer,
              label: "Employer & § 17",
            },
            {
              value: DeadlineTabFilter.Benefits,
              label: "Benefits",
            },
          ]}
          onChange={setFilter}
        />
      </div>

      {results.map((res) => (
        <div key={res.childIndex} className="plw-modal-section">
          <div className="plw-toolbar">
            <h3 className="plw-modal-section__title">
              Child {res.childIndex} · Annual Vacation (§ 17 BEEG ·{" "}
              <WikiRefLink target={{ kind: WikiRefKind.Law,
                id: LawId.MuSchG_3 }}>Mutterschutz</WikiRefLink>
              {" "}ends {formatGermanDate(res.mutterschutzEnd)})
            </h3>
            <Badge tone={BadgeTone.Gain}>
              {res.vacationAnalysis.birthYearEntitledDaysAfterCut} days retained in birth year
            </Badge>
          </div>
          <p className="plw-card__hint">
            Annual vacation (§ 17 BEEG) may only be reduced by 1/12 for each <em>full</em> calendar month of Elternzeit.
            For Child {res.childIndex}, Mutterschutz runs{" "}
            <strong>{formatGermanDate(res.mutterschutzStart)} – {formatGermanDate(res.mutterschutzEnd)}</strong>{" "}
            and Elternzeit begins <strong>{formatGermanDate(res.firstElternzeitDay)}</strong>.{" "}
            {res.vacationAnalysis.monthEndOptimization.explanation}
          </p>
          <div className="plw-vacation-grid">
            <div className="plw-modal-item">
              <span>Protected Birth-Year Entitlement</span>
              <strong className="tabular-nums">{res.vacationAnalysis.birthYearEntitledDaysAfterCut} days</strong>
            </div>
            <div className="plw-modal-item">
              <span>Total 1/12 Statutory Cut</span>
              <strong className="tabular-nums">-{res.vacationAnalysis.totalStatutoryReductionDays} days</strong>
            </div>
            <div className="plw-modal-item">
              <span>Carryover (valid until {formatGermanDate(res.vacationAnalysis.carryoverExpiryDate)})</span>
              <strong className="tabular-nums">{res.vacationAnalysis.remainingUnusedCarryoverDays} days</strong>
            </div>
          </div>
        </div>
      ))}

      <div className="plw-deadline-list">
        {visible.map((item) => (
          <article key={item.deadlineId} className="plw-deadline-card">
            <div className="plw-deadline-card__top">
              <span className="plw-deadline-card__title">
                {formatGermanDate(item.targetDate)} · {item.title}
              </span>
              <div className="plw-toolbar__group">
                <Badge tone={severityTone(item.severity)}>{item.severity}</Badge>
                <WikiRefLink target={{ kind: WikiRefKind.Law,
                  id: item.lawId }}>{item.statutoryCitation}</WikiRefLink>
              </div>
            </div>
            <p className="plw-deadline-card__desc">
              <strong>Recipient:</strong> {item.recipient} — {item.summary}
            </p>
          </article>
        ))}
      </div>
    </>
  );
}
