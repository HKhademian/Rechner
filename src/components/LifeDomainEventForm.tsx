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
import {
  actualBirthModule,
  expectedBirthModule,
  pregnancyStartedModule,
} from "#engine/lifeProfile/familyEvent";
import {
  ChildcareApplicationStatus,
  ChildcareFacilityKind,
  childcarePlanModule,
  toChildcareApplicationStatus,
  toChildcareFacilityKind,
} from "#engine/lifeProfile/childcareEvent";
import {
  TravelDestinationRegion,
  toTravelDestinationRegion,
  travelTripModule,
} from "#engine/lifeProfile/travelEvent";
import {
  TaxClassCombination,
  taxClassSwitchModule,
  toTaxClassCombination,
} from "#engine/lifeProfile/taxSwitchEvent";
import {
  AssetActionKind,
  AssetCategory,
  assetEventModule,
  toAssetActionKind,
  toAssetCategory,
} from "#engine/lifeProfile/assetEvent";
import {
  cashEventModule,
} from "#engine/lifeProfile/cashEvent";
import {
  parseAmount,
} from "#engine/lifeProfile/cashAmount";

export interface LifeDomainEventFormProps {
  readonly people: readonly LifePerson[];
  readonly events: readonly LifeEvent<unknown>[];
  readonly onAddEvent: (event: LifeEvent<unknown>) => boolean;
}

const DomainEventKind = {
  ResidencePermit: "residence.permit",
  ResidenceInterruption: "residence.interruption",
  ResidenceMilestone: "residence.milestone",
  FamilyPregnancy: "family.pregnancy",
  FamilyExpectedBirth: "family.expected-birth",
  FamilyActualBirth: "family.actual-birth",
  ChildcarePlan: "childcare.plan",
  TravelTrip: "travel.trip",
  TaxClassSwitch: "tax.class-switch",
  AssetEvent: "asset.event",
} as const;
type DomainEventKind = (typeof DomainEventKind)[keyof typeof DomainEventKind];

function toDomainEventKind(value: string): DomainEventKind {
  if (!Object.values(DomainEventKind).includes(value as DomainEventKind)) {
    throw new TypeError("Invalid domain event kind.");
  }
  return value as DomainEventKind;
}

export default function LifeDomainEventForm({ people, events, onAddEvent }: LifeDomainEventFormProps): JSX.Element {
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

  // Family & pregnancy fields
  const [pregnancyId, setPregnancyId] = useState("");
  const [pregnancyLabel, setPregnancyLabel] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [childName, setChildName] = useState("");
  const [multipleCount, setMultipleCount] = useState("1");

  // Childcare & school fields
  const [facilityKind, setFacilityKind] = useState<ChildcareFacilityKind>(ChildcareFacilityKind.Kita);
  const [providerName, setProviderName] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [applicationDeadline, setApplicationDeadline] = useState("");
  const [enrollmentDeadline, setEnrollmentDeadline] = useState("");
  const [applicationStatus, setApplicationStatus] = useState<ChildcareApplicationStatus>(ChildcareApplicationStatus.Shortlisted);
  const [monthlyFeeEur, setMonthlyFeeEur] = useState("");
  const [monthlyMealEur, setMonthlyMealEur] = useState("");

  // Travel fields
  const [tripDestination, setTripDestination] = useState("");
  const [tripOriginCity, setTripOriginCity] = useState("Munich");
  const [tripRegion, setTripRegion] = useState<TravelDestinationRegion>(TravelDestinationRegion.SchengenArea);
  const [tripEndDate, setTripEndDate] = useState("");
  const [tripBudgetEur, setTripBudgetEur] = useState("");
  const [tripPassportExpiry, setTripPassportExpiry] = useState("");
  const [tripTasksText, setTripTasksText] = useState("");

  // Tax class switch fields
  const [taxCombination, setTaxCombination] = useState<TaxClassCombination>(TaxClassCombination.III_V);
  const [taxNote, setTaxNote] = useState("");

  // Asset fields (purchases, housing, car, solar)
  const [assetCategory, setAssetCategory] = useState<AssetCategory>(AssetCategory.Housing);
  const [assetAction, setAssetAction] = useState<AssetActionKind>(AssetActionKind.Purchase);
  const [assetTitle, setAssetTitle] = useState("");
  const [assetUpfrontEur, setAssetUpfrontEur] = useState("");
  const [assetOngoingEur, setAssetOngoingEur] = useState("");
  const [assetSavingsEur, setAssetSavingsEur] = useState("");
  const [assetLinkedCashId, setAssetLinkedCashId] = useState("");

  const activePersonId = personId || people[0]?.id || "";
  const personPregnancies = events
    .filter((entry) => entry.kind === pregnancyStartedModule.kind && entry.personId === activePersonId)
    .map((entry) => pregnancyStartedModule.parsePayload(entry.payload));
  const personCashEntries = events
    .filter((entry) => entry.kind === cashEventModule.kind && entry.personId === activePersonId)
    .map((entry) => ({
      id: entry.id,
      date: entry.date,
      payload: cashEventModule.parsePayload(entry.payload),
    }));

  function handleSubmit(event: JSX.TargetedEvent<HTMLFormElement, Event>): void {
    event.preventDefault();
    try {
      const targetPersonId = toPersonId(activePersonId);
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
      else if (kind === DomainEventKind.ResidenceMilestone) {
        eventKind = residenceMilestoneModule.kind;
        payload = residenceMilestoneModule.parsePayload({
          target: milestoneTarget,
          stage: milestoneStage,
          title: milestoneTitle.trim(),
        });
      }
      else if (kind === DomainEventKind.FamilyPregnancy) {
        eventKind = pregnancyStartedModule.kind;
        payload = pregnancyStartedModule.parsePayload({
          pregnancyId: crypto.randomUUID(),
          ...(dueDate ? { expectedDueDate: dueDate } : {}),
          multipleCount: Number(multipleCount),
          ...(pregnancyLabel.trim() ? { label: pregnancyLabel.trim() } : {}),
        });
      }
      else if (kind === DomainEventKind.FamilyExpectedBirth) {
        eventKind = expectedBirthModule.kind;
        payload = expectedBirthModule.parsePayload({
          pregnancyId,
          multipleCount: Number(multipleCount),
        });
      }
      else if (kind === DomainEventKind.FamilyActualBirth) {
        eventKind = actualBirthModule.kind;
        payload = actualBirthModule.parsePayload({
          pregnancyId,
          ...(childName.trim() ? { childName: childName.trim() } : {}),
          multipleCount: Number(multipleCount),
        });
      }
      else if (kind === DomainEventKind.ChildcarePlan) {
        eventKind = childcarePlanModule.kind;
        payload = childcarePlanModule.parsePayload({
          facilityKind,
          providerName: providerName.trim(),
          ...(municipality.trim() ? { municipality: municipality.trim() } : {}),
          ...(date ? { desiredStartDate: date } : {}),
          ...(applicationDeadline ? { applicationDeadline } : {}),
          ...(enrollmentDeadline ? { enrollmentDeadline } : {}),
          applicationStatus,
          ...(monthlyFeeEur.trim() ? { monthlyFeeCents: parseAmount(monthlyFeeEur, true) } : {}),
          ...(monthlyMealEur.trim() ? { monthlyMealCents: parseAmount(monthlyMealEur, true) } : {}),
        });
      }
      else if (kind === DomainEventKind.TravelTrip) {
        eventKind = travelTripModule.kind;
        const parsedTasks = tripTasksText
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
        payload = travelTripModule.parsePayload({
          destination: tripDestination.trim(),
          region: tripRegion,
          ...(tripOriginCity.trim() ? { originCity: tripOriginCity.trim() } : {}),
          ...(tripEndDate ? { endDate: tripEndDate } : {}),
          ...(tripBudgetEur.trim() ? { budgetCents: parseAmount(tripBudgetEur, true) } : {}),
          ...(tripPassportExpiry ? { passportExpiryDate: tripPassportExpiry } : {}),
          ...(parsedTasks.length > 0 ? { tasks: parsedTasks } : {}),
        });
      }
      else if (kind === DomainEventKind.TaxClassSwitch) {
        eventKind = taxClassSwitchModule.kind;
        payload = taxClassSwitchModule.parsePayload({
          combination: taxCombination,
          ...(taxNote.trim() ? { note: taxNote.trim() } : {}),
        });
      }
      else {
        eventKind = assetEventModule.kind;
        payload = assetEventModule.parsePayload({
          assetId: crypto.randomUUID(),
          category: assetCategory,
          action: assetAction,
          title: assetTitle.trim(),
          ...(assetUpfrontEur.trim() ? { upfrontCents: parseAmount(assetUpfrontEur, true) } : {}),
          ...(assetOngoingEur.trim() ? { ongoingMonthlyCents: parseAmount(assetOngoingEur, true) } : {}),
          ...(assetSavingsEur.trim() ? { monthlySavingsCents: parseAmount(assetSavingsEur, true) } : {}),
          ...(assetLinkedCashId ? { linkedCashEventId: assetLinkedCashId } : {}),
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
        setPregnancyId("");
        setPregnancyLabel("");
        setDueDate("");
        setChildName("");
        setMultipleCount("1");
        setProviderName("");
        setMunicipality("");
        setApplicationDeadline("");
        setEnrollmentDeadline("");
        setMonthlyFeeEur("");
        setMonthlyMealEur("");
        setTripDestination("");
        setTripEndDate("");
        setTripBudgetEur("");
        setTripPassportExpiry("");
        setTripTasksText("");
        setTaxNote("");
        setAssetTitle("");
        setAssetUpfrontEur("");
        setAssetOngoingEur("");
        setAssetSavingsEur("");
        setAssetLinkedCashId("");
        setDate("");
      }
    }
    catch (err) {
      setError(err instanceof Error ? err.message : "Check the event details and date.");
    }
  }

  return <section className="life-monthly" aria-label="Additional life journey events">
    <button type="button" className="ui-btn" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      {expanded ? "Hide journey event form" : "Add residence, family or other journey event"}
    </button>
    {expanded && <>
      {error && <p role="alert">{error}</p>}
      <form className="life-people__form" onSubmit={handleSubmit}>
        <label className="life-people__field">Person
          <select required value={activePersonId} onChange={(event) => {
            setPersonId(event.currentTarget.value);
            setPregnancyId("");
          }}>
            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </label>
        <label className="life-people__field">Journey event type
          <select value={kind} onChange={(event) => setKind(toDomainEventKind(event.currentTarget.value))}>
            <option value={DomainEventKind.ResidencePermit}>Residence permit / visa</option>
            <option value={DomainEventKind.ResidenceInterruption}>Residence absence / interruption</option>
            <option value={DomainEventKind.ResidenceMilestone}>Application milestone</option>
            <option value={DomainEventKind.FamilyPregnancy}>Pregnancy started</option>
            <option value={DomainEventKind.FamilyExpectedBirth}>Expected birth milestone</option>
            <option value={DomainEventKind.FamilyActualBirth}>Actual birth milestone</option>
            <option value={DomainEventKind.ChildcarePlan}>Kita, Krippe or school option</option>
            <option value={DomainEventKind.TravelTrip}>Travel trip</option>
            <option value={DomainEventKind.TaxClassSwitch}>Tax class switch</option>
            <option value={DomainEventKind.AssetEvent}>Purchase, housing, car or solar</option>
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
        {kind === DomainEventKind.FamilyPregnancy && <>
          <label className="life-people__field">Label (optional)
            <input value={pregnancyLabel} onInput={(event) => setPregnancyLabel(event.currentTarget.value)} placeholder="e.g. First baby" />
          </label>
          <label className="life-people__field">Expected due date (optional)
            <input type="date" value={dueDate} onInput={(event) => setDueDate(event.currentTarget.value)} />
          </label>
          <label className="life-people__field">Number of children (multiples)
            <input required type="number" min="1" max="6" step="1" value={multipleCount} onInput={(event) => setMultipleCount(event.currentTarget.value)} />
          </label>
        </>}
        {(kind === DomainEventKind.FamilyExpectedBirth || kind === DomainEventKind.FamilyActualBirth) && <>
          <label className="life-people__field">Linked pregnancy
            <select required value={pregnancyId} onChange={(event) => setPregnancyId(event.currentTarget.value)}>
              <option value="">Choose a recorded pregnancy</option>
              {personPregnancies.map((preg) => <option key={preg.pregnancyId} value={preg.pregnancyId}>
                {preg.label ?? "Pregnancy"}{preg.expectedDueDate ? ` (due ${preg.expectedDueDate})` : ""}
              </option>)}
            </select>
          </label>
          {kind === DomainEventKind.FamilyActualBirth && <label className="life-people__field">Child name (optional)
            <input value={childName} onInput={(event) => setChildName(event.currentTarget.value)} />
          </label>}
          <label className="life-people__field">Number of children (multiples)
            <input required type="number" min="1" max="6" step="1" value={multipleCount} onInput={(event) => setMultipleCount(event.currentTarget.value)} />
          </label>
        </>}
        {kind === DomainEventKind.ChildcarePlan && <>
          <label className="life-people__field">Facility type
            <select value={facilityKind} onChange={(event) => setFacilityKind(toChildcareFacilityKind(event.currentTarget.value))}>
              <option value={ChildcareFacilityKind.Krippe}>Krippe (0–3 yrs)</option>
              <option value={ChildcareFacilityKind.Kita}>Kita / Kindergarten (3–6 yrs)</option>
              <option value={ChildcareFacilityKind.Tagespflege}>Tagespflege</option>
              <option value={ChildcareFacilityKind.Grundschule}>Grundschule</option>
              <option value={ChildcareFacilityKind.Hort}>Hort / after-school care</option>
              <option value={ChildcareFacilityKind.SecondarySchool}>Secondary school</option>
            </select>
          </label>
          <label className="life-people__field">Provider / school name
            <input required value={providerName} onInput={(event) => setProviderName(event.currentTarget.value)} placeholder="e.g. Kita Sonnenschein" />
          </label>
          <label className="life-people__field">Municipality / district (optional)
            <input value={municipality} onInput={(event) => setMunicipality(event.currentTarget.value)} placeholder="e.g. Munich" />
          </label>
          <label className="life-people__field">Application status
            <select value={applicationStatus} onChange={(event) => setApplicationStatus(toChildcareApplicationStatus(event.currentTarget.value))}>
              <option value={ChildcareApplicationStatus.Shortlisted}>Shortlisted</option>
              <option value={ChildcareApplicationStatus.Applied}>Applied</option>
              <option value={ChildcareApplicationStatus.Waitlisted}>Waitlisted</option>
              <option value={ChildcareApplicationStatus.Offered}>Offered</option>
              <option value={ChildcareApplicationStatus.Enrolled}>Enrolled</option>
              <option value={ChildcareApplicationStatus.Declined}>Declined</option>
            </select>
          </label>
          <label className="life-people__field">Application deadline (optional)
            <input type="date" value={applicationDeadline} onInput={(event) => setApplicationDeadline(event.currentTarget.value)} />
          </label>
          <label className="life-people__field">Enrollment deadline (optional)
            <input type="date" value={enrollmentDeadline} onInput={(event) => setEnrollmentDeadline(event.currentTarget.value)} />
          </label>
          <label className="life-people__field">Monthly fee (optional, €)
            <input type="number" min="0" step="0.01" value={monthlyFeeEur} onInput={(event) => setMonthlyFeeEur(event.currentTarget.value)} />
          </label>
          <label className="life-people__field">Monthly meals (optional, €)
            <input type="number" min="0" step="0.01" value={monthlyMealEur} onInput={(event) => setMonthlyMealEur(event.currentTarget.value)} />
          </label>
        </>}
        {kind === DomainEventKind.TravelTrip && <>
          <label className="life-people__field">Destination city / country
            <input required value={tripDestination} onInput={(event) => setTripDestination(event.currentTarget.value)} placeholder="e.g. Paris or Tokyo" />
          </label>
          <label className="life-people__field">Origin city (optional, for offline distance estimate)
            <input value={tripOriginCity} onInput={(event) => setTripOriginCity(event.currentTarget.value)} placeholder="e.g. Munich" />
          </label>
          <label className="life-people__field">Destination region
            <select value={tripRegion} onChange={(event) => setTripRegion(toTravelDestinationRegion(event.currentTarget.value))}>
              <option value={TravelDestinationRegion.DomesticGermany}>Domestic Germany</option>
              <option value={TravelDestinationRegion.SchengenArea}>Schengen Area</option>
              <option value={TravelDestinationRegion.EuNonSchengen}>EU (non-Schengen)</option>
              <option value={TravelDestinationRegion.UkIreland}>UK / Ireland</option>
              <option value={TravelDestinationRegion.InternationalNonEu}>International (non-EU)</option>
            </select>
          </label>
          <label className="life-people__field">Return date (optional)
            <input type="date" value={tripEndDate} onInput={(event) => setTripEndDate(event.currentTarget.value)} />
          </label>
          <label className="life-people__field">Estimated budget (optional, €)
            <input type="number" min="0" step="0.01" value={tripBudgetEur} onInput={(event) => setTripBudgetEur(event.currentTarget.value)} />
          </label>
          <label className="life-people__field">Passport expiry date (optional)
            <input type="date" value={tripPassportExpiry} onInput={(event) => setTripPassportExpiry(event.currentTarget.value)} />
          </label>
          <label className="life-people__field">Preparation tasks (comma-separated, optional)
            <input value={tripTasksText} onInput={(event) => setTripTasksText(event.currentTarget.value)} placeholder="e.g. Book train, Check eAT, Travel insurance" />
          </label>
        </>}
        {kind === DomainEventKind.TaxClassSwitch && <>
          <label className="life-people__field">Target tax class combination
            <select value={taxCombination} onChange={(event) => setTaxCombination(toTaxClassCombination(event.currentTarget.value))}>
              <option value={TaxClassCombination.III_V}>III / V</option>
              <option value={TaxClassCombination.V_III}>V / III</option>
              <option value={TaxClassCombination.IV_IV}>IV / IV</option>
              <option value={TaxClassCombination.IV_IV_Factor}>IV / IV with factor (§ 39f EStG)</option>
            </select>
          </label>
          <label className="life-people__field">Note (optional)
            <input value={taxNote} onInput={(event) => setTaxNote(event.currentTarget.value)} placeholder="e.g. Switch effective after marriage" />
          </label>
        </>}
        {kind === DomainEventKind.AssetEvent && <>
          <label className="life-people__field">Category
            <select value={assetCategory} onChange={(event) => setAssetCategory(toAssetCategory(event.currentTarget.value))}>
              <option value={AssetCategory.Housing}>Housing / property</option>
              <option value={AssetCategory.Car}>Car / vehicle</option>
              <option value={AssetCategory.Solar}>Solar PV / battery</option>
              <option value={AssetCategory.MajorPurchase}>Major purchase</option>
            </select>
          </label>
          <label className="life-people__field">Action
            <select value={assetAction} onChange={(event) => setAssetAction(toAssetActionKind(event.currentTarget.value))}>
              <option value={AssetActionKind.Purchase}>Purchase</option>
              <option value={AssetActionKind.Installation}>Installation</option>
              <option value={AssetActionKind.OwnershipChange}>Ownership change</option>
              <option value={AssetActionKind.Sale}>Sale</option>
            </select>
          </label>
          <label className="life-people__field">Description
            <input required value={assetTitle} onInput={(event) => setAssetTitle(event.currentTarget.value)} placeholder="e.g. 10 kWp Roof PV or Apartment Munich" />
          </label>
          <label className="life-people__field">{assetAction === AssetActionKind.Sale ? "Sale proceeds (optional, €)" : "Upfront cost / down payment (optional, €)"}
            <input type="number" min="0" step="0.01" value={assetUpfrontEur} onInput={(event) => setAssetUpfrontEur(event.currentTarget.value)} />
          </label>
          <label className="life-people__field">Ongoing monthly cost (optional, €)
            <input type="number" min="0" step="0.01" value={assetOngoingEur} onInput={(event) => setAssetOngoingEur(event.currentTarget.value)} />
          </label>
          <label className="life-people__field">Monthly savings / feed-in (optional, €)
            <input type="number" min="0" step="0.01" value={assetSavingsEur} onInput={(event) => setAssetSavingsEur(event.currentTarget.value)} />
          </label>
          {personCashEntries.length > 0 && <label className="life-people__field">Link existing cash entry to avoid double-counting (optional)
            <select value={assetLinkedCashId} onChange={(event) => setAssetLinkedCashId(event.currentTarget.value)}>
              <option value="">Not linked to a timeline cash entry</option>
              {personCashEntries.map((entry) => <option key={entry.id} value={entry.id}>
                {entry.date} · {entry.payload.title}
              </option>)}
            </select>
          </label>}
        </>}
        <label className="life-people__field">{kind === DomainEventKind.ChildcarePlan ? "Desired start date" : kind === DomainEventKind.TravelTrip ? "Departure date" : "Event date"}
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
