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
  JobEndReason,
  JobLeaveKind,
  jobChangedModule,
  jobEndedModule,
  jobLeaveModule,
  jobStartedModule,
  toJobEndReason,
  toJobLeaveKind,
} from "#engine/lifeProfile/employmentEvent";
import {
  residenceMoveModule,
} from "#engine/lifeProfile/residenceEvent";
import {
  type CashDirection as CashDirectionType,
  cashEventModule,
  CashDirection,
} from "#engine/lifeProfile/cashEvent";
import {
  openPlannedCashEvents,
  reconciledPlannedByActualId,
  reconcilingActualByPlannedId,
} from "#engine/lifeProfile/cashReconciliation";
import {
  parseAmount,
  amountText,
} from "#engine/lifeProfile/cashAmount";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";
import {
  formatCashReconciliationNote,
} from "#utils/cashReconciliationFormat";
import {
  type SalaryPeriod,
  SalaryPeriod as PayPeriod,
  toSalaryPeriod,
} from "#engine/types";
import {
  ProjectedFactStatus,
  projectEmploymentAtDate,
} from "#engine/lifeProfile/employmentProjection";
import {
  evaluateEmploymentBand,
} from "#engine/lifeProfile/employmentBandEvaluation";
import {
  JurisdictionCode,
  toJurisdictionCode,
} from "#engine/lifeProfile/statutoryRuleResolver";
import CalculationExplanationPanel from "#components/CalculationExplanationPanel";
import LifeDomainEventForm from "#components/LifeDomainEventForm";
import LifeJourneyPanels from "#components/LifeJourneyPanels";
import LifeMonthlyView from "#components/LifeMonthlyView";
import {
  describeExtendedLifeEvent,
} from "#utils/lifeEventDisplay";
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
import {
  detectTimelineConflicts,
} from "#engine/lifeProfile/timelineConflicts";
import "./LifePeople.css";

const DatePrecision = {
  Unknown: "unknown",
  Year: "year",
  Month: "month",
  Day: "day",
} as const;
type DatePrecision = (typeof DatePrecision)[keyof typeof DatePrecision];

const EntryType = {
  Note: "note",
  Job: "job",
  JobChange: "job-change",
  JobEnd: "job-end",
  JobLeave: "job-leave",
  Move: "move",
  Cash: "cash",
} as const;
type EntryType = (typeof EntryType)[keyof typeof EntryType];

export default function LifeTimeline({ peopleRevision }: { readonly peopleRevision: number }): JSX.Element {
  const [people, setPeople] = useState<readonly LifePerson[]>([]);
  const [events, setEvents] = useState<readonly LifeEvent<unknown>[]>([]);
  const [personId, setPersonId] = useState("");
  const [viewPersonId, setViewPersonId] = useState("");
  const [viewDate, setViewDate] = useState("");
  const [includePlanned, setIncludePlanned] = useState(false);
  const [ruleJurisdiction, setRuleJurisdiction] = useState<JurisdictionCode>(JurisdictionCode.GermanyFederal);
  const [allowRuleProjection, setAllowRuleProjection] = useState(false);
  const [title, setTitle] = useState("");
  const [entryType, setEntryType] = useState<EntryType>(EntryType.Note);
  const [gross, setGross] = useState("");
  const [grossPeriod, setGrossPeriod] = useState<SalaryPeriod>(PayPeriod.Monthly);
  const [hours, setHours] = useState("");
  const [jobId, setJobId] = useState("");
  const [jobEndReason, setJobEndReason] = useState<JobEndReason>(JobEndReason.Resignation);
  const [finalPayAmount, setFinalPayAmount] = useState("");
  const [jobLeaveKind, setJobLeaveKind] = useState<JobLeaveKind>(JobLeaveKind.ParentalLeave);
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [cashDirection, setCashDirection] = useState<CashDirectionType>(CashDirection.Outflow);
  const [reconcilesEventId, setReconcilesEventId] = useState("");
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

  const actualByPlanned = reconcilingActualByPlannedId(events);
  const plannedByActual = reconciledPlannedByActualId(events);
  const linkablePlans = personId ? openPlannedCashEvents(events, toPersonId(personId), editing) : [];

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
      setError("Could not save the timeline. Check the person, linked job changes, reconciled cash entries and your storage.");
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
    setJobEndReason(JobEndReason.Resignation);
    setFinalPayAmount("");
    setJobLeaveKind(JobLeaveKind.ParentalLeave);
    setLeaveEndDate("");
    setPlaceId("");
    setCashAmount("");
    setCashDirection(CashDirection.Outflow);
    setReconcilesEventId("");
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
      const isJobEnd = entryType === EntryType.JobEnd;
      const isJobLeave = entryType === EntryType.JobLeave;
      const isMove = entryType === EntryType.Move;
      const isCash = entryType === EntryType.Cash;
      if (isCash && (datePrecision !== DatePrecision.Day || !date)) {
        throw new TypeError("Cash events require an exact date.");
      }
      const kind = isJob
        ? jobStartedModule.kind
        : isJobChange
          ? jobChangedModule.kind
          : isJobEnd
            ? jobEndedModule.kind
            : isJobLeave
              ? jobLeaveModule.kind
              : isMove
                ? residenceMoveModule.kind
                : isCash
                  ? cashEventModule.kind
                  : noteEventModule.kind;
      const payload = isJob || isJobChange
        ? (isJob ? jobStartedModule : jobChangedModule).parsePayload({
          jobId: isJob ? jobId || crypto.randomUUID() : jobId,
          ...(isJob ? { employer: title.trim() } : {}),
          ...(gross === ""
            ? {}
            : {
              gross: Number(gross),
              grossPeriod,
            }),
          ...(hours === "" ? {} : { weeklyHours: Number(hours) }),
        })
        : isJobEnd
          ? jobEndedModule.parsePayload({
            jobId,
            reason: jobEndReason,
            ...(finalPayAmount.trim() === "" ? {} : { finalPayCents: parseAmount(finalPayAmount, true) }),
          })
          : isJobLeave
            ? jobLeaveModule.parsePayload({
              jobId,
              kind: jobLeaveKind,
              ...(leaveEndDate ? { endDate: leaveEndDate } : {}),
            })
            : isMove
              ? residenceMoveModule.parsePayload({
                placeId: placeId || crypto.randomUUID(),
                location: title.trim(),
              })
              : isCash
                ? cashEventModule.parsePayload({
                  title: title.trim(),
                  direction: cashDirection,
                  amount: parseAmount(cashAmount, false),
                  ...(status === LifeEventStatus.Actual && reconcilesEventId ? { reconcilesEventId } : {}),
                })
                : noteEventModule.parsePayload({ title: title.trim() });
      const item: LifeEvent<unknown> = {
        id: editing ?? toLifeEventId(crypto.randomUUID()),
        kind,
        personId: toPersonId(personId),
        ...(datePrecision === DatePrecision.Unknown ? {} : { date: toLifeEventDate(date) }),
        status,
        payload,
      };
      const next = editing ? events.map((entry) => entry.id === editing ? item : entry) : [...events, item];
      if (saveEvents(next)) {
        resetForm();
      }
    }
    catch {
      setError("Check the person, date and event details.");
    }
  }

  const conflicts = detectTimelineConflicts(events);

  return <section className="ui-card life-people" aria-labelledby="life-timeline-heading">
    <h2 id="life-timeline-heading">Life timeline</h2>
    <p>Record a life event or something you are planning. Events do not change calculator inputs yet.</p>
    {error && <p role="alert">{error}</p>}
    {ready && conflicts.length > 0 && <details className="calc-explain">
      <summary>Review {conflicts.length} timeline {conflicts.length === 1 ? "conflict or ambiguity" : "conflicts or ambiguities"}</summary>
      <ul className="calc-explain__list">
        {conflicts.map((conflict) => {
          const person = people.find((entry) => entry.id === conflict.personId);
          return <li key={`${conflict.kind}-${conflict.eventIds.join("-")}`}>
            <strong>{person?.name ?? "Person"}:</strong> {conflict.summary} {conflict.suggestedAction}
          </li>;
        })}
      </ul>
    </details>}
    {ready && <>
      {events.length === 0 ? <p>No events added yet.</p> : <ul className="life-people__list">
        {orderLifeEvents(events).map((event) => {
          const payload = event.kind === noteEventModule.kind ? noteEventModule.parsePayload(event.payload) : undefined;
          const job = event.kind === jobStartedModule.kind ? jobStartedModule.parsePayload(event.payload) : undefined;
          const change = event.kind === jobChangedModule.kind ? jobChangedModule.parsePayload(event.payload) : undefined;
          const jobEnd = event.kind === jobEndedModule.kind ? jobEndedModule.parsePayload(event.payload) : undefined;
          const jobLeave = event.kind === jobLeaveModule.kind ? jobLeaveModule.parsePayload(event.payload) : undefined;
          const move = event.kind === residenceMoveModule.kind ? residenceMoveModule.parsePayload(event.payload) : undefined;
          const cash = event.kind === cashEventModule.kind ? cashEventModule.parsePayload(event.payload) : undefined;
          const settledActual = cash && event.status === LifeEventStatus.Planned ? actualByPlanned.get(event.id) : undefined;
          const linkedPlanned = cash && event.status === LifeEventStatus.Actual ? plannedByActual.get(event.id) : undefined;
          const linkedJobId = change?.jobId ?? jobEnd?.jobId ?? jobLeave?.jobId;
          const start = linkedJobId && events.find((entry) => entry.kind === jobStartedModule.kind
            && jobStartedModule.parsePayload(entry.payload).jobId === linkedJobId);
          const employer = start ? jobStartedModule.parsePayload(start.payload).employer : undefined;
          const extended = describeExtendedLifeEvent(event);
          const label = payload?.title ?? (
            job
              ? `Job at ${job.employer}`
              : change
                ? `Job change${employer ? ` at ${employer}` : ""}`
                : jobEnd
                  ? `Job ended${employer ? ` at ${employer}` : ""}`
                  : jobLeave
                    ? `Job leave (${jobLeave.kind})${employer ? ` at ${employer}` : ""}`
                    : move
                      ? `Move to ${move.location}`
                      : cash
                        ? cash.title
                        : extended?.label ?? "Life event"
          );
          const pay = job ?? change;
          const person = people.find((entry) => entry.id === event.personId);
          return <li key={event.id}>
            <div><strong>{label}</strong><p>{event.date ? `${event.date}${event.date.length === 4 ? " (year only)" : event.date.length === 7 ? " (month only)" : ""}` : "Date unknown"} · {person?.name ?? "Person unavailable"} · {event.status === LifeEventStatus.Planned ? "Planned" : "Happened"}{cash ? ` · ${cash.direction === CashDirection.Inflow ? "Inflow" : "Expense"} ${formatIntegerEuroCents(cash.amount)} · User entered` : ""}{settledActual ? ` · Replaced by actual ${formatIntegerEuroCents(settledActual.payload.amount)} on ${settledActual.date} · Counted once` : ""}{linkedPlanned && cash ? ` · ${formatCashReconciliationNote(linkedPlanned, {
              ...event,
              payload: cash,
            })}` : ""}{pay?.gross !== undefined ? ` · ${pay.gross} € / ${pay.grossPeriod === PayPeriod.Monthly ? "month" : "year"} gross rate` : ""}{pay?.weeklyHours !== undefined ? ` · ${pay.weeklyHours} h/week` : ""}{jobEnd ? ` · Reason: ${jobEnd.reason}${jobEnd.finalPayCents !== undefined ? ` · Final pay ${formatIntegerEuroCents(jobEnd.finalPayCents)}` : ""}` : ""}{jobLeave?.endDate ? ` · Until ${jobLeave.endDate}` : ""}{extended ? ` · ${extended.detail}` : ""}</p></div>
            <div className="life-people__actions">
              {cash && event.status === LifeEventStatus.Planned && !settledActual && <button className="ui-btn ui-btn--sm" type="button" aria-label={`Record ${label} as happened`} onClick={() => {
                setEditing(undefined);
                setPersonId(event.personId);
                setEntryType(EntryType.Cash);
                setTitle(cash.title);
                setCashAmount(amountText(cash.amount));
                setCashDirection(cash.direction);
                setReconcilesEventId(event.id);
                setDate(event.date ?? "");
                setDatePrecision(DatePrecision.Day);
                setStatus(LifeEventStatus.Actual);
              }}>Record as happened</button>}
              {(payload || job || change || jobEnd || jobLeave || move || cash) && <button className="ui-btn ui-btn--sm" type="button" aria-label={`Edit ${label}`} onClick={() => {
                setEditing(event.id);
                setPersonId(event.personId);
                setEntryType(
                  job
                    ? EntryType.Job
                    : change
                      ? EntryType.JobChange
                      : jobEnd
                        ? EntryType.JobEnd
                        : jobLeave
                          ? EntryType.JobLeave
                          : move
                            ? EntryType.Move
                            : cash
                              ? EntryType.Cash
                              : EntryType.Note,
                );
                setTitle(job?.employer ?? move?.location ?? cash?.title ?? payload?.title ?? "");
                setCashAmount(cash ? amountText(cash.amount) : "");
                setCashDirection(cash?.direction ?? CashDirection.Outflow);
                setReconcilesEventId(cash?.reconcilesEventId ?? "");
                setPlaceId(move?.placeId ?? "");
                setJobId(pay?.jobId ?? jobEnd?.jobId ?? jobLeave?.jobId ?? "");
                setJobEndReason(jobEnd?.reason ?? JobEndReason.Resignation);
                setFinalPayAmount(jobEnd?.finalPayCents !== undefined ? amountText(jobEnd.finalPayCents) : "");
                setJobLeaveKind(jobLeave?.kind ?? JobLeaveKind.ParentalLeave);
                setLeaveEndDate(jobLeave?.endDate ?? "");
                setGross(pay?.gross === undefined ? "" : String(pay.gross));
                setGrossPeriod(pay?.grossPeriod ?? PayPeriod.Monthly);
                setHours(pay?.weeklyHours === undefined ? "" : String(pay.weeklyHours));
                setDate(event.date ?? "");
                setDatePrecision(!event.date ? DatePrecision.Unknown : event.date.length === 4 ? DatePrecision.Year : event.date.length === 7 ? DatePrecision.Month : DatePrecision.Day);
                setStatus(event.status);
              }}>Edit</button>}
              <button className="ui-btn ui-btn--sm" type="button" aria-label={`Remove ${label}`} onClick={() => {
                if (settledActual) {
                  setError("Unlink or remove the linked actual cash entry before removing this planned entry.");
                  return;
                }
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
        <p>Uses recorded job starts, changes, leave periods and endings.</p>
        <div className="life-people__form">
          <label className="life-people__field">Person for view
            <select value={viewPersonId} onChange={(event) => setViewPersonId(event.currentTarget.value)}>
              {people.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}
            </select>
          </label>
          <label className="life-people__field">View date
            <input type="date" value={viewDate} onInput={(event) => setViewDate(event.currentTarget.value)} />
          </label>
          <label className="life-people__field">Rule jurisdiction
            <select value={ruleJurisdiction} onChange={(event) => setRuleJurisdiction(toJurisdictionCode(event.currentTarget.value))}>
              <option value={JurisdictionCode.GermanyFederal}>Germany (federal · DE)</option>
              <option value={JurisdictionCode.UnsupportedOther}>Other / outside Germany</option>
            </select>
          </label>
          <label><input type="checkbox" checked={includePlanned} onChange={(event) => setIncludePlanned(event.currentTarget.checked)} /> Include planned events</label>
          <label><input type="checkbox" checked={allowRuleProjection} onChange={(event) => setAllowRuleProjection(event.currentTarget.checked)} /> Project beyond verified rule dates</label>
        </div>
        {!viewDate ? <p>Choose a date.</p> : jobs.length === 0 ? <p>No applicable jobs recorded for this date.</p> : <ul className="life-people__list">
          {jobs.map((job) => {
            let bandEvaluation;
            if (job.existence !== ProjectedFactStatus.Ambiguous && job.gross.status !== ProjectedFactStatus.Ambiguous) {
              try {
                bandEvaluation = evaluateEmploymentBand({
                  grossRate: job.gross.status === ProjectedFactStatus.Known ? job.gross.value : undefined,
                  grossSourceLabel: job.gross.sourceEventId ? sourceLabel(job.gross.sourceEventId) : "Not recorded",
                  date: toLifeDate(viewDate),
                  jurisdiction: ruleJurisdiction,
                  allowProjection: allowRuleProjection,
                });
              }
              catch {
                bandEvaluation = undefined;
              }
            }
            return <li key={job.jobId}><div><strong>{job.employer}</strong>
              {job.existence === ProjectedFactStatus.Ambiguous ? <p>Job start, change or end date is uncertain or conflicting.</p> : <>
                <p>Gross rate: {job.gross.status === ProjectedFactStatus.Known && job.gross.value
                  ? `${job.gross.value.amount} € / ${job.gross.value.period === PayPeriod.Monthly ? "month" : "year"} · ${sourceLabel(job.gross.sourceEventId)}`
                  : job.gross.status === ProjectedFactStatus.Ambiguous ? "Uncertain or conflicting dates" : "Not recorded"}</p>
                <p>Working hours: {job.weeklyHours.status === ProjectedFactStatus.Known
                  ? `${job.weeklyHours.value} h/week · ${sourceLabel(job.weeklyHours.sourceEventId)}`
                  : job.weeklyHours.status === ProjectedFactStatus.Ambiguous ? "Uncertain or conflicting dates" : "Not recorded"}</p>
                {job.activeLeave && <p>Leave status: <strong>{job.activeLeave.kind}</strong>{job.activeLeave.endDate ? ` until ${job.activeLeave.endDate}` : ""}</p>}
                {bandEvaluation && <>
                  <p>Statutory band: <strong>{bandEvaluation.label}</strong></p>
                  <CalculationExplanationPanel
                    explanation={bandEvaluation.explanation}
                    summary="Explain employment band rule and sources"
                  />
                </>}
              </>}
            </div></li>;
          })}
        </ul>}
        {viewPersonId && <>
          <LifeMonthlyView events={events} personId={toPersonId(viewPersonId)} date={viewDate} onDateChange={setViewDate} includePlanned={includePlanned} onIncludePlannedChange={setIncludePlanned} />
          <LifeJourneyPanels
            people={people}
            events={events}
            personId={toPersonId(viewPersonId)}
            date={viewDate}
            includePlanned={includePlanned}
            jurisdiction={ruleJurisdiction}
            allowProjection={allowRuleProjection}
          />
        </>}
      </div>}
      {people.length === 0 ? <p>Add a person above to start your timeline.</p> : <form className="life-people__form" onSubmit={save}>
        <label className="life-people__field">Person
          <select required value={personId} onChange={(event) => {
            setPersonId(event.currentTarget.value);
            setReconcilesEventId("");
          }}>
            <option value="">Choose a person</option>
            {people.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}
          </select>
        </label>
        <label className="life-people__field">Event type
          <select disabled={editing !== undefined} value={entryType} onChange={(event) => {
            const value = event.currentTarget.value;
            setEntryType(
              Object.values(EntryType).includes(value as EntryType)
                ? value as EntryType
                : EntryType.Note,
            );
            if (value === EntryType.Cash) {
              setDatePrecision(DatePrecision.Day);
              setDate("");
            }
            setTitle("");
            setJobId("");
            setReconcilesEventId("");
          }}>
            <option value={EntryType.Note}>Life event</option>
            <option value={EntryType.Job}>Job started</option>
            <option value={EntryType.JobChange}>Job change</option>
            <option value={EntryType.JobLeave}>Job leave</option>
            <option value={EntryType.JobEnd}>Job ended / resignation</option>
            <option value={EntryType.Move}>Move</option>
            <option value={EntryType.Cash}>Cash inflow or expense</option>
          </select>
        </label>
        {entryType !== EntryType.JobChange && entryType !== EntryType.JobEnd && entryType !== EntryType.JobLeave && <label className="life-people__field">{entryType === EntryType.Job ? "Employer" : entryType === EntryType.Move ? "Location" : "Event"}
          <input required value={title} onInput={(event) => setTitle(event.currentTarget.value)} />
        </label>}
        {entryType === EntryType.Cash && <>
          {reconcilesEventId && !editing && <p>Recording a linked actual transaction preserves the planned entry for comparison while counting only this actual amount once.</p>}
          {editing && <p>Review the date, amount, status and optional planned link. Saving updates this cash entry.</p>}
          <label className="life-people__field">Cash direction
            <select value={cashDirection} onChange={(event) => setCashDirection(event.currentTarget.value === CashDirection.Inflow ? CashDirection.Inflow : CashDirection.Outflow)}>
              <option value={CashDirection.Outflow}>Expense</option><option value={CashDirection.Inflow}>Inflow</option>
            </select>
          </label>
          <label className="life-people__field">Amount (€)
            <input required type="number" min="0.01" step="0.01" value={cashAmount} onInput={(event) => setCashAmount(event.currentTarget.value)} />
          </label>
          {status === LifeEventStatus.Actual && linkablePlans.length > 0 && <label className="life-people__field">Reconciles planned entry (optional)
            <select value={reconcilesEventId} onChange={(event) => setReconcilesEventId(event.currentTarget.value)}>
              <option value="">Standalone transaction (not linked)</option>
              {linkablePlans.map((plan) => <option key={plan.id} value={plan.id}>
                {plan.date} · {plan.payload.title} · {plan.payload.direction === CashDirection.Inflow ? "Inflow" : "Expense"} {formatIntegerEuroCents(plan.payload.amount)}
              </option>)}
            </select>
          </label>}
          <p>Enter an actual transaction or a planned cash event. Linking an actual entry to a planned entry keeps both amounts for comparison and counts the transaction once.</p>
        </>}
        {(entryType === EntryType.JobChange || entryType === EntryType.JobEnd || entryType === EntryType.JobLeave) && <label className="life-people__field">Job
          <select required value={jobId} onChange={(event) => setJobId(event.currentTarget.value)}>
            <option value="">Choose a job</option>
            {events.filter((event) => event.kind === jobStartedModule.kind && event.personId === personId).map((event) => {
              const job = jobStartedModule.parsePayload(event.payload);
              return <option key={job.jobId} value={job.jobId}>{job.employer}</option>;
            })}
          </select>
        </label>}
        {entryType === EntryType.JobEnd && <>
          <label className="life-people__field">End reason
            <select value={jobEndReason} onChange={(event) => setJobEndReason(toJobEndReason(event.currentTarget.value))}>
              <option value={JobEndReason.Resignation}>Resignation</option>
              <option value={JobEndReason.EmployerTermination}>Employer termination</option>
              <option value={JobEndReason.MutualAgreement}>Mutual agreement</option>
              <option value={JobEndReason.ContractEnd}>Fixed-term contract end</option>
              <option value={JobEndReason.Other}>Other</option>
            </select>
          </label>
          <label className="life-people__field">Expected final pay / severance (optional, €)
            <input type="number" min="0" step="0.01" value={finalPayAmount} onInput={(event) => setFinalPayAmount(event.currentTarget.value)} />
          </label>
        </>}
        {entryType === EntryType.JobLeave && <>
          <label className="life-people__field">Leave kind
            <select value={jobLeaveKind} onChange={(event) => setJobLeaveKind(toJobLeaveKind(event.currentTarget.value))}>
              <option value={JobLeaveKind.ParentalLeave}>Parental leave</option>
              <option value={JobLeaveKind.Sabbatical}>Sabbatical</option>
              <option value={JobLeaveKind.UnpaidLeave}>Unpaid leave</option>
              <option value={JobLeaveKind.GardenLeave}>Garden leave</option>
              <option value={JobLeaveKind.MedicalLeave}>Medical leave</option>
            </select>
          </label>
          <label className="life-people__field">Leave end date (optional)
            <input type="date" value={leaveEndDate} onInput={(event) => setLeaveEndDate(event.currentTarget.value)} />
          </label>
        </>}
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
        {entryType !== EntryType.Cash && <label className="life-people__field">Date precision
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
        </label>}
        {datePrecision !== DatePrecision.Unknown && <label className="life-people__field">Date
          <input required type={datePrecision === DatePrecision.Day ? "date" : datePrecision === DatePrecision.Month ? "month" : "text"}
            inputMode={datePrecision === DatePrecision.Year ? "numeric" : undefined}
            placeholder={datePrecision === DatePrecision.Year ? "YYYY" : undefined}
            value={date} onInput={(event) => setDate(event.currentTarget.value)} />
        </label>}
        <label className="life-people__field">Status
          <select value={status} onChange={(event) => {
            const nextStatus = toLifeEventStatus(event.currentTarget.value);
            setStatus(nextStatus);
            if (nextStatus !== LifeEventStatus.Actual) {
              setReconcilesEventId("");
            }
          }}>
            <option value={LifeEventStatus.Planned}>Planned</option>
            <option value={LifeEventStatus.Actual}>Happened</option>
          </select>
        </label>
        <button className="ui-btn ui-btn--primary" type="submit">{editing ? "Save event" : "Add event"}</button>
        {(editing || reconcilesEventId) && <button className="ui-btn" type="button" onClick={resetForm}>Cancel</button>}
      </form>}
      {people.length > 0 && <LifeDomainEventForm people={people} events={events} onAddEvent={(item) => saveEvents([...events, item])} />}
    </>}
  </section>;
}
