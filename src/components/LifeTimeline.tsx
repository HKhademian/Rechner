import {
  type JSX,
} from "preact";
import {
  useEffect,
  useState,
} from "preact/hooks";
import {
  type LifePerson,
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
  type LifeEventId,
  LifeEventStatus,
  orderLifeEvents,
  toLifeEventDate,
  toLifeEventId,
  toLifeEventStatus,
} from "#engine/lifeProfile/timeline";
import {
  noteEventModule,
} from "#engine/lifeProfile/eventModules";
import {
  PeopleRecordStatus,
} from "#engine/lifeProfile/peopleRecord";
import {
  readPeople,
} from "#engine/lifeProfile/peopleStorage";
import {
  TimelineRecordStatus,
} from "#engine/lifeProfile/timelineRecord";
import {
  readTimeline,
  writeTimeline,
} from "#engine/lifeProfile/timelineStorage";
import "./LifePeople.css";

const DatePrecision = { Unknown: "unknown",
  Year: "year",
  Month: "month",
  Day: "day" } as const;
type DatePrecision = (typeof DatePrecision)[keyof typeof DatePrecision];

export default function LifeTimeline({ peopleRevision }: { readonly peopleRevision: number }): JSX.Element {
  const [people, setPeople] = useState<readonly LifePerson[]>([]);
  const [events, setEvents] = useState<readonly LifeEvent<unknown>[]>([]);
  const [personId, setPersonId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [datePrecision, setDatePrecision] = useState<DatePrecision>(DatePrecision.Day);
  const [status, setStatus] = useState<LifeEventStatus>(LifeEventStatus.Planned);
  const [editing, setEditing] = useState<LifeEventId | undefined>();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const current = readPeople();
    if (current.status === PeopleRecordStatus.Valid) {
      setPeople(current.record?.people ?? []);
    }
    else if (current.status === PeopleRecordStatus.Missing) {
      setPeople([]);
    }
    else {
      setError("People data could not be read. Export your data before making changes.");
    }
  }, [peopleRevision]);

  useEffect(() => {
    const current = readTimeline();
    if (current.status === TimelineRecordStatus.Valid) {
      setEvents(current.record?.events ?? []);
    }
    else if (current.status !== TimelineRecordStatus.Missing) {
      setError("Timeline data could not be read. Export your data before making changes.");
      return;
    }
    setReady(true);
  }, []);

  function saveEvents(next: readonly LifeEvent<unknown>[]): boolean {
    const current = readTimeline();
    const unchanged = current.status === TimelineRecordStatus.Missing ? events.length === 0
      : current.status === TimelineRecordStatus.Valid && JSON.stringify(current.record?.events) === JSON.stringify(events);
    if (!unchanged) {
      setError("Timeline data changed elsewhere. Reload this page before editing.");
      return false;
    }
    if (!writeTimeline({ version: 2,
      events: next })) {
      setError("Could not save the timeline. Check the selected person and your storage.");
      return false;
    }
    setEvents(next);
    setError("");
    return true;
  }

  function resetForm(): void {
    setEditing(undefined);
    setTitle("");
    setDate("");
    setDatePrecision(DatePrecision.Day);
    setStatus(LifeEventStatus.Planned);
  }

  function save(event: JSX.TargetedEvent<HTMLFormElement, Event>): void {
    event.preventDefault();
    try {
      const expectedLength = datePrecision === DatePrecision.Year ? 4 : datePrecision === DatePrecision.Month ? 7 : 10;
      if (datePrecision !== DatePrecision.Unknown && date.length !== expectedLength) {
        throw new TypeError("Date does not match its precision.");
      }
      const item: LifeEvent<unknown> = { id: editing ?? toLifeEventId(crypto.randomUUID()),
        kind: noteEventModule.kind,
        personId: toPersonId(personId),
        ...(datePrecision === DatePrecision.Unknown ? {} : { date: toLifeEventDate(date) }),
        status,
        payload: noteEventModule.parsePayload({ title: title.trim() }) };
      const next = editing ? events.map((entry) => entry.id === editing ? item : entry) : [...events, item];
      if (saveEvents(next)) {
        resetForm();
      }
    }
    catch {
      setError("Choose a person and date and enter an event name.");
    }
  }

  return <section className="ui-card life-people" aria-labelledby="life-timeline-heading">
    <h2 id="life-timeline-heading">Life timeline</h2>
    <p>Record a life event or something you are planning. Events do not change calculator inputs yet.</p>
    {error && <p role="alert">{error}</p>}
    {ready && <>
      {events.length === 0 ? <p>No events added yet.</p> : <ul className="life-people__list">
        {orderLifeEvents(events).map((event) => {
          const payload = event.kind === noteEventModule.kind ? noteEventModule.parsePayload(event.payload) : undefined;
          const label = payload?.title ?? "Life event";
          const person = people.find((entry) => entry.id === event.personId);
          return <li key={event.id}>
            <div><strong>{label}</strong><p>{event.date ? `${event.date}${event.date.length === 4 ? " (year only)" : event.date.length === 7 ? " (month only)" : ""}` : "Date unknown"} · {person?.name ?? "Person unavailable"} · {event.status === LifeEventStatus.Planned ? "Planned" : "Happened"}</p></div>
            <div className="life-people__actions">
              {payload && <button className="ui-btn ui-btn--sm" type="button" aria-label={`Edit ${label}`} onClick={() => {
                setEditing(event.id);
                setPersonId(event.personId);
                setTitle(payload.title);
                setDate(event.date ?? "");
                setDatePrecision(!event.date ? DatePrecision.Unknown : event.date.length === 4 ? DatePrecision.Year : event.date.length === 7 ? DatePrecision.Month : DatePrecision.Day);
                setStatus(event.status);
              }}>Edit</button>}
              <button className="ui-btn ui-btn--sm" type="button" aria-label={`Remove ${label}`} onClick={() => {
                if (saveEvents(events.filter((entry) => entry.id !== event.id)) && editing === event.id) {
                  resetForm();
                }
              }}>Remove</button>
            </div>
          </li>;
        })}
      </ul>}
      {people.length === 0 ? <p>Add a person above to start your timeline.</p> : <form className="life-people__form" onSubmit={save}>
        <label className="life-people__field">Person
          <select required value={personId} onChange={(event) => setPersonId(event.currentTarget.value)}>
            <option value="">Choose a person</option>
            {people.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}
          </select>
        </label>
        <label className="life-people__field">Event
          <input required value={title} onInput={(event) => setTitle(event.currentTarget.value)} />
        </label>
        <label className="life-people__field">Date precision
          <select value={datePrecision} onChange={(event) => {
            const value = event.currentTarget.value;
            if (Object.values(DatePrecision).includes(value as DatePrecision)) {
              setDatePrecision(value as DatePrecision);
              setDate("");
            }
          }}>
            <option value={DatePrecision.Day}>Exact date</option>
            <option value={DatePrecision.Month}>Month only</option>
            <option value={DatePrecision.Year}>Year only</option>
            <option value={DatePrecision.Unknown}>Unknown</option>
          </select>
        </label>
        {datePrecision !== DatePrecision.Unknown && <label className="life-people__field">Date
          <input required type={datePrecision === DatePrecision.Day ? "date" : datePrecision === DatePrecision.Month ? "month" : "text"}
            inputMode={datePrecision === DatePrecision.Year ? "numeric" : undefined}
            placeholder={datePrecision === DatePrecision.Year ? "YYYY" : undefined}
            value={date} onInput={(event) => setDate(event.currentTarget.value)} />
        </label>}
        <label className="life-people__field">Status
          <select value={status} onChange={(event) => setStatus(toLifeEventStatus(event.currentTarget.value))}>
            <option value={LifeEventStatus.Planned}>Planned</option>
            <option value={LifeEventStatus.Actual}>Happened</option>
          </select>
        </label>
        <button className="ui-btn ui-btn--primary" type="submit">{editing ? "Save event" : "Add event"}</button>
        {editing && <button className="ui-btn" type="button" onClick={resetForm}>Cancel</button>}
      </form>}
    </>}
  </section>;
}
