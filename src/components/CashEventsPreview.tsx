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
  type PersonId,
} from "#engine/lifeProfile/person";
import {
  CashDirection,
} from "#engine/lifeProfile/cashEvent";
import {
  parseAmount,
} from "#engine/lifeProfile/cashAmount";
import {
  toReplayMonth,
} from "#engine/lifeProfile/monthlyReplay";
import {
  projectCashEvents,
} from "#engine/lifeProfile/cashEventProjection";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";

export default function CashEventsPreview({ events, personId, date, includePlanned }: { readonly events: readonly LifeEvent<unknown>[];
  readonly personId: PersonId;
  readonly date: string;
  readonly includePlanned: boolean }): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [opening, setOpening] = useState("");
  let rows: ReturnType<typeof projectCashEvents> = [];
  let error = false;
  if (expanded && date) {
    try {
      const start = toReplayMonth(Number(date.slice(0, 4)), Number(date.slice(5, 7)));
      const last = start.year * 12 + start.month - 1 + 5;
      const through = toReplayMonth(Math.floor(last / 12), last % 12 + 1);
      rows = projectCashEvents(start, start, through, parseAmount(opening, true), events, personId, includePlanned);
    }
    catch {
      error = true;
    }
  }
  return <section className="life-monthly" aria-label="Cash events projection">
    <button type="button" className="ui-btn" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      {expanded ? "Hide cash events projection" : "Project recorded cash events"}
    </button>
    {expanded && <>
      <p>This preview includes only this person's cash entries from the six displayed months. It excludes the separate recurring what-if assumptions and all unrecorded activity; a month with no entries adds nothing. {includePlanned ? "Planned entries are included." : "Planned entries are excluded."} The opening balance is a temporary manual assumption, not a recorded bank balance. Negative balances indicate a shortfall; no funding is assumed.</p>
      <label className="life-people__field">Opening balance for cash events (€)
        <input type="number" step="0.01" value={opening} onInput={(event) => setOpening(event.currentTarget.value)} />
      </label>
      {error ? <p role="status">Check the date, opening amount and cash event totals.</p> : !date || opening.trim() === "" ? <p>Choose a view date and enter an opening balance to calculate this preview.</p>
        : <div className="life-monthly__scroll"><table>
          <caption>Cash events only · estimated balance</caption>
          <thead><tr><th scope="col">Month</th><th scope="col">Included sources</th><th scope="col" className="life-monthly__amount">Opening</th><th scope="col" className="life-monthly__amount">Closing</th></tr></thead>
          <tbody>{rows.map(({ month, state }) => <tr key={month.id}>
            <th scope="row">{String(month.month).padStart(2, "0")}/{month.year}</th>
            <td>{state.contribution?.sources.length ? state.contribution.sources.map((entry) => <div key={entry.id}>
              {entry.date} · {entry.payload.title} · {entry.status === LifeEventStatus.Actual ? "Happened" : "Planned"} · {entry.payload.direction === CashDirection.Inflow ? "Inflow" : "Expense"} {formatIntegerEuroCents(entry.payload.amount)} · User entered
            </div>) : "No entries included"}</td>
            <td className="life-monthly__amount">{state.opening === undefined ? "Unknown" : formatIntegerEuroCents(state.opening)}</td>
            <td className="life-monthly__amount">{state.closing === undefined ? "Unknown" : formatIntegerEuroCents(state.closing)}</td>
          </tr>)}</tbody>
        </table></div>}
    </>}
  </section>;
}
