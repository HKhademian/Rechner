import {
  type JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  type LifePerson,
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
  LifeEventStatus,
  toLifeEventDate,
  toLifeEventId,
  toLifeEventStatus,
} from "#engine/lifeProfile/timeline";
import {
  ApplicationMilestoneStage,
  ApplicationTarget,
  ResidencePermitKind,
  residenceInterruptionModule,
  residenceMilestoneModule,
  residencePermitModule,
  toApplicationMilestoneStage,
  toApplicationTarget,
  toResidencePermitKind,
} from "#engine/lifeProfile/residencePermitEvent";

export interface LifeDomainEventFormProps {
  readonly people: readonly LifePerson[];
  readonly onAddEvent: (event: LifeEvent<unknown>) => boolean;
}

const DomainEventKind = {
  ResidencePermit: "residence.permit",
  ResidenceInterruption: "residence.interruption",
  ResidenceMilestone: "residence.milestone",
} as const;
type DomainEventKind = (typeof DomainEventKind)[keyof typeof DomainEventKind];

function toDomainEventKind(value: string): DomainEventKind {
  if (!Object.values(DomainEventKind).includes(value as DomainEventKind)) {
    throw new TypeError("Invalid domain event kind.");
  }
  return value as DomainEventKind;
}

export default function LifeDomainEventForm({ people, onAddEvent }: LifeDomainEventFormProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [personId, setPersonId] = useState<string>(people[0]?.id ?? "");
  const [kind, setKind] = useState<DomainEventKind>(DomainEventKind.ResidencePermit);
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<LifeEventStatus>(LifeEventStatus.Actual);
  const [error, setError] = useState("");

  // Residence permit fields
  const [permitKind, setPermitKind] = useState<ResidencePermitKind>(ResidencePermitKind.EuBlueCard);
  const [permitLabel, setPermitLabel] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  // Interruption fields
  const [absenceDays, setAbsenceDays] = useState("");
  const [absenceReason, setAbsenceReason] = useState("");
  const [returnDate, setReturnDate] = useState("");

  // Milestone fields
  const [milestoneTarget, setMilestoneTarget] = useState<ApplicationTarget>(ApplicationTarget.PermanentResidency);
  const [milestoneStage, setMilestoneStage] = useState<ApplicationMilestoneStage>(ApplicationMilestoneStage.Preparing);
  const [milestoneTitle, setMilestoneTitle] = useState("");

  function handleSubmit(event: JSX.TargetedEvent<HTMLFormElement, Event>): void {
    event.preventDefault();
    try {
      const targetPersonId = toPersonId(personId || people[0]?.id || "");
      let payload: unknown;
      let eventKind = residencePermitModule.kind;

      if (kind === DomainEventKind.ResidencePermit) {
        eventKind = residencePermitModule.kind;
        payload = residencePermitModule.parsePayload({
          permitKind,
          countryCode: "DE",
          ...(permitLabel.trim() ? { label: permitLabel.trim() } : {}),
          ...(issueDate ? { issueDate } : {}),
          ...(expiryDate ? { expiryDate } : {}),
        });
      }
      else if (kind === DomainEventKind.ResidenceInterruption) {
        eventKind = residenceInterruptionModule.kind;
        payload = residenceInterruptionModule.parsePayload({
          days: Number(absenceDays),
          reason: absenceReason.trim(),
          ...(returnDate ? { returnDate } : {}),
        });
      }
      else {
        eventKind = residenceMilestoneModule.kind;
        payload = residenceMilestoneModule.parsePayload({
          target: milestoneTarget,
          stage: milestoneStage,
          title: milestoneTitle.trim(),
        });
      }

      const item: LifeEvent<unknown> = {
        id: toLifeEventId(crypto.randomUUID()),
        kind: eventKind,
        personId: targetPersonId,
        ...(date ? { date: toLifeEventDate(date) } : {}),
        status,
        payload,
      };
      if (onAddEvent(item)) {
        setError("");
        setPermitLabel("");
        setIssueDate("");
        setExpiryDate("");
        setAbsenceDays("");
        setAbsenceReason("");
        setReturnDate("");
        setMilestoneTitle("");
        setDate("");
      }
    }
    catch (err) {
      setError(err instanceof Error ? err.message : "Check the event details and date.");
    }
  }

  return <section className="life-monthly" aria-label="Additional life journey events">
    <button type="button" className="ui-btn" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      {expanded ? "Hide residence & journey event form" : "Add residence permit, absence or milestone"}
    </button>
    {expanded && <>
      {error && <p role="alert">{error}</p>}
      <form className="life-people__form" onSubmit={handleSubmit}>
        <label className="life-people__field">Person
          <select required value={personId || people[0]?.id || ""} onChange={(event) => setPersonId(event.currentTarget.value)}>
            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </label>
        <label className="life-people__field">Journey event type
          <select value={kind} onChange={(event) => setKind(toDomainEventKind(event.currentTarget.value))}>
            <option value={DomainEventKind.ResidencePermit}>Residence permit / visa</option>
            <option value={DomainEventKind.ResidenceInterruption}>Residence absence / interruption</option>
            <option value={DomainEventKind.ResidenceMilestone}>Application milestone</option>
          </select>
        </label>
        {kind === DomainEventKind.ResidencePermit && <>
          <label className="life-people__field">Permit kind
            <select value={permitKind} onChange={(event) => setPermitKind(toResidencePermitKind(event.currentTarget.value))}>
              <option value={ResidencePermitKind.EuBlueCard}>EU Blue Card (§ 18g AufenthG)</option>
              <option value={ResidencePermitKind.SkilledWorker}>Skilled worker (§ 18a / § 18b AufenthG)</option>
              <option value={ResidencePermitKind.Student}>Student (§ 16b AufenthG)</option>
              <option value={ResidencePermitKind.FamilyReunion}>Family reunion</option>
              <option value={ResidencePermitKind.OpportunityCard}>Opportunity Card (§ 20a AufenthG)</option>
              <option value={ResidencePermitKind.PermanentResidency}>Permanent residency (§ 18c / § 9)</option>
              <option value={ResidencePermitKind.Other}>Other permit</option>
            </select>
          </label>
          <label className="life-people__field">Label (optional)
            <input value={permitLabel} onInput={(event) => setPermitLabel(event.currentTarget.value)} placeholder="e.g. EU Blue Card Munich" />
          </label>
          <label className="life-people__field">Issue date (optional)
            <input type="date" value={issueDate} onInput={(event) => setIssueDate(event.currentTarget.value)} />
          </label>
          <label className="life-people__field">Expiry date (optional)
            <input type="date" value={expiryDate} onInput={(event) => setExpiryDate(event.currentTarget.value)} />
          </label>
        </>}
        {kind === DomainEventKind.ResidenceInterruption && <>
          <label className="life-people__field">Absence days
            <input required type="number" min="1" max="3650" step="1" value={absenceDays} onInput={(event) => setAbsenceDays(event.currentTarget.value)} />
          </label>
          <label className="life-people__field">Reason
            <input required value={absenceReason} onInput={(event) => setAbsenceReason(event.currentTarget.value)} placeholder="e.g. Extended stay abroad" />
          </label>
          <label className="life-people__field">Return date (optional)
            <input type="date" value={returnDate} onInput={(event) => setReturnDate(event.currentTarget.value)} />
          </label>
        </>}
        {kind === DomainEventKind.ResidenceMilestone && <>
          <label className="life-people__field">Application target
            <select value={milestoneTarget} onChange={(event) => setMilestoneTarget(toApplicationTarget(event.currentTarget.value))}>
              <option value={ApplicationTarget.PermanentResidency}>Permanent residency</option>
              <option value={ApplicationTarget.Citizenship}>Citizenship</option>
              <option value={ApplicationTarget.PermitRenewal}>Permit renewal</option>
              <option value={ApplicationTarget.Visa}>Visa</option>
            </select>
          </label>
          <label className="life-people__field">Stage
            <select value={milestoneStage} onChange={(event) => setMilestoneStage(toApplicationMilestoneStage(event.currentTarget.value))}>
              <option value={ApplicationMilestoneStage.Preparing}>Preparing</option>
              <option value={ApplicationMilestoneStage.AppointmentBooked}>Appointment booked</option>
              <option value={ApplicationMilestoneStage.Submitted}>Submitted</option>
              <option value={ApplicationMilestoneStage.Approved}>Approved</option>
              <option value={ApplicationMilestoneStage.Rejected}>Rejected</option>
            </select>
          </label>
          <label className="life-people__field">Milestone title
            <input required value={milestoneTitle} onInput={(event) => setMilestoneTitle(event.currentTarget.value)} placeholder="e.g. Ausländerbehörde appointment" />
          </label>
        </>}
        <label className="life-people__field">Event date
          <input required type="date" value={date} onInput={(event) => setDate(event.currentTarget.value)} />
        </label>
        <label className="life-people__field">Status
          <select value={status} onChange={(event) => setStatus(toLifeEventStatus(event.currentTarget.value))}>
            <option value={LifeEventStatus.Actual}>Happened</option>
            <option value={LifeEventStatus.Planned}>Planned</option>
          </select>
        </label>
        <button className="ui-btn ui-btn--primary" type="submit">Add journey event</button>
      </form>
    </>}
  </section>;
}
