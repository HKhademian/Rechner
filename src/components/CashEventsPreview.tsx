import {
  type JSX,
} from "preact";
import {
  useEffect,
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
  type CashEventPayload,
  CashDirection,
} from "#engine/lifeProfile/cashEvent";
import {
  parseAmount,
  amountText,
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
import {
  type EventProjection,
  type EventProjectionRecord,
  EventProjectionStatus,
  toEventProjectionId,
  eventProjectionSources,
  describeEventChanges,
  eventProjectionChangeDetails,
} from "#engine/lifeProfile/eventProjectionRecord";
import {
  readEventProjections,
  writeEventProjections,
} from "#engine/lifeProfile/eventProjectionStorage";
import {
  readTimeline,
} from "#engine/lifeProfile/timelineStorage";
import {
  TimelineRecordStatus,
} from "#engine/lifeProfile/timelineRecord";

export default function CashEventsPreview({ events, personId, date, includePlanned, onDateChange, onIncludePlannedChange }: { readonly events: readonly LifeEvent<unknown>[];
  readonly personId: PersonId;
  readonly date: string;
  readonly includePlanned: boolean;
  readonly onDateChange: (date: string) => void;
  readonly onIncludePlannedChange: (value: boolean) => void }): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [opening, setOpening] = useState("");
  const [saved, setSaved] = useState<EventProjectionRecord>({ version: 1,
    projections: [] });
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState<EventProjection["id"] | undefined>();
  const [message, setMessage] = useState("");
  useEffect(() => {
    const decoded = readEventProjections();
    if (decoded.status === EventProjectionStatus.Valid && decoded.record) {
      setSaved(decoded.record);
    }
    else if (decoded.status !== EventProjectionStatus.Missing) {
      setMessage("Saved event projections could not be read. Export your data before making changes.");
      return;
    }
    setReady(true);
  }, []);
  const selected = saved.projections.find((projection) => projection.id === selectedId);
  const changes = selected ? describeEventChanges(selected, events) : undefined;
  const details = selected ? eventProjectionChangeDetails(selected, events) : undefined;
  function describeSource(entry: LifeEvent<CashEventPayload>): string {
    return `${entry.payload.title} · ${entry.date} · ${entry.status === LifeEventStatus.Actual ? "Happened" : "Planned"} · ${entry.payload.direction === CashDirection.Inflow ? "Inflow" : "Expense"} ${formatIntegerEuroCents(entry.payload.amount)}`;
  }
  let openingChanged: boolean;
  try {
    openingChanged = selected !== undefined && parseAmount(opening, true) !== selected.opening;
  }
  catch {
    openingChanged = true;
  }
  function save(): void {
    try {
      const value = parseAmount(opening, true);
      if (!name.trim() || value === undefined) {
        throw new TypeError();
      }
      const currentTimeline = readTimeline();
      if ((currentTimeline.status === TimelineRecordStatus.Missing ? events.length !== 0
        : currentTimeline.status !== TimelineRecordStatus.Valid || JSON.stringify(currentTimeline.record?.events) !== JSON.stringify(events))) {
        setMessage("Timeline data changed elsewhere. Reload before saving this projection.");
        return;
      }
      const projection: EventProjection = { id: selectedId ?? toEventProjectionId(crypto.randomUUID()),
        name: name.trim(),
        personId,
        origin: date.slice(0, 7),
        opening: value,
        includePlanned,
        sources: eventProjectionSources(events, personId, date.slice(0, 7)) };
      const next: EventProjectionRecord = { version: 1,
        projections: selectedId ? saved.projections.map((entry) => entry.id === selectedId ? projection : entry) : [...saved.projections, projection] };
      if (!writeEventProjections(next, saved)) {
        setMessage("Could not save. Data may have changed elsewhere or storage may be unavailable; reload or export your data.");
        return;
      }
      setSaved(next);
      setSelectedId(projection.id);
      setName(projection.name);
      setMessage("Projection saved.");
    }
    catch {
      setMessage("Enter a name, valid view date and opening balance before saving.");
    }
  }
  function load(id: string): void {
    const projection = saved.projections.find((entry) => entry.id === id && entry.personId === personId);
    if (!projection) {
      return;
    }
    setSelectedId(projection.id);
    setName(projection.name);
    setOpening(amountText(projection.opening));
    onDateChange(`${projection.origin}-01`);
    onIncludePlannedChange(projection.includePlanned);
    setMessage("");
  }
  function remove(): void {
    if (!selectedId) {
      return;
    }
    const next: EventProjectionRecord = { version: 1,
      projections: saved.projections.filter((entry) => entry.id !== selectedId) };
    if (!writeEventProjections(next, saved)) {
      setMessage("Could not remove the projection. Data may have changed elsewhere; reload or export your data.");
      return;
    }
    setSaved(next);
    setSelectedId(undefined);
    setName("");
    setMessage("Projection removed. Timeline entries remain unchanged.");
  }
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
      <p>This preview includes only this person's cash entries from the six displayed months. It excludes the separate recurring what-if assumptions and all unrecorded activity; a month with no entries adds nothing. {includePlanned ? "Planned entries are included. Update a planned entry when it happens to avoid counting it twice." : "Planned entries are excluded."} The opening balance is a manual assumption, not a recorded bank balance. Negative balances indicate a shortfall; no funding is assumed.</p>
      <label className="life-people__field">Opening balance for cash events (€)
        <input type="number" step="0.01" value={opening} onInput={(event) => setOpening(event.currentTarget.value)} />
      </label>
      <div className="life-people__form">
        <label className="life-people__field">Event projection name<input value={name} onInput={(event) => setName(event.currentTarget.value)} /></label>
        <button type="button" className="ui-btn" disabled={!ready} onClick={save}>{selectedId ? "Update event projection" : "Save event projection"}</button>
        {selectedId && <button type="button" className="ui-btn" onClick={() => {
          setSelectedId(undefined); setName(""); setMessage("");
        }}>Save as new</button>}
        {selectedId && <button type="button" className="ui-btn" onClick={remove}>Remove saved projection</button>}
        {saved.projections.some((entry) => entry.personId === personId) && <label className="life-people__field">Load event projection
          <select value="" onChange={(event) => load(event.currentTarget.value)}><option value="">Choose a projection</option>
            {saved.projections.filter((entry) => entry.personId === personId).map((entry) => <option value={entry.id} key={entry.id}>{entry.name} · {entry.origin}</option>)}
          </select>
        </label>}
      </div>
      <p>Saved projections use the selected storage mode; page-only data is lost on reload. A saved projection remembers its inputs and the cash entries present at save time.</p>
      {message && <p role="status">{message}</p>}
      {selected && changes && <p role="status">{changes.added || changes.changed || changes.removed
        ? `Since this projection was saved: ${changes.added} added, ${changes.changed} changed, ${changes.removed} removed cash entries in its period. Results below use the current timeline.`
        : "The cash entries in this projection's saved period have not changed since saving."}
      {(date.slice(0, 7) !== selected.origin || includePlanned !== selected.includePlanned || openingChanged) && " Current inputs differ from the saved projection."}
      </p>}
      {details && (details.added.length > 0 || details.changed.length > 0 || details.removed.length > 0) && <details>
        <summary>Review changed cash entries</summary>
        <ul>
          {details.added.map((entry) => <li key={entry.id}>Added: {describeSource(entry)}</li>)}
          {details.changed.map(({ before, after }) => <li key={after.id}>Changed: {describeSource(before)} → {describeSource(after)}</li>)}
          {details.removed.map((entry) => <li key={entry.id}>Removed: {describeSource(entry)}</li>)}
        </ul>
      </details>}
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
