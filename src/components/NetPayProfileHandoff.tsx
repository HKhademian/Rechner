import {
  type JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  type CalculatorInputs,
  calculatorInvalidInputs,
  getCurrentInputs,
  saveScenarioInputs,
} from "#store/calculatorStore";
import {
  type LifePerson,
  toLifeDate,
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
} from "#engine/lifeProfile/timeline";
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
} from "#engine/lifeProfile/timelineStorage";
import {
  type JobAtDate,
  ProjectedFactStatus,
  projectEmploymentAtDate,
} from "#engine/lifeProfile/employmentProjection";
import {
  prepareNetPayHandoff,
} from "#engine/lifeProfile/netPayHandoff";
import {
  jobStartedModule,
} from "#engine/lifeProfile/employmentEvent";
import {
  StorageMode,
  getStorageMode,
} from "#engine/storage/appStorage";
import "./NetPayProfileHandoff.css";

interface HandoffPreview {
  readonly baseline: CalculatorInputs;
  readonly inputs: CalculatorInputs;
  readonly events: string;
  readonly people: string;
  readonly job: JobAtDate;
  readonly date: string;
}

export default function NetPayProfileHandoff(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<readonly LifePerson[]>([]);
  const [events, setEvents] = useState<readonly LifeEvent<unknown>[]>([]);
  const [personId, setPersonId] = useState("");
  const [jobId, setJobId] = useState("");
  const [date, setDate] = useState("");
  const [includePlanned, setIncludePlanned] = useState(false);
  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState<HandoffPreview | undefined>();
  const [message, setMessage] = useState("");

  function begin(): void {
    const peopleRecord = readPeople();
    const timeline = readTimeline();
    setOpen(true);
    setPreview(undefined);
    if (peopleRecord.status !== PeopleRecordStatus.Valid || timeline.status !== TimelineRecordStatus.Valid
      || !peopleRecord.record || !timeline.record) {
      setPeople([]);
      setEvents([]);
      setMessage(getStorageMode() === StorageMode.Memory
        ? "Add a person and job in Life Profile. To use them across pages, choose session or device storage in Offline settings."
        : "Add a person and job in Life Profile first, or check that your profile can be read.");
      return;
    }
    setPeople(peopleRecord.record.people);
    setEvents(timeline.record.events);
    setPersonId(peopleRecord.record.people[0]?.id ?? "");
    setJobId("");
    setDate(`${getCurrentInputs().taxYear}-01-01`);
    setMessage("");
  }

  let jobs: readonly JobAtDate[] = [];
  try {
    if (personId && date) {
      jobs = projectEmploymentAtDate(events, toPersonId(personId), toLifeDate(date), includePlanned);
    }
  }
  catch {
    jobs = [];
  }

  function makePreview(): void {
    try {
      if (Object.values(calculatorInvalidInputs.value).some(Boolean)) {
        throw new TypeError("Fix the highlighted calculator inputs before previewing.");
      }
      const job = jobs.find((entry) => entry.jobId === jobId);
      if (!job) {
        throw new TypeError("Choose a job with a known monthly gross rate.");
      }
      const baseline = structuredClone(getCurrentInputs());
      const inputs = prepareNetPayHandoff(baseline, job, toLifeDate(date));
      setPreview({ baseline,
        inputs,
        events: JSON.stringify(events),
        people: JSON.stringify(people),
        job,
        date });
      setTitle(`${job.employer} · ${date}`);
      setMessage("");
    }
    catch (error) {
      setPreview(undefined);
      setMessage(error instanceof Error ? error.message : "Could not prepare the comparison.");
    }
  }

  function save(): void {
    if (!preview || !title.trim()) {
      setMessage("Enter a name for the comparison.");
      return;
    }
    const currentPeople = readPeople();
    const currentTimeline = readTimeline();
    if (Object.values(calculatorInvalidInputs.value).some(Boolean)
      || JSON.stringify(getCurrentInputs()) !== JSON.stringify(preview.baseline)
      || currentPeople.status !== PeopleRecordStatus.Valid || currentTimeline.status !== TimelineRecordStatus.Valid
      || JSON.stringify(currentPeople.record?.people) !== preview.people
      || JSON.stringify(currentTimeline.record?.events) !== preview.events) {
      setPreview(undefined);
      setMessage("Inputs changed since the preview. Close and reopen it to review the latest values.");
      return;
    }
    try {
      saveScenarioInputs(title.trim(), `Life Profile rate on ${preview.date}; constant rate assumed for the configured months.`, preview.inputs, { edit: false });
      setPreview(undefined);
      setMessage("Comparison saved. Open the saved comparisons below to review it.");
    }
    catch {
      setMessage("Could not create the comparison. Check the calculator inputs.");
    }
  }

  return <div className="net-pay-handoff">
    <button type="button" className="ui-btn ui-btn--tint" onClick={() => open ? setOpen(false) : begin()}>
      {open ? "Close profile comparison" : "Compare a profile job"}
    </button>
    {open && <section className="net-pay-handoff__panel" aria-label="Profile job comparison">
      <p>Choose a person, date and job. A preview creates a new comparison; live inputs stay as they are.</p>
      {people.length > 0 && <div className="net-pay-handoff__fields">
        <label>Person
          <select value={personId} onChange={(event) => {
            setPersonId(event.currentTarget.value); setJobId(""); setPreview(undefined); 
          }}>
            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </label>
        <label>Rate date
          <input type="date" value={date} onInput={(event) => {
            setDate(event.currentTarget.value); setJobId(""); setPreview(undefined); 
          }} />
        </label>
        <label><input type="checkbox" checked={includePlanned} onChange={(event) => {
          setIncludePlanned(event.currentTarget.checked); setJobId(""); setPreview(undefined); 
        }} /> Include planned events</label>
        <label>Job
          <select value={jobId} onChange={(event) => {
            setJobId(event.currentTarget.value); setPreview(undefined); 
          }}>
            <option value="">Choose a job</option>
            {jobs.map((job) => <option key={job.jobId} value={job.jobId}>{job.employer}{job.gross.status !== ProjectedFactStatus.Known ? " · rate unavailable" : ""}</option>)}
          </select>
        </label>
        <button type="button" className="ui-btn" onClick={makePreview}>Preview comparison</button>
      </div>}
      {preview && <div className="net-pay-handoff__preview">
        <p><strong>Gross:</strong> {preview.inputs.grossIncome} € per month · {preview.job.employer} · {preview.date}</p>
        <p>Source: {(() => {
          const event = events.find((entry) => entry.id === preview.job.gross.sourceEventId);
          return event ? `${event.kind === jobStartedModule.kind ? "job start" : "job change"} · ${event.date ?? "date unknown"} · ${event.status}` : "unavailable";
        })()}</p>
        <p>The comparison applies this one rate to all {preview.inputs.workingMonths} configured working months with {preview.inputs.salariesPerYear} annual salary payments. It does not reconstruct actual earnings after a midyear change. Other inputs are copied from the current calculator.</p>
        <label>Comparison name
          <input value={title} onInput={(event) => setTitle(event.currentTarget.value)} />
        </label>
        <button type="button" className="ui-btn ui-btn--primary" onClick={save}>Save new comparison</button>
      </div>}
      {message && <p role="status">{message}</p>}
    </section>}
  </div>;
}
