import {
  type JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  type LifeEvent,
  LifeEventStatus,
} from "#engine/lifeProfile/timeline";
import {
  CashDirection,
} from "#engine/lifeProfile/cashEvent";
import {
  reconciledPlannedByActualId,
} from "#engine/lifeProfile/cashReconciliation";
import {
  cashEventsForMonth,
  reconciledPlannedCashEventsForMonth,
} from "#engine/lifeProfile/cashEventView";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";
import {
  formatCashReconciliationNote,
} from "#utils/cashReconciliationFormat";
import {
  type PersonId,
  toLifeDate,
} from "#engine/lifeProfile/person";
import {
  ProjectedFactStatus,
} from "#engine/lifeProfile/datedFacts";
import {
  type MonthHorizon,
  MonthTimelinePhase,
  MonthUncertaintyFlag,
  assessMonthUncertainties,
  buildReplayWindow,
  classifyMonthPhase,
  toMonthHorizon,
} from "#engine/lifeProfile/monthlyRange";
import {
  type ReplayMonth,
  toReplayMonth,
} from "#engine/lifeProfile/monthlyReplay";
import {
  recordedLifeMonths,
} from "#engine/lifeProfile/recordedLifeMonths";
import {
  SalaryPeriod,
} from "#engine/types";
import CashFlowPreview from "#components/CashFlowPreview";
import CashEventsPreview from "#components/CashEventsPreview";
import "./LifeMonthlyView.css";

export interface LifeMonthlyViewProps {
  readonly events: readonly LifeEvent<unknown>[];
  readonly personId: PersonId;
  readonly date: string;
  readonly onDateChange: (date: string) => void;
  readonly includePlanned: boolean;
  readonly onIncludePlannedChange: (value: boolean) => void;
}

const HORIZON_OPTIONS: readonly MonthHorizon[] = [
  toMonthHorizon(3),
  toMonthHorizon(6),
  toMonthHorizon(12),
  toMonthHorizon(24),
];

function formatPhase(phase: MonthTimelinePhase): string {
  if (phase === MonthTimelinePhase.History) {
    return "History";
  }
  if (phase === MonthTimelinePhase.Current) {
    return "Current month";
  }
  return "Forecast";
}

function formatUncertainty(flag: MonthUncertaintyFlag): string {
  if (flag === MonthUncertaintyFlag.AmbiguousEmployment) {
    return "Employment date/pay uncertain";
  }
  if (flag === MonthUncertaintyFlag.AmbiguousResidence) {
    return "Residence date uncertain";
  }
  if (flag === MonthUncertaintyFlag.IncludesPlannedCash) {
    return "Includes unconfirmed planned cash";
  }
  return "Opening balance missing";
}

function firstReplayMonth(events: readonly LifeEvent<unknown>[], view: ReplayMonth): ReplayMonth {
  let first = view.year * 12 + view.month - 1;
  for (const event of events) {
    if (!event.date) {
      continue;
    }
    const year = Number(event.date.slice(0, 4));
    const month = event.date.length >= 7 ? Number(event.date.slice(5, 7)) : 1;
    if (year >= 1900 && year <= 2100) {
      first = Math.min(first, year * 12 + month - 1);
    }
  }
  return toReplayMonth(Math.floor(first / 12), first % 12 + 1);
}

export default function LifeMonthlyView({ events, personId, date, onDateChange, includePlanned, onIncludePlannedChange }: LifeMonthlyViewProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [monthCount, setMonthCount] = useState<MonthHorizon>(toMonthHorizon(6));
  const now = new Date();
  const today = toLifeDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`);
  let rows: ReturnType<typeof recordedLifeMonths> = [];
  let error = false;
  if (expanded && date) {
    try {
      const start = toReplayMonth(Number(date.slice(0, 4)), Number(date.slice(5, 7)));
      const window = buildReplayWindow(start, monthCount);
      rows = recordedLifeMonths(events, personId, firstReplayMonth(events, start), window.start, window.through, includePlanned);
    }
    catch {
      error = true;
    }
  }
  const plannedByActual = reconciledPlannedByActualId(events, personId);
  return <section className="life-monthly" aria-label="Monthly recorded facts">
    <button type="button" className="ui-btn" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      {expanded ? "Hide monthly view" : `View ${monthCount} months`}
    </button>
    {expanded && <>
      <div className="life-people__form">
        <label className="life-people__field">Monthly range
          <select value={String(monthCount)} onChange={(event) => setMonthCount(toMonthHorizon(Number(event.currentTarget.value)))}>
            {HORIZON_OPTIONS.map((count) => <option key={count} value={String(count)}>{count} months</option>)}
          </select>
        </label>
      </div>
      <p>Recorded facts at each month end across {monthCount} months, starting with the selected view date. {includePlanned ? "Includes open planned events." : "Planned events are excluded."} Cash entries are user-entered and may not be a complete transaction history; reconciled planned entries are kept for comparison and counted once.</p>
      {error || !date ? <p>Choose a view date within the supported calendar range.</p> : <div className="life-monthly__scroll">
        <table>
          <thead><tr><th>Month</th><th>Period</th><th>Employment</th><th>Residence</th><th>Cash entries</th><th>Uncertainty</th></tr></thead>
          <tbody>{rows.map(({ month, state }) => {
            const cash = cashEventsForMonth(events, personId, month, includePlanned);
            const reconciledPlans = reconciledPlannedCashEventsForMonth(events, personId, month);
            const phase = classifyMonthPhase(month, today);
            const uncertainties = assessMonthUncertainties({
              state,
              activeCashEvents: cash,
            });
            return <tr key={month.id}>
              <th scope="row">{String(month.month).padStart(2, "0")}/{month.year}</th>
              <td>{formatPhase(phase)}</td>
              <td>{state.jobs.length === 0 ? "No job recorded" : state.jobs.map((job) => <div key={job.jobId}>
                {job.employer}: {job.existence === ProjectedFactStatus.Ambiguous ? "start uncertain"
                  : job.gross.status === ProjectedFactStatus.Known && job.gross.value
                    ? `${job.gross.value.amount} € / ${job.gross.value.period === SalaryPeriod.Monthly ? "month" : "year"} gross`
                    : job.gross.status === ProjectedFactStatus.Ambiguous ? "pay uncertain" : "pay not recorded"}
              </div>)}</td>
              <td>{state.residence.status === ProjectedFactStatus.Known ? state.residence.value?.location
                : state.residence.status === ProjectedFactStatus.Ambiguous ? "Uncertain" : "Not recorded"}</td>
              <td>{cash.map((entry) => {
                const linkedPlan = plannedByActual.get(entry.id);
                return <div key={entry.id}>
                  {entry.date} · {entry.payload.title} · {entry.status === LifeEventStatus.Actual ? "Happened" : "Planned"} · {entry.payload.direction === CashDirection.Inflow ? "Inflow" : "Expense"} {formatIntegerEuroCents(entry.payload.amount)}{linkedPlan ? ` · ${formatCashReconciliationNote(linkedPlan, entry)}` : ""} · User entered
                </div>;
              })}{reconciledPlans.map(({ planned, actual }) => <div key={planned.id}>
                {planned.date} · {planned.payload.title} · Planned {formatIntegerEuroCents(planned.payload.amount)} · Replaced by actual on {actual.date} · Not counted twice
              </div>)}{cash.length === 0 && reconciledPlans.length === 0 && "No cash entries recorded"}</td>
              <td>{uncertainties.length === 0 ? "None flagged" : uncertainties.map((flag) => <div key={flag}>{formatUncertainty(flag)}</div>)}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
      <CashFlowPreview key={personId} events={events} personId={personId} date={date} onDateChange={onDateChange} includePlanned={includePlanned} monthCount={monthCount} referenceDate={today} />
      <CashEventsPreview key={personId} events={events} personId={personId} date={date} onDateChange={onDateChange} includePlanned={includePlanned} onIncludePlannedChange={onIncludePlannedChange} monthCount={monthCount} referenceDate={today} />
    </>}
  </section>;
}
