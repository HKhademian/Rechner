import "#/components/DomainCalculator.css";
import "#/components/LifeMonthlyView.css";
import {
  type JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";


import {
  familyMilestonesStore,
} from "#/apps/family-milestones/familyMilestonesStore.ts";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";


import {
  MetricCard,
  MetricTone,
} from "#components/ui/MetricCard";
import {
  NumberField,
} from "#components/ui/NumberField";
import {
  PageHeader,
} from "#components/ui/PageHeader";
import {
  jobStartedModule,
  toLifeJobId,
} from "#engine/lifeProfile/employmentEvent";
import {
  actualBirthModule,
  expectedBirthModule,
  pregnancyStartedModule,
  toFamilyPregnancyId,
} from "#engine/lifeProfile/familyEvent";
import {
  buildParentalLeaveHandoffPreview,
} from "#engine/lifeProfile/parentalLeaveHandoff";
import {
  type LifePerson,
  PersonRelationship,
  completedYearsOn,
  toLifeDate,
  toPersonId,
  toPersonRelationship,
  upcomingBirthdays,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
  LifeEventStatus,
  toLifeEventId,
} from "#engine/lifeProfile/timeline";
import {
  SalaryPeriod,
} from "#engine/types";

function safeDate(value: string, fallback: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    try {
      return toLifeDate(value);
    }
    catch {
      return toLifeDate(fallback);
    }
  }
  return toLifeDate(fallback);
}

export default function FamilyMilestonesCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const state = hydrated ? familyMilestonesStore.state.value : familyMilestonesStore.defaultState;
  const [newName, setNewName] = useState("");
  const [newRelationship, setNewRelationship] = useState<PersonRelationship>(PersonRelationship.Child);
  const [newBirthDate, setNewBirthDate] = useState("2025-01-15");

  const asOfDate = safeDate(state.asOfDate, "2026-04-01");
  const people: LifePerson[] = state.members.map((member) => {
    const validBirth = /^\d{4}-\d{2}-\d{2}$/.test(member.birthDate)
      ? safeDate(member.birthDate, "1990-01-01")
      : undefined;
    return {
      id: toPersonId(member.id),
      name: member.name,
      relationship: member.relationship,
      ...(validBirth ? { birthDate: validBirth } : {}),
    };
  });

  const birthdays = upcomingBirthdays(people, asOfDate, 366);
  const selfPerson = people.find((person) => person.relationship === PersonRelationship.Self) ?? people[0];
  const partnerPerson = people.find((person) => person.relationship === PersonRelationship.Partner);

  const syntheticEvents: LifeEvent<unknown>[] = [];
  if (selfPerson && state.primaryAnnualGrossEur > 0) {
    syntheticEvents.push({
      id: toLifeEventId("standalone-self-job"),
      personId: selfPerson.id,
      kind: jobStartedModule.kind,
      status: LifeEventStatus.Actual,
      date: toLifeDate("2022-01-01"),
      payload: {
        jobId: toLifeJobId("primary-job"),
        employer: "Primary employer",
        gross: state.primaryAnnualGrossEur,
        grossPeriod: SalaryPeriod.Yearly,
      },
    });
  }
  if (partnerPerson && state.partnerAnnualGrossEur > 0) {
    syntheticEvents.push({
      id: toLifeEventId("standalone-partner-job"),
      personId: partnerPerson.id,
      kind: jobStartedModule.kind,
      status: LifeEventStatus.Actual,
      date: toLifeDate("2022-01-01"),
      payload: {
        jobId: toLifeJobId("partner-job"),
        employer: "Partner employer",
        gross: state.partnerAnnualGrossEur,
        grossPeriod: SalaryPeriod.Yearly,
      },
    });
  }

  if (state.hasPregnancyOrBirth && selfPerson) {
    const milestoneDate = safeDate(state.birthOrDueDate, "2026-10-15");
    const pregnancyId = toFamilyPregnancyId("standalone-pregnancy-1");
    syntheticEvents.push({
      id: toLifeEventId("standalone-preg-1"),
      personId: selfPerson.id,
      kind: pregnancyStartedModule.kind,
      status: LifeEventStatus.Actual,
      date: asOfDate,
      payload: {
        pregnancyId,
        expectedDueDate: milestoneDate,
        multipleCount: state.multipleCount,
      },
    });
    if (state.milestoneStage === "actual") {
      syntheticEvents.push({
        id: toLifeEventId("standalone-birth-1"),
        personId: selfPerson.id,
        kind: actualBirthModule.kind,
        status: LifeEventStatus.Actual,
        date: milestoneDate,
        payload: {
          pregnancyId,
          multipleCount: state.multipleCount,
          ...(state.childName.trim() ? { childName: state.childName.trim() } : {}),
        },
      });
    }
    else {
      syntheticEvents.push({
        id: toLifeEventId("standalone-expected-1"),
        personId: selfPerson.id,
        kind: expectedBirthModule.kind,
        status: LifeEventStatus.Planned,
        date: milestoneDate,
        payload: {
          pregnancyId,
          multipleCount: state.multipleCount,
        },
      });
    }
  }

  const handoff = buildParentalLeaveHandoffPreview({
    people,
    events: syntheticEvents,
    asOf: asOfDate,
    includePlanned: true,
  });

  function addMember(): void {
    const trimmed = newName.trim();
    if (!trimmed) {
      return;
    }
    familyMilestonesStore.update((s) => ({
      ...s,
      members: [
        ...s.members,
        {
          id: `member-${Date.now()}`,
          name: trimmed,
          relationship: newRelationship,
          birthDate: newBirthDate,
        },
      ],
    }));
    setNewName("");
  }

  function removeMember(id: string): void {
    familyMilestonesStore.update((s) => ({
      ...s,
      members: s.members.length > 1 ? s.members.filter((m) => m.id !== id) : s.members,
    }));
  }

  const nextBirthday = birthdays[0];

  return <>
    <main className="domain-calc-page">
      <PageHeader
        eyebrow="Family & Births · Demo"
        title="Family Milestones &amp; Parental Leave Handoff"
        subtitle="Track household members, upcoming birthdays, and pregnancy or birth milestones standalone, with a reviewable handoff preview for the Parental Leave Planner."
        actions={<button type="button" className="ui-btn ui-btn--sm" onClick={familyMilestonesStore.reset}>Reset</button>}
      />

      <section className="domain-calc-metrics" aria-label="Family milestones highlights">
        <MetricCard
          label="Household Members"
          value={`${people.length}`}
          subtitle={`${handoff.dependentChildrenCount} dependent child(ren) counted`}
        />
        <MetricCard
          label="Next Birthday"
          value={nextBirthday ? `${nextBirthday.name} (${nextBirthday.daysUntil}d)` : "None recorded"}
          tone={MetricTone.Primary}
          subtitle={nextBirthday ? `Turns ${nextBirthday.turningAge} on ${nextBirthday.nextBirthday}` : "Add birth dates below"}
        />
        <MetricCard
          label="Birth / Due Milestone"
          value={handoff.birthDate ?? "Not set"}
          tone={handoff.birthDateIsActual ? MetricTone.Gain : MetricTone.Neutral}
          subtitle={handoff.birthDateIsActual ? "Actual birth recorded" : "Planned / expected date"}
        />
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="fm-roster-heading">
        <h2 id="fm-roster-heading">Household Roster &amp; Upcoming Birthdays</h2>
        <div className="domain-calc-grid">
          <div className="ui-field">
            <label htmlFor="fm-asof" className="ui-field__label">Reference date (as of)</label>
            <input
              id="fm-asof"
              type="date"
              className="ui-input"
              value={state.asOfDate}
              onChange={(e) => familyMilestonesStore.update((s) => ({ ...s,
                asOfDate: (e.target as HTMLInputElement).value }))}
            />
          </div>
          <div className="ui-field">
            <label htmlFor="fm-new-name" className="ui-field__label">New member name</label>
            <input
              id="fm-new-name"
              type="text"
              className="ui-input"
              placeholder="e.g. Second Child"
              value={newName}
              onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
            />
          </div>
          <div className="ui-field">
            <label htmlFor="fm-new-rel" className="ui-field__label">Relationship</label>
            <select
              id="fm-new-rel"
              className="ui-input"
              value={newRelationship}
              onChange={(e) => setNewRelationship(toPersonRelationship((e.target as HTMLSelectElement).value))}
            >
              <option value={PersonRelationship.Self}>Self</option>
              <option value={PersonRelationship.Partner}>Partner</option>
              <option value={PersonRelationship.Child}>Child</option>
              <option value={PersonRelationship.Other}>Other</option>
            </select>
          </div>
          <div className="ui-field">
            <label htmlFor="fm-new-dob" className="ui-field__label">Birth date</label>
            <input
              id="fm-new-dob"
              type="date"
              className="ui-input"
              value={newBirthDate}
              onChange={(e) => setNewBirthDate((e.target as HTMLInputElement).value)}
            />
          </div>
        </div>
        <div>
          <button type="button" className="ui-btn ui-btn--sm" onClick={addMember}>Add household member</button>
        </div>

        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Relationship</th>
                <th>Birth date</th>
                <th>Age on {asOfDate}</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => {
                const age = completedYearsOn(person.birthDate, asOfDate);
                return <tr key={person.id}>
                  <th scope="row">{person.name}</th>
                  <td>{person.relationship ?? "other"}</td>
                  <td>{person.birthDate ?? "—"}</td>
                  <td>{age !== undefined ? `${age} yr` : "—"}</td>
                  <td>
                    <button type="button" className="ui-btn ui-btn--sm" onClick={() => removeMember(person.id)}>Remove</button>
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="fm-birth-heading">
        <h2 id="fm-birth-heading">Pregnancy, Birth &amp; Parental Leave Handoff Preview</h2>
        <div className="domain-calc-grid">
          <label className="ui-check">
            <input
              type="checkbox"
              checked={state.hasPregnancyOrBirth}
              onChange={(e) => familyMilestonesStore.update((s) => ({ ...s,
                hasPregnancyOrBirth: (e.target as HTMLInputElement).checked }))}
            />
            <span>Include pregnancy / birth milestone</span>
          </label>
          <div className="ui-field">
            <label htmlFor="fm-stage" className="ui-field__label">Milestone stage</label>
            <select
              id="fm-stage"
              className="ui-input"
              value={state.milestoneStage}
              onChange={(e) => familyMilestonesStore.update((s) => ({
                ...s,
                milestoneStage: (e.target as HTMLSelectElement).value === "actual" ? "actual" : "expected",
              }))}
            >
              <option value="expected">Expected due date (planned)</option>
              <option value="actual">Actual birth recorded</option>
            </select>
          </div>
          <div className="ui-field">
            <label htmlFor="fm-due" className="ui-field__label">Expected or actual birth date</label>
            <input
              id="fm-due"
              type="date"
              className="ui-input"
              value={state.birthOrDueDate}
              onChange={(e) => familyMilestonesStore.update((s) => ({ ...s,
                birthOrDueDate: (e.target as HTMLInputElement).value }))}
            />
          </div>
          <NumberField
            id="fm-multiples"
            label="Children born (Mehrlinge)"
            value={state.multipleCount}
            min={1}
            max={6}
            step={1}
            onChange={(v) => familyMilestonesStore.update((s) => ({ ...s,
              multipleCount: v }))}
          />
          <NumberField
            id="fm-gross-a"
            label="Parent A annual gross"
            value={state.primaryAnnualGrossEur}
            min={0}
            max={500000}
            step={1000}
            unit="€"
            onChange={(v) => familyMilestonesStore.update((s) => ({ ...s,
              primaryAnnualGrossEur: v }))}
          />
          <NumberField
            id="fm-gross-b"
            label="Parent B annual gross"
            value={state.partnerAnnualGrossEur}
            min={0}
            max={500000}
            step={1000}
            unit="€"
            onChange={(v) => familyMilestonesStore.update((s) => ({ ...s,
              partnerAnnualGrossEur: v }))}
          />
        </div>

        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Handoff field</th>
                <th>Value</th>
                <th>Basis</th>
              </tr>
            </thead>
            <tbody>
              {handoff.fields.map((field) => <tr key={field.id}>
                <th scope="row">{field.label}</th>
                <td>{field.value}</td>
                <td>{field.isFact ? "Recorded fact" : "Planned estimate"} ({field.source})</td>
              </tr>)}
            </tbody>
          </table>
        </div>

        <div>
          <a className="ui-btn ui-btn--primary" href={handoff.targetPath}>Open Parental Leave Planner (Elterngeld)</a>
        </div>
      </section>
    </main>
  </>;
}
