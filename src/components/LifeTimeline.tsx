import {
  type JSX,
} from "preact";
import {
  useEffect,
  useState,
} from "preact/hooks";
import {
  type LifePerson,
  toLifeDate,
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
  jobChangedModule,
  jobStartedModule,
} from "#engine/lifeProfile/employmentEvent";
import {
  type SalaryPeriod,
  SalaryPeriod as PayPeriod,
  toSalaryPeriod,
} from "#engine/types";
import {
  ProjectedFactStatus,
  projectEmploymentAtDate,
} from "#engine/lifeProfile/employmentProjection";
import LifeMonthlyView from "#components/LifeMonthlyView";
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
const EntryType = { Note: "note",
  Job: "job",
  JobChange: "job-change" } as const;
type EntryType = (typeof EntryType)[keyof typeof EntryType];

export default function LifeTimeline({ peopleRevision }: { readonly peopleRevision: number }): JSX.Element {
  const [people, setPeople] = useState<readonly LifePerson[]>([]);
  const [events, setEvents] = useState<readonly LifeEvent<unknown>[]>([]);
  const [personId, setPersonId] = useState("");
  const [viewPersonId, setViewPersonId] = useState("");
  const [viewDate, setViewDate] = useState("");
  const [includePlanned, setIncludePlanned] = useState(false);
  const [title, setTitle] = useState("");
  const [entryType, setEntryType] = useState<EntryType>(EntryType.Note);
  const [gross, setGross] = useState("");
  const [grossPeriod, setGrossPeriod] = useState<SalaryPeriod>(PayPeriod.Monthly);
  const [hours, setHours] = useState("");
  const [jobId, setJobId] = useState("");
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
      setViewPersonId((selected) => current.record?.people.some((person) => person.id === selected)
        ? selected : current.record?.people[0]?.id ?? "");
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
    const now = new Date();
    setViewDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`);
  }, []);

  let jobs: ReturnType<typeof projectEmploymentAtDate> = [];
  try {
    if (viewPersonId && viewDate) {
      jobs = projectEmploymentAtDate(events, toPersonId(viewPersonId), toLifeDate(viewDate), includePlanned);
    }
  }
  catch {
    jobs = [];
  }

  function sourceLabel(id: LifeEventId | undefined): string {
    const source = events.find((event) => event.id === id);
    return source ? `${source.kind === jobStartedModule.kind ? "job start" : "job change"} · ${source.date ?? "date unknown"}${source.status === LifeEventStatus.Planned ? " · planned" : ""}` : "source unavailable";
  }

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
      setError("Could not save the timeline. Check the person, linked job changes and your storage.");
      return false;
    }
    setEvents(next);
    setError("");
    return true;
  }

  function resetForm(): void {
    setEditing(undefined);
    setTitle("");
    setEntryType(EntryType.Note);
    setGross("");
    setGrossPeriod(PayPeriod.Monthly);
    setHours("");
    setJobId("");
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
      const isJob = entryType === EntryType.Job;
      const isJobChange = entryType === EntryType.JobChange;
      const item: LifeEvent<unknown> = { id: editing ?? toLifeEventId(crypto.randomUUID()),
        kind: isJob ? jobStartedModule.kind : isJobChange ? jobChangedModule.kind : noteEventModule.kind,
        personId: toPersonId(personId),
        ...(datePrecision === DatePrecision.Unknown ? {} : { date: toLifeEventDate(date) }),
        status,
        payload: isJob || isJobChange ? (isJob ? jobStartedModule : jobChangedModule).parsePayload({ jobId: isJob ? jobId || crypto.randomUUID() : jobId,
          ...(isJob ? { employer: title.trim() } : {}),
          ...(gross === "" ? {} : { gross: Number(gross),
            grossPeriod }),
          ...(hours === "" ? {} : { weeklyHours: Number(hours) }) }) : noteEventModule.parsePayload({ title: title.trim() }) };
      const next = editing ? events.map((entry) => entry.id === editing ? item : entry) : [...events, item];
      if (saveEvents(next)) {
        resetForm();
      }
    }
    catch {
      setError("Check the person, date and event details.");
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
          const job = event.kind === jobStartedModule.kind ? jobStartedModule.parsePayload(event.payload) : undefined;
          const change = event.kind === jobChangedModule.kind ? jobChangedModule.parsePayload(event.payload) : undefined;
          const start = change && events.find((entry) => entry.kind === jobStartedModule.kind
            && jobStartedModule.parsePayload(entry.payload).jobId === change.jobId);
          const employer = start ? jobStartedModule.parsePayload(start.payload).employer : undefined;
          const label = payload?.title ?? (job ? `Job at ${job.employer}` : change ? `Job change${employer ? ` at ${employer}` : ""}` : "Life event");
          const pay = job ?? change;
          const person = people.find((entry) => entry.id === event.personId);
          return <li key={event.id}>
            <div><strong>{label}</strong><p>{event.date ? `${event.date}${event.date.length === 4 ? " (year only)" : event.date.length === 7 ? " (month only)" : ""}` : "Date unknown"} · {person?.name ?? "Person unavailable"} · {event.status === LifeEventStatus.Planned ? "Planned" : "Happened"}{pay?.gross !== undefined ? ` · ${pay.gross} € / ${pay.grossPeriod === PayPeriod.Monthly ? "month" : "year"} gross rate` : ""}{pay?.weeklyHours !== undefined ? ` · ${pay.weeklyHours} h/week` : ""}</p></div>
            <div className="life-people__actions">
              {(payload || job || change) && <button className="ui-btn ui-btn--sm" type="button" aria-label={`Edit ${label}`} onClick={() => {
                setEditing(event.id);
                setPersonId(event.personId);
                setEntryType(job ? EntryType.Job : change ? EntryType.JobChange : EntryType.Note);
                setTitle(job?.employer ?? payload?.title ?? "");
                setJobId(pay?.jobId ?? "");
                setGross(pay?.gross === undefined ? "" : String(pay.gross));
                setGrossPeriod(pay?.grossPeriod ?? PayPeriod.Monthly);
                setHours(pay?.weeklyHours === undefined ? "" : String(pay.weeklyHours));
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
      {people.length > 0 && <div className="life-timeline__view">
        <h3>Employment on a date</h3>
        <p>Uses recorded job starts and changes. Job endings are not supported yet.</p>
        <div className="life-people__form">
          <label className="life-people__field">Person for view
            <select value={viewPersonId} onChange={(event) => setViewPersonId(event.currentTarget.value)}>
              {people.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}
            </select>
          </label>
          <label className="life-people__field">View date
            <input type="date" value={viewDate} onInput={(event) => setViewDate(event.currentTarget.value)} />
          </label>
          <label><input type="checkbox" checked={includePlanned} onChange={(event) => setIncludePlanned(event.currentTarget.checked)} /> Include planned events</label>
        </div>
        {!viewDate ? <p>Choose a date.</p> : jobs.length === 0 ? <p>No applicable jobs recorded for this date.</p> : <ul className="life-people__list">
          {jobs.map((job) => <li key={job.jobId}><div><strong>{job.employer}</strong>
            {job.existence === ProjectedFactStatus.Ambiguous ? <p>Job start or change date is uncertain or conflicting.</p> : <>
              <p>Gross rate: {job.gross.status === ProjectedFactStatus.Known && job.gross.value
                ? `${job.gross.value.amount} € / ${job.gross.value.period === PayPeriod.Monthly ? "month" : "year"} · ${sourceLabel(job.gross.sourceEventId)}`
                : job.gross.status === ProjectedFactStatus.Ambiguous ? "Uncertain or conflicting dates" : "Not recorded"}</p>
              <p>Working hours: {job.weeklyHours.status === ProjectedFactStatus.Known
                ? `${job.weeklyHours.value} h/week · ${sourceLabel(job.weeklyHours.sourceEventId)}`
                : job.weeklyHours.status === ProjectedFactStatus.Ambiguous ? "Uncertain or conflicting dates" : "Not recorded"}</p>
            </>}
          </div></li>)}
        </ul>}
        {viewPersonId && <LifeMonthlyView events={events} personId={toPersonId(viewPersonId)} date={viewDate} includePlanned={includePlanned} />}
      </div>}
      {people.length === 0 ? <p>Add a person above to start your timeline.</p> : <form className="life-people__form" onSubmit={save}>
        <label className="life-people__field">Person
          <select required value={personId} onChange={(event) => setPersonId(event.currentTarget.value)}>
            <option value="">Choose a person</option>
            {people.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}
          </select>
        </label>
        <label className="life-people__field">Event type
          <select disabled={editing !== undefined} value={entryType} onChange={(event) => {
            const value = event.currentTarget.value;
            setEntryType(value === EntryType.Job ? EntryType.Job : value === EntryType.JobChange ? EntryType.JobChange : EntryType.Note);
            setTitle("");
            setJobId("");
          }}>
            <option value={EntryType.Note}>Life event</option>
            <option value={EntryType.Job}>Job started</option>
            <option value={EntryType.JobChange}>Job change</option>
          </select>
        </label>
        {entryType !== EntryType.JobChange && <label className="life-people__field">{entryType === EntryType.Job ? "Employer" : "Event"}
          <input required value={title} onInput={(event) => setTitle(event.currentTarget.value)} />
        </label>}
        {entryType === EntryType.JobChange && <label className="life-people__field">Job
          <select required value={jobId} onChange={(event) => setJobId(event.currentTarget.value)}>
            <option value="">Choose a job</option>
            {events.filter((event) => event.kind === jobStartedModule.kind && event.personId === personId).map((event) => {
              const job = jobStartedModule.parsePayload(event.payload);
              return <option key={job.jobId} value={job.jobId}>{job.employer}</option>;
            })}
          </select>
        </label>}
        {(entryType === EntryType.Job || entryType === EntryType.JobChange) && <>
          <label className="life-people__field">Gross pay rate (optional)
            <input type="number" min="0" step="0.01" value={gross} onInput={(event) => setGross(event.currentTarget.value)} />
          </label>
          {gross !== "" && <label className="life-people__field">Pay basis
            <select value={grossPeriod} onChange={(event) => setGrossPeriod(toSalaryPeriod(event.currentTarget.value))}>
              <option value={PayPeriod.Monthly}>Monthly gross rate</option>
              <option value={PayPeriod.Yearly}>Yearly gross rate</option>
            </select>
          </label>}
          <label className="life-people__field">Hours per week (optional)
            <input type="number" min="0" max="60" step="0.5" value={hours} onInput={(event) => setHours(event.currentTarget.value)} />
          </label>
        </>}
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
