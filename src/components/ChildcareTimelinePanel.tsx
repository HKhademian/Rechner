import {
  type JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  toLifeDate,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
} from "#engine/lifeProfile/timeline";
import {
  type ChildcareTimelineSummary,
  ChildcareDeadlineKind,
  summarizeChildcareTimeline,
} from "#engine/lifeProfile/childcareTimeline";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";

export interface ChildcareTimelinePanelProps {
  readonly events: readonly LifeEvent<unknown>[];
  readonly date: string;
  readonly includePlanned: boolean;
}

function formatDeadlineKind(kind: ChildcareDeadlineKind): string {
  if (kind === ChildcareDeadlineKind.Application) {
    return "Application deadline";
  }
  if (kind === ChildcareDeadlineKind.Enrollment) {
    return "Enrollment deadline";
  }
  return "Desired start";
}

export default function ChildcareTimelinePanel({
  events,
  date,
  includePlanned,
}: ChildcareTimelinePanelProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);

  let summary: ChildcareTimelineSummary | undefined;
  if (expanded && date) {
    try {
      summary = summarizeChildcareTimeline({
        events,
        asOf: toLifeDate(date),
        includePlanned,
      });
    }
    catch {
      summary = undefined;
    }
  }

  return <section className="life-monthly" aria-label="Kita, Krippe and school planning">
    <button type="button" className="ui-btn" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      {expanded ? "Hide Kita, Krippe & school planner" : "Track Kita, Krippe & school options"}
    </button>
    {expanded && <>
      <p>Compare local Krippe, Kita and school options, application/enrollment deadlines and monthly fees. Municipal fee tables and vouchers vary locally; estimate tax deductibility in the <a href="/calculators/kita/">Kita &amp; Childcare calculator</a>.</p>
      {!summary ? <p>Select a valid view date above to summarize childcare and school options.</p> : summary.options.length === 0
        ? <p>No Kita, Krippe or school options recorded yet. Add them via the journey event form below.</p>
        : <>
          <p>
            <strong>Enrolled monthly total:</strong> {formatIntegerEuroCents(summary.enrolledMonthlyTotalCents)} ({formatIntegerEuroCents(summary.enrolledAnnualTotalCents)} / year)
            {summary.minShortlistedMonthlyCents !== undefined && summary.maxShortlistedMonthlyCents !== undefined
              ? ` · Shortlisted range: ${formatIntegerEuroCents(summary.minShortlistedMonthlyCents)}–${formatIntegerEuroCents(summary.maxShortlistedMonthlyCents)} / month`
              : ""}
          </p>
          <div className="life-monthly__scroll">
            <table>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Desired start</th>
                  <th>Monthly total</th>
                </tr>
              </thead>
              <tbody>
                {summary.options.map((opt) => <tr key={opt.eventId}>
                  <th scope="row">{opt.payload.providerName}{opt.payload.municipality ? ` (${opt.payload.municipality})` : ""}</th>
                  <td>{opt.payload.facilityKind}</td>
                  <td>{opt.payload.applicationStatus}</td>
                  <td>{opt.payload.desiredStartDate ?? "Not set"}</td>
                  <td>{opt.totalMonthlyCents > 0 ? formatIntegerEuroCents(opt.totalMonthlyCents) : "Not recorded"}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {summary.deadlines.length > 0 && <>
            <h4>Upcoming deadlines &amp; start dates</h4>
            <ul className="calc-explain__list">
              {summary.deadlines.map((item) => <li key={`${item.eventId}-${item.kind}`}>
                <strong>{item.providerName}</strong> ({formatDeadlineKind(item.kind)}): {item.date} ({item.overdue ? `${Math.abs(item.daysUntil)} days overdue` : `in ${item.daysUntil} days`})
              </li>)}
            </ul>
          </>}
        </>}
    </>}
  </section>;
}
